import Chat from "./chatModel.js";
import Message from "./messageModel.js";
import User from "../user/userModel.js";
import { OnlineUsers, getIo } from "../../core/socket/webSocket.js";

// 1. Access or create 1-to-1 Chat
export const accessOrCreateChat = async (req, res, next) => {
  try {
    const { userId } = req.body;
    const currentUserId = req.user._id;

    if (!userId) {
      const error = new Error("UserId param not sent with request");
      error.statusCode = 400;
      return next(error);
    }

    let isChat = await Chat.find({
      isGroupChat: false,
      $and: [
        { users: { $elemMatch: { $eq: currentUserId } } },
        { users: { $elemMatch: { $eq: userId } } },
      ],
    })
      .populate("users", "-password")
      .populate({
        path: "latestMessage",
        populate: { path: "senderId", select: "fullName profilePic email" },
      });

    if (isChat.length > 0) {
      return res.status(200).json({ success: true, data: isChat[0] });
    }

    const chatData = {
      chatName: "sender",
      isGroupChat: false,
      users: [currentUserId, userId],
    };

    const createdChat = await Chat.create(chatData);
    const fullChat = await Chat.findById(createdChat._id).populate(
      "users",
      "-password"
    );

    res.status(201).json({ success: true, data: fullChat });
  } catch (error) {
    next(error);
  }
};

// 2. Fetch all chats for current user (1-to-1 and Groups)
export const fetchUserChats = async (req, res, next) => {
  try {
    const currentUserId = req.user._id;
    const { archived } = req.query;

    const filter = {
      users: { $elemMatch: { $eq: currentUserId } },
    };

    if (archived === "true") {
      filter.archivedBy = { $elemMatch: { $eq: currentUserId } };
    } else {
      filter.archivedBy = { $ne: currentUserId };
    }

    let chats = await Chat.find(filter)
      .populate("users", "-password")
      .populate("groupAdmins", "-password")
      .populate({
        path: "latestMessage",
        populate: { path: "senderId", select: "fullName profilePic email" },
      })
      .sort({ updatedAt: -1 });

    // Also get unread counts per chat
    const unreadAggregate = await Message.aggregate([
      {
        $match: {
          receiverId: currentUserId,
          isRead: false,
        },
      },
      {
        $group: {
          _id: "$senderId",
          count: { $sum: 1 },
        },
      },
    ]);

    const unreadMap = {};
    unreadAggregate.forEach((item) => {
      unreadMap[item._id.toString()] = item.count;
    });

    const result = chats.map((chat) => {
      const chatObj = chat.toObject();
      const otherUser = chatObj.users.find(
        (u) => u._id.toString() !== currentUserId.toString()
      );
      if (!chatObj.isGroupChat && otherUser) {
        chatObj.unreadCount = unreadMap[otherUser._id.toString()] || 0;
      } else {
        chatObj.unreadCount = 0;
      }
      chatObj.isPinned = chatObj.pinnedBy?.some(
        (id) => id.toString() === currentUserId.toString()
      );
      chatObj.isArchived = chatObj.archivedBy?.some(
        (id) => id.toString() === currentUserId.toString()
      );
      chatObj.isMuted = chatObj.mutedBy?.some(
        (m) => m.user?.toString() === currentUserId.toString()
      );
      return chatObj;
    });

    // Sort pinned to the top
    result.sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0));

    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

// 3. Create Group Chat
export const createGroupChat = async (req, res, next) => {
  try {
    let { name, users, description } = req.body;
    const currentUserId = req.user._id;

    if (!name || !users) {
      const error = new Error("Group name and members are required");
      error.statusCode = 400;
      return next(error);
    }

    if (typeof users === "string") {
      try {
        users = JSON.parse(users);
      } catch {
        users = users.split(",").map((s) => s.trim());
      }
    }

    if (users.length < 2) {
      const error = new Error(
        "More than 2 users are required to form a group chat"
      );
      error.statusCode = 400;
      return next(error);
    }

    // Add current user to users list if not present
    if (!users.includes(currentUserId.toString())) {
      users.push(currentUserId);
    }

    let groupIcon = "";
    if (req.file) {
      groupIcon = req.file.path;
    }

    const groupChat = await Chat.create({
      chatName: name,
      groupIcon,
      groupDescription: description || "",
      users,
      isGroupChat: true,
      groupAdmins: [currentUserId],
    });

    const fullGroupChat = await Chat.findById(groupChat._id)
      .populate("users", "-password")
      .populate("groupAdmins", "-password");

    // Broadcast new group to all member sockets
    const io = getIo();
    if (io) {
      users.forEach((userId) => {
        const socketId = OnlineUsers[userId.toString()];
        if (socketId) {
          io.to(socketId).emit("newGroupCreated", fullGroupChat);
        }
      });
    }

    res.status(201).json({ success: true, data: fullGroupChat });
  } catch (error) {
    next(error);
  }
};

