import Message from "./messageModel.js";
import User from "../user/userModel.js";
import Group from "../group/groupModel.js";
import { OnlineUsers } from "../../core/socket/webSocket.js";
import { emitToUser, emitToGroup, USER_ROOM, GROUP_ROOM, isUserOnline } from "../../core/socket/emitters.js";

const PAGE_SIZE = 30;
const EDIT_WINDOW_MS = 15 * 60 * 1000; // WhatsApp-style 15 minute edit window

const scrubMessage = (msg) => {
  if (msg.isDeletedForEveryone) {
    return {
      ...msg,
      message: "🚫 This message was deleted",
      messageType: "text",
      mediaUrl: null,
      replyTo: null,
      reactions: [],
    };
  }
  return msg;
};

const getChatSettings = (user, chatType, chatId) =>
  user.chatSettings?.find(
    (s) => s.chatType === chatType && String(s.chatId) === String(chatId),
  ) || {};

// Emit a new message to every participant room (DM or group)
const emitNewMessage = (msg, io) => {
  if (msg.groupId) {
    io.to(GROUP_ROOM(msg.groupId)).emit("newMessage", msg);
    io.to(GROUP_ROOM(msg.groupId)).emit("chat:updated", {
      chatType: "group",
      chatId: String(msg.groupId),
      lastMessage: msg,
    });
  } else {
    io.to(USER_ROOM(msg.receiverId)).emit("newMessage", msg);
    io.to(USER_ROOM(msg.senderId)).emit("newMessage", msg);
    io.to(USER_ROOM(msg.receiverId)).emit("chat:updated", {
      chatType: "dm",
      chatId: String(msg.senderId),
      lastMessage: msg,
    });
    io.to(USER_ROOM(msg.senderId)).emit("chat:updated", {
      chatType: "dm",
      chatId: String(msg.receiverId),
      lastMessage: msg,
    });
  }
};

// ───────────────────────────── Send ─────────────────────────────
export const SendMessage = async (req, res, next) => {
  try {
    const { receiverID, groupId, message, messageType, replyTo, tempClientId } =
      req.body;
    const currentUser = req.user;

    let mediaUrl = undefined;
    if (req.file) {
      mediaUrl = req.file.path;
    }

    if (!receiverID && !groupId) {
      const error = new Error("Receiver or group required");
      error.statusCode = 400;
      return next(error);
    }
    if (!message && !mediaUrl && messageType !== "system") {
      const error = new Error("Message/media required");
      error.statusCode = 400;
      return next(error);
    }
    if (message && typeof message !== "string") {
      const error = new Error("Invalid message format");
      error.statusCode = 400;
      return next(error);
    }
    if (message && message.length > 5000) {
      const error = new Error("Message is too long");
      error.statusCode = 400;
      return next(error);
    }

    // Idempotent re-send (offline queue retries)
    if (tempClientId) {
      const existing = await Message.findOne({ tempClientId, senderId: currentUser._id });
      if (existing) {
        return res.status(200).json({ message: "Already sent", data: existing });
      }
    }

    let targetGroup = null;
    let disappearingHours = 0;

    if (groupId) {
      targetGroup = await Group.findById(groupId);
      if (!targetGroup) {
        const error = new Error("Group not found");
        error.statusCode = 404;
        return next(error);
      }
      const membership = targetGroup.members.find(
        (m) => String(m.user) === String(currentUser._id),
      );
      if (!membership) {
        const error = new Error("You are not a member of this group");
        error.statusCode = 403;
        return next(error);
      }
      if (
        targetGroup.onlyAdminsCanSend &&
        membership.role !== "admin"
      ) {
        const error = new Error("Only admins can send messages in this group");
        error.statusCode = 403;
        return next(error);
      }
      const settings = getChatSettings(currentUser, "group", groupId);
      disappearingHours = settings.disappearingHours || 0;
    } else {
      // Block check (works both directions)
      const isBlocked =
        currentUser.blockedUsers?.some((id) => String(id) === String(receiverID)) ||
        (await User.exists({
          _id: receiverID,
          blockedUsers: currentUser._id,
        }));
      if (isBlocked) {
        const error = new Error("Messaging this user is blocked");
        error.statusCode = 403;
        return next(error);
      }
      const settings = getChatSettings(currentUser, "dm", receiverID);
      disappearingHours = settings.disappearingHours || 0;
    }

    const newMessage = await Message.create({
      senderId: currentUser._id,
      receiverId: groupId ? null : receiverID,
      groupId: groupId || null,
      message: message || (mediaUrl ? "Sent an attachment" : ""),
      messageType: messageType || "text",
      mediaUrl,
      replyTo: replyTo || null,
      tempClientId: tempClientId || null,
      expiresAt:
        disappearingHours > 0
          ? new Date(Date.now() + disappearingHours * 3600 * 1000)
          : null,
    });

    if (groupId) {
      targetGroup.lastMessage = newMessage._id;
      await targetGroup.save();
    }

    // Auto-deliver when the recipient currently has a socket open
    if (!groupId && isUserOnline(receiverID)) {
      newMessage.deliveredTo.push(receiverID);
      await newMessage.save();
    }

    const populated = await Message.findById(newMessage._id)
      .populate("replyTo")
      .populate("senderId", "fullName profilePic");

    const io = req.app.get("io");
    if (io) emitNewMessage(populated, io);

    res.status(201).json({ message: "Message sent successfully", data: populated });
  } catch (error) {
    console.log(error.message);
    next(error);
  }
};

