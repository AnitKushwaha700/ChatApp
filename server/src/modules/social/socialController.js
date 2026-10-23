import User from "../user/userModel.js";
import { emitToUser } from "../../core/socket/emitters.js";

// ───────────────────────── Friend requests ─────────────────────────
export const SendFriendRequest = async (req, res, next) => {
  try {
    const { toId } = req.params;
    const me = req.user;

    if (String(toId) === String(me._id)) {
      const error = new Error("You cannot add yourself");
      error.statusCode = 400;
      return next(error);
    }

    const target = await User.findById(toId);
    if (!target) {
      const error = new Error("User not found");
      error.statusCode = 404;
      return next(error);
    }

    if (me.friends.some((id) => String(id) === String(toId))) {
      const error = new Error("Already friends");
      error.statusCode = 400;
      return next(error);
    }
    if (me.sentRequests.some((id) => String(id) === String(toId))) {
      const error = new Error("Friend request already sent");
      error.statusCode = 400;
      return next(error);
    }
    if (target.blockedUsers?.some((id) => String(id) === String(me._id))) {
      const error = new Error("Action not allowed");
      error.statusCode = 403;
      return next(error);
    }

    // If they already sent me a request, accept directly
    if (me.pendingRequests.some((id) => String(id) === String(toId))) {
      me.pendingRequests = me.pendingRequests.filter(
        (id) => String(id) !== String(toId),
      );
      target.sentRequests = target.sentRequests.filter(
        (id) => String(id) !== String(me._id),
      );
      me.friends.push(target._id);
      target.friends.push(me._id);
      await me.save();
      await target.save();

      emitToUser(target._id, "friend:accept", {
        user: { _id: me._id, fullName: me.fullName, profilePic: me.profilePic },
      });
      return res.status(200).json({ success: true, message: "You are now friends" });
    }

    me.sentRequests.push(target._id);
    target.pendingRequests.push(me._id);
    await me.save();
    await target.save();

    emitToUser(target._id, "friend:request", {
      user: { _id: me._id, fullName: me.fullName, profilePic: me.profilePic },
    });

    res.status(201).json({ success: true, message: "Friend request sent" });
  } catch (error) {
    next(error);
  }
};

export const AcceptFriendRequest = async (req, res, next) => {
  try {
    const { id } = req.params;
    const me = req.user;

    if (!me.pendingRequests.some((uid) => String(uid) === String(id))) {
      const error = new Error("No pending request from this user");
      error.statusCode = 404;
      return next(error);
    }

    const other = await User.findById(id);
    if (!other) {
      const error = new Error("User not found");
      error.statusCode = 404;
      return next(error);
    }

    me.pendingRequests = me.pendingRequests.filter(
      (uid) => String(uid) !== String(id),
    );
    other.sentRequests = other.sentRequests.filter(
      (uid) => String(uid) !== String(me._id),
    );
    if (!me.friends.some((uid) => String(uid) === String(id))) me.friends.push(other._id);
    if (!other.friends.some((uid) => String(uid) === String(me._id))) {
      other.friends.push(me._id);
    }
    await me.save();
    await other.save();

    emitToUser(other._id, "friend:accept", {
      user: { _id: me._id, fullName: me.fullName, profilePic: me.profilePic },
    });

    res.status(200).json({ success: true, message: "Friend request accepted" });
  } catch (error) {
    next(error);
  }
};

export const DeclineFriendRequest = async (req, res, next) => {
  try {
    const { id } = req.params;
    const me = req.user;
    const other = await User.findById(id);

    me.pendingRequests = me.pendingRequests.filter(
      (uid) => String(uid) !== String(id),
    );
    await me.save();
    if (other) {
      other.sentRequests = other.sentRequests.filter(
        (uid) => String(uid) !== String(me._id),
      );
      await other.save();
    }

    res.status(200).json({ success: true, message: "Friend request declined" });
  } catch (error) {
    next(error);
  }
};