// 4. Rename Group
export const renameGroup = async (req, res, next) => {
  try {
    const { chatId } = req.params;
    const { name } = req.body;

    if (!name || !name.trim()) {
      const error = new Error("New group name is required");
      error.statusCode = 400;
      return next(error);
    }

    const updatedChat = await Chat.findByIdAndUpdate(
      chatId,
      { chatName: name.trim() },
      { new: true }
    )
      .populate("users", "-password")
      .populate("groupAdmins", "-password");

    if (!updatedChat) {
      const error = new Error("Chat not found");
      error.statusCode = 404;
      return next(error);
    }

    const io = getIo();
    if (io) {
      updatedChat.users.forEach((u) => {
        const socketId = OnlineUsers[u._id.toString()];
        if (socketId) {
          io.to(socketId).emit("groupUpdated", updatedChat);
        }
      });
    }

    res.status(200).json({ success: true, data: updatedChat });
  } catch (error) {
    next(error);
  }
};

// 5. Add members to Group
export const addToGroup = async (req, res, next) => {
  try {
    const { chatId } = req.params;
    let { userIds } = req.body;
    const currentUserId = req.user._id;

    if (!userIds) {
      const error = new Error("User IDs to add are required");
      error.statusCode = 400;
      return next(error);
    }

    if (!Array.isArray(userIds)) {
      userIds = [userIds];
    }

    const chat = await Chat.findById(chatId);
    if (!chat) {
      const error = new Error("Chat not found");
      error.statusCode = 404;
      return next(error);
    }

    // Verify admin privileges
    const isAdmin = chat.groupAdmins.some(
      (adminId) => adminId.toString() === currentUserId.toString()
    );
    if (!isAdmin) {
      const error = new Error("Only group admins can add members");
      error.statusCode = 403;
      return next(error);
    }

    const updatedChat = await Chat.findByIdAndUpdate(
      chatId,
      { $addToSet: { users: { $each: userIds } } },
      { new: true }
    )
      .populate("users", "-password")
      .populate("groupAdmins", "-password");

    const io = getIo();
    if (io) {
      updatedChat.users.forEach((u) => {
        const socketId = OnlineUsers[u._id.toString()];
        if (socketId) {
          io.to(socketId).emit("groupUpdated", updatedChat);
        }
      });
    }

    res.status(200).json({ success: true, data: updatedChat });
  } catch (error) {
    next(error);
  }
};

// 6. Remove member from Group or Leave Group
export const removeFromGroup = async (req, res, next) => {
  try {
    const { chatId } = req.params;
    const { userId } = req.body;
    const currentUserId = req.user._id;

    const chat = await Chat.findById(chatId);
    if (!chat) {
      const error = new Error("Chat not found");
      error.statusCode = 404;
      return next(error);
    }

    const isSelf = userId === currentUserId.toString();
    const isAdmin = chat.groupAdmins.some(
      (adminId) => adminId.toString() === currentUserId.toString()
    );

    if (!isSelf && !isAdmin) {
      const error = new Error("Only admins can remove members");
      error.statusCode = 403;
      return next(error);
    }

    const updatedChat = await Chat.findByIdAndUpdate(
      chatId,
      {
        $pull: {
          users: userId,
          groupAdmins: userId,
        },
      },
      { new: true }
    )
      .populate("users", "-password")
      .populate("groupAdmins", "-password");

    const io = getIo();
    if (io) {
      chat.users.forEach((u) => {
        const socketId = OnlineUsers[u._id ? u._id.toString() : u.toString()];
        if (socketId) {
          io.to(socketId).emit("groupUpdated", updatedChat);
        }
      });
    }

    res.status(200).json({ success: true, data: updatedChat });
  } catch (error) {
    next(error);
  }
};