// ───────────────────────── History (cursor pagination) ─────────────────────────────
const buildHistoryQuery = async (req, res, next, match) => {
  const limit = Math.min(parseInt(req.query.limit, 10) || PAGE_SIZE, 100);
  const cursor = req.query.cursor;

  let cursorCreatedAt = null;
  if (cursor) {
    const cursorMsg = await Message.findById(cursor).select("createdAt");
    if (cursorMsg) cursorCreatedAt = cursorMsg.createdAt;
  }

  const pageMatch = { ...match };
  if (cursorCreatedAt) {
    pageMatch.createdAt = { $lt: cursorCreatedAt };
  }

  const docs = await Message.find(pageMatch)
    .sort({ createdAt: -1 })
    .limit(limit + 1)
    .populate("replyTo")
    .populate("senderId", "fullName profilePic")
    .populate("reactions.user", "fullName profilePic");

  const hasMore = docs.length === limit + 1;
  const page = docs.slice(0, limit).reverse();
  const nextCursor = hasMore ? page[0]._id : null;

  res.status(200).json({
    data: page.map(scrubMessage),
    nextCursor,
    hasMore,
  });
};

export const GetMessages = async (req, res, next) => {
  try {
    const { friendId } = req.params;
    const currentUser = req.user;
    return buildHistoryQuery(req, res, next, {
      groupId: null,
      $or: [
        { senderId: currentUser._id, receiverId: friendId },
        { senderId: friendId, receiverId: currentUser._id },
      ],
      deletedBy: { $ne: currentUser._id },
    });
  } catch (error) {
    console.log(error.message);
    next(error);
  }
};

export const GetGroupMessages = async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const currentUser = req.user;

    const group = await Group.findById(groupId);
    if (!group || !group.members.some((m) => String(m.user) === String(currentUser._id))) {
      const error = new Error("Group not found or access denied");
      error.statusCode = 403;
      return next(error);
    }

    return buildHistoryQuery(req, res, next, {
      groupId,
      deletedBy: { $ne: currentUser._id },
    });
  } catch (error) {
    console.log(error.message);
    next(error);
  }
};