export const GetFriendRequests = async (req, res, next) => {
  try {
    const me = await User.findById(req.user._id)
      .populate("pendingRequests", "fullName email profilePic about")
      .populate("sentRequests", "fullName email profilePic about");
    res.status(200).json({
      data: {
        received: me.pendingRequests,
        sent: me.sentRequests,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const GetFriends = async (req, res, next) => {
  try {
    const me = await User.findById(req.user._id).populate(
      "friends",
      "fullName email profilePic about lastSeen",
    );
    res.status(200).json({ data: me.friends });
  } catch (error) {
    next(error);
  }
};

export const RemoveFriend = async (req, res, next) => {
  try {
    const { id } = req.params;
    const me = req.user;
    const other = await User.findById(id);

    me.friends = me.friends.filter((uid) => String(uid) !== String(id));
    me.sentRequests = me.sentRequests.filter((uid) => String(uid) !== String(id));
    me.pendingRequests = me.pendingRequests.filter(
      (uid) => String(uid) !== String(id),
    );
    await me.save();

    if (other) {
      other.friends = other.friends.filter((uid) => String(uid) !== String(me._id));
      other.sentRequests = other.sentRequests.filter(
        (uid) => String(uid) !== String(me._id),
      );
      other.pendingRequests = other.pendingRequests.filter(
        (uid) => String(uid) !== String(me._id),
      );
      await other.save();
    }

    res.status(200).json({ success: true, message: "Friend removed" });
  } catch (error) {
    next(error);
  }
};

// ───────────────────────── Blocking ─────────────────────────
export const BlockUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const me = req.user;

    if (String(id) === String(me._id)) {
      const error = new Error("You cannot block yourself");
      error.statusCode = 400;
      return next(error);
    }

    if (!me.blockedUsers.some((uid) => String(uid) === String(id))) {
      me.blockedUsers.push(id);
    }
    // Also unwind any friend/request relationships
    me.friends = me.friends.filter((uid) => String(uid) !== String(id));
    me.sentRequests = me.sentRequests.filter((uid) => String(uid) !== String(id));
    me.pendingRequests = me.pendingRequests.filter(
      (uid) => String(uid) !== String(id),
    );
    await me.save();

    res.status(200).json({ success: true, message: "User blocked" });
  } catch (error) {
    next(error);
  }
};

export const UnblockUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const me = req.user;
    me.blockedUsers = me.blockedUsers.filter((uid) => String(uid) !== String(id));
    await me.save();
    res.status(200).json({ success: true, message: "User unblocked" });
  } catch (error) {
    next(error);
  }
};

export const GetBlocked = async (req, res, next) => {
  try {
    const me = await User.findById(req.user._id).populate(
      "blockedUsers",
      "fullName email profilePic about",
    );
    res.status(200).json({ data: me.blockedUsers });
  } catch (error) {
    next(error);
  }
};

// ───────────────────────── Privacy & profile extras ─────────────────────────
export const UpdatePrivacy = async (req, res, next) => {
  try {
    const { lastSeen, profilePhoto, about, readReceipts } = req.body;
    const me = await User.findById(req.user._id);

    const levels = ["everyone", "friends", "nobody"];
    if (lastSeen && levels.includes(lastSeen)) me.privacy.lastSeen = lastSeen;
    if (profilePhoto && levels.includes(profilePhoto)) me.privacy.profilePhoto = profilePhoto;
    if (about && levels.includes(about)) me.privacy.about = about;
    if (typeof readReceipts === "boolean") me.privacy.readReceipts = readReceipts;

    await me.save();
    res.status(200).json({ success: true, data: me.privacy });
  } catch (error) {
    next(error);
  }
};

export const UpdateAbout = async (req, res, next) => {
  try {
    const { about } = req.body;
    if (typeof about !== "string" || about.length > 139) {
      const error = new Error("About must be 139 characters or fewer");
      error.statusCode = 400;
      return next(error);
    }
    const me = await User.findByIdAndUpdate(
      req.user._id,
      { about },
      { new: true },
    ).select("-password");
    res.status(200).json({ success: true, data: me });
  } catch (error) {
    next(error);
  }
};

// Privacy-aware public profile of another user
export const GetUserProfile = async (req, res, next) => {
  try {
    const { id } = req.params;
    const me = req.user;
    const target = await User.findById(id).select(
      "fullName profilePic about lastSeen privacy friends mobileNumber email",
    );
    if (!target) {
      const error = new Error("User not found");
      error.statusCode = 404;
      return next(error);
    }

    const isFriend = target.friends.some((uid) => String(uid) === String(me._id));
    const canSee = (field) => {
      const level = target.privacy?.[field] || "everyone";
      if (level === "everyone") return true;
      if (level === "nobody") return false;
      return isFriend;
    };

    res.status(200).json({
      data: {
        _id: target._id,
        fullName: target.fullName,
        profilePic: canSee("profilePhoto") ? target.profilePic : "",
        about: canSee("about") ? target.about : "",
        lastSeen: canSee("lastSeen") ? target.lastSeen : null,
        isFriend,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ───────────────────────── Per-chat settings (pin / archive / mute / disappearing) ─────────────────────────
export const UpdateChatSettings = async (req, res, next) => {
  try {
    const { chatType, chatId } = req.params;
    const { pinned, archived, mutedUntil, disappearingHours } = req.body;

    if (!["dm", "group"].includes(chatType)) {
      const error = new Error("Invalid chat type");
      error.statusCode = 400;
      return next(error);
    }

    const me = await User.findById(req.user._id);
    let settings = me.chatSettings.find(
      (s) => s.chatType === chatType && String(s.chatId) === String(chatId),
    );
    if (!settings) {
      me.chatSettings.push({ chatType, chatId });
      settings = me.chatSettings[me.chatSettings.length - 1];
    }

    if (typeof pinned === "boolean") settings.pinned = pinned;
    if (typeof archived === "boolean") settings.archived = archived;
    if (mutedUntil !== undefined) {
      settings.mutedUntil = mutedUntil ? new Date(mutedUntil) : null;
    }
    if (
      disappearingHours !== undefined &&
      [0, 24, 168, 720].includes(Number(disappearingHours))
    ) {
      settings.disappearingHours = Number(disappearingHours);
    }

    await me.save();
    res.status(200).json({ success: true, data: settings });
  } catch (error) {
    next(error);
  }
};