// 7. Toggle Pin Chat
export const togglePinChat = async (req, res, next) => {
  try {
    const { chatId } = req.params;
    const currentUserId = req.user._id;

    const chat = await Chat.findById(chatId);
    if (!chat) {
      const error = new Error("Chat not found");
      error.statusCode = 404;
      return next(error);
    }

    const isPinned = chat.pinnedBy.some(
      (id) => id.toString() === currentUserId.toString()
    );

    const update = isPinned
      ? { $pull: { pinnedBy: currentUserId } }
      : { $addToSet: { pinnedBy: currentUserId } };

    const updated = await Chat.findByIdAndUpdate(chatId, update, { new: true });
    res.status(200).json({ success: true, isPinned: !isPinned, data: updated });
  } catch (error) {
    next(error);
  }
};

// 8. Toggle Archive Chat
export const toggleArchiveChat = async (req, res, next) => {
  try {
    const { chatId } = req.params;
    const currentUserId = req.user._id;

    const chat = await Chat.findById(chatId);
    if (!chat) {
      const error = new Error("Chat not found");
      error.statusCode = 404;
      return next(error);
    }

    const isArchived = chat.archivedBy.some(
      (id) => id.toString() === currentUserId.toString()
    );

    const update = isArchived
      ? { $pull: { archivedBy: currentUserId } }
      : { $addToSet: { archivedBy: currentUserId } };

    const updated = await Chat.findByIdAndUpdate(chatId, update, { new: true });
    res
      .status(200)
      .json({ success: true, isArchived: !isArchived, data: updated });
  } catch (error) {
    next(error);
  }
};

// 9. Toggle Mute Chat
export const toggleMuteChat = async (req, res, next) => {
  try {
    const { chatId } = req.params;
    const { durationHours } = req.body; // e.g. 8, 168 (1w), null (indefinitely)
    const currentUserId = req.user._id;

    const chat = await Chat.findById(chatId);
    if (!chat) {
      const error = new Error("Chat not found");
      error.statusCode = 404;
      return next(error);
    }

    const isMuted = chat.mutedBy.some(
      (m) => m.user.toString() === currentUserId.toString()
    );

    let updated;
    if (isMuted) {
      updated = await Chat.findByIdAndUpdate(
        chatId,
        { $pull: { mutedBy: { user: currentUserId } } },
        { new: true }
      );
      return res.status(200).json({ success: true, isMuted: false, data: updated });
    } else {
      const mutedUntil = durationHours
        ? new Date(Date.now() + durationHours * 3600 * 1000)
        : null;
      updated = await Chat.findByIdAndUpdate(
        chatId,
        { $push: { mutedBy: { user: currentUserId, mutedUntil } } },
        { new: true }
      );
      return res.status(200).json({ success: true, isMuted: true, data: updated });
    }
  } catch (error) {
    next(error);
  }
};

// 10. Toggle Star Message
export const toggleStarMessage = async (req, res, next) => {
  try {
    const { messageId } = req.params;
    const currentUserId = req.user._id;

    const message = await Message.findById(messageId);
    if (!message) {
      const error = new Error("Message not found");
      error.statusCode = 404;
      return next(error);
    }

    const isStarred = message.isStarredBy.some(
      (id) => id.toString() === currentUserId.toString()
    );

    const update = isStarred
      ? { $pull: { isStarredBy: currentUserId } }
      : { $addToSet: { isStarredBy: currentUserId } };

    const updated = await Message.findByIdAndUpdate(messageId, update, {
      new: true,
    });
    res
      .status(200)
      .json({ success: true, isStarred: !isStarred, data: updated });
  } catch (error) {
    next(error);
  }
};

// 11. Fetch Starred Messages
export const getStarredMessages = async (req, res, next) => {
  try {
    const currentUserId = req.user._id;

    const messages = await Message.find({
      isStarredBy: currentUserId,
      deletedBy: { $ne: currentUserId },
    })
      .populate("senderId", "fullName profilePic email")
      .populate("chat")
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: messages });
  } catch (error) {
    next(error);
  }
};