// ───────────────────────── Read receipts ─────────────────────────────
export const MarkMessagesAsRead = async (req, res, next) => {
  try {
    const { friendId } = req.params;
    const currentUser = req.user;

    const reader = await User.findById(currentUser._id).select("privacy.readReceipts");
    const update = {
      $set: { isRead: true },
    };
    if (reader?.privacy?.readReceipts !== false) {
      update.$addToSet = { readBy: { user: currentUser._id } };
    }

    await Message.updateMany(
      {
        senderId: friendId,
        receiverId: currentUser._id,
        groupId: null,
        isDeletedForEveryone: false,
      },
      update,
    );

    emitToUser(friendId, "message:status", {
      chatType: "dm",
      chatId: String(currentUser._id),
      userId: currentUser._id,
      status: "read",
    });

    res.status(200).json({ success: true, message: "Messages marked as read" });
  } catch (error) {
    console.log(error.message);
    next(error);
  }
};

export const MarkGroupMessagesAsRead = async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const currentUser = req.user;

    const group = await Group.findById(groupId).select("members");
    if (!group || !group.members.some((m) => String(m.user) === String(currentUser._id))) {
      const error = new Error("Group not found or access denied");
      error.statusCode = 403;
      return next(error);
    }

    await Message.updateMany(
      { groupId, "readBy.user": { $ne: currentUser._id } },
      { $addToSet: { readBy: { user: currentUser._id } } },
    );

    emitToGroup(groupId, "message:status", {
      chatType: "group",
      chatId: String(groupId),
      userId: currentUser._id,
      status: "read",
    });

    res.status(200).json({ success: true, message: "Group messages marked as read" });
  } catch (error) {
    console.log(error.message);
    next(error);
  }
};

// ───────────────────────── Delete ─────────────────────────────
export const DeleteMessage = async (req, res, next) => {
  try {
    const { messageId } = req.params;
    const { type } = req.query; // "for_me" or "for_everyone"
    const currentUser = req.user;

    const message = await Message.findById(messageId);
    if (!message) {
      const error = new Error("Message not found");
      error.statusCode = 404;
      return next(error);
    }

    if (type === "for_everyone") {
      const isGroupAdmin =
        message.groupId &&
        (await Group.exists({
          _id: message.groupId,
          members: { $elemMatch: { user: currentUser._id, role: "admin" } },
        }));
      if (
        String(message.senderId) !== String(currentUser._id) &&
        !isGroupAdmin
      ) {
        const error = new Error("Unauthorized to delete this message for everyone");
        error.statusCode = 403;
        return next(error);
      }
      message.isDeletedForEveryone = true;
      message.mediaUrl = null;
      message.reactions = [];
      await message.save();

      if (message.groupId) {
        emitToGroup(message.groupId, "messageDeleted", { messageId: message._id });
      } else {
        emitToUser(message.receiverId, "messageDeleted", { messageId: message._id });
      }
    } else {
      if (
        String(message.senderId) !== String(currentUser._id) &&
        String(message.receiverId) !== String(currentUser._id) &&
        !(await Group.exists({
          _id: message.groupId,
          "members.user": currentUser._id,
        }))
      ) {
        const error = new Error("Unauthorized to delete this message");
        error.statusCode = 403;
        return next(error);
      }
      if (!message.deletedBy.includes(currentUser._id)) {
        message.deletedBy.push(currentUser._id);
        await message.save();
      }
    }

    res.status(200).json({ success: true, message: "Message deleted" });
  } catch (error) {
    console.log(error.message);
    next(error);
  }
};

export const ClearChat = async (req, res, next) => {
  try {
    const { friendId } = req.params;
    const currentUser = req.user;

    await Message.updateMany(
      {
        groupId: null,
        $or: [
          { senderId: currentUser._id, receiverId: friendId },
          { senderId: friendId, receiverId: currentUser._id },
        ],
      },
      { $addToSet: { deletedBy: currentUser._id } },
    );

    res.status(200).json({ success: true, message: "Chat cleared" });
  } catch (error) {
    console.log(error.message);
    next(error);
  }
};

export const ClearGroupChat = async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const currentUser = req.user;

    const group = await Group.findById(groupId).select("members");
    if (!group || !group.members.some((m) => String(m.user) === String(currentUser._id))) {
      const error = new Error("Group not found or access denied");
      error.statusCode = 403;
      return next(error);
    }

    await Message.updateMany(
      { groupId },
      { $addToSet: { deletedBy: currentUser._id } },
    );
    res.status(200).json({ success: true, message: "Chat cleared" });
  } catch (error) {
    console.log(error.message);
    next(error);
  }
};

// ───────────────────────── Edit ─────────────────────────────
export const EditMessage = async (req, res, next) => {
  try {
    const { messageId } = req.params;
    const { message } = req.body;
    const currentUser = req.user;

    if (!message || !message.trim()) {
      const error = new Error("Message text required");
      error.statusCode = 400;
      return next(error);
    }

    const existing = await Message.findById(messageId);
    if (!existing) {
      const error = new Error("Message not found");
      error.statusCode = 404;
      return next(error);
    }
    if (String(existing.senderId) !== String(currentUser._id)) {
      const error = new Error("You can only edit your own messages");
      error.statusCode = 403;
      return next(error);
    }
    if (Date.now() - existing.createdAt.getTime() > EDIT_WINDOW_MS) {
      const error = new Error("Edit window (15 minutes) has expired");
      error.statusCode = 403;
      return next(error);
    }

    existing.message = message.slice(0, 5000);
    existing.isEdited = true;
    existing.editedAt = new Date();
    await existing.save();

    const updated = await Message.findById(messageId)
      .populate("replyTo")
      .populate("senderId", "fullName profilePic");

    if (existing.groupId) {
      emitToGroup(existing.groupId, "message:updated", updated);
    } else {
      emitToUser(existing.receiverId, "message:updated", updated);
      emitToUser(existing.senderId, "message:updated", updated);
    }

    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    console.log(error.message);
    next(error);
  }
};

// ───────────────────────── Reactions ─────────────────────────────
export const ReactMessage = async (req, res, next) => {
  try {
    const { messageId } = req.params;
    const { emoji } = req.body;
    const currentUser = req.user;

    if (!emoji || typeof emoji !== "string") {
      const error = new Error("Emoji required");
      error.statusCode = 400;
      return next(error);
    }

    const message = await Message.findById(messageId);
    if (!message) {
      const error = new Error("Message not found");
      error.statusCode = 404;
      return next(error);
    }

    const existingIdx = message.reactions.findIndex(
      (r) => String(r.user) === String(currentUser._id),
    );
    if (existingIdx >= 0 && message.reactions[existingIdx].emoji === emoji) {
      message.reactions.splice(existingIdx, 1); // toggle off
    } else if (existingIdx >= 0) {
      message.reactions[existingIdx].emoji = emoji; // swap emoji
      message.reactions[existingIdx].at = new Date();
    } else {
      message.reactions.push({ user: currentUser._id, emoji });
    }
    await message.save();

    const payload = {
      messageId: message._id,
      reactions: message.reactions,
    };
    if (message.groupId) emitToGroup(message.groupId, "message:reaction", payload);
    else {
      emitToUser(message.receiverId, "message:reaction", payload);
      emitToUser(message.senderId, "message:reaction", payload);
    }

    res.status(200).json({ success: true, data: payload });
  } catch (error) {
    console.log(error.message);
    next(error);
  }
};

// ───────────────────────── Star ─────────────────────────────
export const ToggleStarMessage = async (req, res, next) => {
  try {
    const { messageId } = req.params;
    const currentUser = req.user;

    const message = await Message.findById(messageId);
    if (!message) {
      const error = new Error("Message not found");
      error.statusCode = 404;
      return next(error);
    }

    const isStarred = message.starredBy.some(
      (id) => String(id) === String(currentUser._id),
    );
    if (isStarred) {
      message.starredBy = message.starredBy.filter(
        (id) => String(id) !== String(currentUser._id),
      );
    } else {
      message.starredBy.push(currentUser._id);
    }
    await message.save();

    res.status(200).json({
      success: true,
      starred: !isStarred,
      data: { messageId: message._id, starredBy: message.starredBy },
    });
  } catch (error) {
    console.log(error.message);
    next(error);
  }
};

export const GetStarredMessages = async (req, res, next) => {
  try {
    const currentUser = req.user;
    const messages = await Message.find({
      starredBy: currentUser._id,
      deletedBy: { $ne: currentUser._id },
      isDeletedForEveryone: false,
    })
      .sort({ createdAt: -1 })
      .limit(200)
      .populate("senderId", "fullName profilePic")
      .populate("replyTo");
    res.status(200).json({ data: messages });
  } catch (error) {
    console.log(error.message);
    next(error);
  }
};

// ───────────────────────── Forward ─────────────────────────────
export const ForwardMessage = async (req, res, next) => {
  try {
    const { messageId, targets } = req.body;
    const currentUser = req.user;

    if (!messageId || !Array.isArray(targets) || targets.length === 0) {
      const error = new Error("messageId and targets[] required");
      error.statusCode = 400;
      return next(error);
    }

    const original = await Message.findById(messageId);
    if (!original || original.isDeletedForEveryone) {
      const error = new Error("Message not found");
      error.statusCode = 404;
      return next(error);
    }

    const io = req.app.get("io");
    const sent = [];

    for (const target of targets.slice(0, 10)) {
      const { chatType, id } = target;
      let doc;
      if (chatType === "group") {
        const group = await Group.findById(id);
        if (!group?.members.some((m) => String(m.user) === String(currentUser._id))) {
          continue;
        }
        doc = await Message.create({
          senderId: currentUser._id,
          groupId: id,
          messageType: original.messageType,
          message: original.message,
          mediaUrl: original.mediaUrl,
          forwardedFrom: original.senderId,
        });
        group.lastMessage = doc._id;
        await group.save();
      } else {
        const blocked =
          currentUser.blockedUsers?.some((uid) => String(uid) === String(id)) ||
          (await User.exists({ _id: id, blockedUsers: currentUser._id }));
        if (blocked) continue;
        doc = await Message.create({
          senderId: currentUser._id,
          receiverId: id,
          messageType: original.messageType,
          message: original.message,
          mediaUrl: original.mediaUrl,
          forwardedFrom: original.senderId,
        });
      }

      const populated = await Message.findById(doc._id)
        .populate("senderId", "fullName profilePic");
      if (io) emitNewMessage(populated, io);
      sent.push(populated);
    }

    res.status(201).json({ success: true, data: sent });
  } catch (error) {
    console.log(error.message);
    next(error);
  }
};

// ───────────────────────── Unified chat list (WhatsApp home) ─────────────────────────────
export const GetChatList = async (req, res, next) => {
  try {
    const me = req.user._id;

    const groups = await Group.find({ "members.user": me })
      .populate("members.user", "fullName profilePic about")
      .sort({ updatedAt: -1 });

    // DM partners: anyone we have exchanged messages with, plus all friends
    const dmAgg = await Message.aggregate([
      {
        $match: {
          groupId: null,
          $or: [{ senderId: me }, { receiverId: me }],
        },
      },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: {
            $cond: [{ $eq: ["$senderId", me] }, "$receiverId", "$senderId"],
          },
          lastMessageAt: { $first: "$createdAt" },
        },
      },
    ]);

    const partnerIds = [
      ...new Set([
        ...dmAgg.map((d) => String(d._id)),
        ...(req.user.friends || []).map((id) => String(id)),
      ]),
    ];

    const partners = await User.find({ _id: { $in: partnerIds } }).select(
      "-password -resetPasswordOTP -resetPasswordExpires",
    );

    // Last message per DM
    const lastDm = await Message.aggregate([
      {
        $match: {
          groupId: null,
          $or: [{ senderId: me }, { receiverId: me }],
          deletedBy: { $ne: me },
        },
      },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: {
            $cond: [{ $eq: ["$senderId", me] }, "$receiverId", "$senderId"],
          },
          doc: { $first: "$$ROOT" },
        },
      },
    ]);
    const lastDmMap = new Map(lastDm.map((r) => [String(r._id), r.doc]));

    // Unread DM counts
    const unreadDm = await Message.aggregate([
      { $match: { receiverId: me, isRead: false, groupId: null, deletedBy: { $ne: me } } },
      { $group: { _id: "$senderId", count: { $sum: 1 } } },
    ]);
    const unreadDmMap = new Map(unreadDm.map((r) => [String(r._id), r.count]));

    // Group last messages + unread
    const groupIds = groups.map((g) => g._id);
    const lastGroup = groupIds.length
      ? await Message.aggregate([
          { $match: { groupId: { $in: groupIds }, deletedBy: { $ne: me } } },
          { $sort: { createdAt: -1 } },
          { $group: { _id: "$groupId", doc: { $first: "$$ROOT" } } },
        ])
      : [];
    const lastGroupMap = new Map(lastGroup.map((r) => [String(r._id), r.doc]));

    const unreadGroup = groupIds.length
      ? await Message.aggregate([
          {
            $match: {
              groupId: { $in: groupIds },
              senderId: { $ne: me },
              "readBy.user": { $ne: me },
              deletedBy: { $ne: me },
              isDeletedForEveryone: false,
            },
          },
          { $group: { _id: "$groupId", count: { $sum: 1 } } },
        ])
      : [];
    const unreadGroupMap = new Map(unreadGroup.map((r) => [String(r._id), r.count]));

    const canSee = (target, field) => {
      const level = target.privacy?.[field] || "everyone";
      if (level === "everyone") return true;
      if (level === "nobody") return false;
      return (target.friends || []).some((id) => String(id) === String(me));
    };

    const settingsOf = (chatType, chatId) => {
      const s = (req.user.chatSettings || []).find(
        (c) => c.chatType === chatType && String(c.chatId) === String(chatId),
      );
      return {
        pinned: s?.pinned || false,
        archived: s?.archived || false,
        mutedUntil: s?.mutedUntil || null,
        disappearingHours: s?.disappearingHours || 0,
      };
    };

    const dmEntries = partners.map((p) => {
      const id = String(p._id);
      const last = lastDmMap.get(id);
      return {
        chatType: "dm",
        _id: p._id,
        name: p.fullName || p.email,
        email: p.email,
        avatar: canSee(p, "profilePhoto") ? p.profilePic : "",
        about: canSee(p, "about") ? p.about : "",
        lastSeen:
          canSee(p, "lastSeen") && !OnlineUsers[p._id] ? p.lastSeen : null,
        isOnline: Boolean(OnlineUsers[p._id]),
        lastMessage: last ? scrubMessage(last) : null,
        lastMessageAt: last?.createdAt || null,
        unreadCount: unreadDmMap.get(id) || 0,
        settings: settingsOf("dm", p._id),
        blocked: (req.user.blockedUsers || []).some(
          (uid) => String(uid) === id,
        ),
      };
    });

    const groupEntries = groups.map((g) => ({
      chatType: "group",
      _id: g._id,
      name: g.name,
      avatar: g.avatar,
      description: g.description,
      members: g.members,
      memberCount: g.members.length,
      onlyAdminsCanSend: g.onlyAdminsCanSend,
      createdBy: g.createdBy,
      lastMessage: lastGroupMap.get(String(g._id))
        ? scrubMessage(lastGroupMap.get(String(g._id)))
        : null,
      lastMessageAt:
        lastGroupMap.get(String(g._id))?.createdAt || g.createdAt,
      unreadCount: unreadGroupMap.get(String(g._id)) || 0,
      settings: settingsOf("group", g._id),
    }));

    const all = [...dmEntries, ...groupEntries];
    all.sort((a, b) => {
      if (a.settings.pinned !== b.settings.pinned) {
        return a.settings.pinned ? -1 : 1;
      }
      const ta = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
      const tb = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
      return tb - ta;
    });

    res.status(200).json({ data: all });
  } catch (error) {
    console.log(error.message);
    next(error);
  }
};
