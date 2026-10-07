import User from "./userModel.js";
import Message from "../chat/messageModel.js";
import { OnlineUsers, getIo } from "../../core/socket/webSocket.js";

export const getAllUsers = async (req, res, next) => {
  try {
    const currentUser = req.user;
    const { search } = req.query;

    const query = { _id: { $ne: currentUser._id } };

    if (search && typeof search === "string") {
      // Escape regex special characters to prevent regex injection DOS
      const safeSearch = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      query.$or = [
        { fullName: { $regex: safeSearch, $options: "i" } },
        { email: { $regex: safeSearch, $options: "i" } },
        { mobileNumber: { $regex: safeSearch, $options: "i" } },
      ];
    }

    const users = await User.find(query).select("-password").limit(50);

    // Get unread message counts
    const unreadCounts = await Message.aggregate([
      { $match: { receiverId: currentUser._id, isRead: false } },
      { $group: { _id: "$senderId", count: { $sum: 1 } } }
    ]);

    const unreadMap = {};
    unreadCounts.forEach((item) => {
      unreadMap[item._id.toString()] = item.count;
    });

    const usersWithUnreadCount = users.map((u) => {
      const userObj = u.toObject();
      userObj.unreadCount = unreadMap[userObj._id.toString()] || 0;
      return userObj;
    });

    res.status(200).json({ data: usersWithUnreadCount });
  } catch (error) {
    next(error);
  }
};

export const updateProfile = async (req, res, next) => {
  try {
    const currentUser = req.user;

    const { fullName, email, mobileNumber } = req.body;

    if (
      (fullName !== undefined && typeof fullName !== "string") ||
      (email !== undefined && typeof email !== "string") ||
      (mobileNumber !== undefined && typeof mobileNumber !== "string")
    ) {
      const error = new Error("Invalid input formats");
      error.statusCode = 400;
      return next(error);
    }

    let profilePicUrl = undefined;

    if (req.file) {
      profilePicUrl = req.file.path;
    }

    if (email) {
      const existingUser = await User.findOne({
        email,
        _id: { $ne: currentUser._id },
      });
      if (existingUser) {
        const error = new Error("Email already in use");
        error.statusCode = 400;
        return next(error);
      }
    }

    const updatedUser = await User.findByIdAndUpdate(
      currentUser._id,
      {
        ...(fullName && { fullName }),
        ...(email && { email }),
        ...(mobileNumber !== undefined && { mobileNumber }),
        ...(profilePicUrl && { profilePic: profilePicUrl }),
      },
      { new: true },
    ).select("-password");

    res.status(200).json({
      message: "Profile updated successfully",
      data: updatedUser,
    });
  } catch (error) {
    next(error);
  }
};

export const getConversations = async (req, res, next) => {
  try {
    const currentUser = req.user;

    // Use aggregation to find distinct users we've chatted with efficiently (fixes OOM risk)
    const conversations = await Message.aggregate([
      {
        $match: {
          $or: [{ senderId: currentUser._id }, { receiverId: currentUser._id }],
        },
      },
      {
        $sort: { createdAt: -1 },
      },
      {
        $group: {
          _id: {
            $cond: [
              { $eq: ["$senderId", currentUser._id] },
              "$receiverId",
              "$senderId",
            ],
          },
          lastMessageAt: { $first: "$createdAt" },
        },
      },
      {
        $sort: { lastMessageAt: -1 },
      },
    ]);

    const userIds = conversations.map((c) => c._id);

    // Fetch the actual user documents
    const users = await User.find({ _id: { $in: userIds } }).select("-password");

    // Preserve the sorted order from the aggregation
    const sortedUsers = userIds.map(id => users.find(u => u._id.toString() === id.toString())).filter(Boolean);

    res.status(200).json({ data: sortedUsers });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select("-password");
    res.status(200).json({ data: user });
  } catch (error) {
    next(error);
  }
};

export const sendRequest = async (req, res, next) => {
  try {
    const { friendId } = req.params;
    const currentUser = req.user;

    if (friendId === currentUser._id.toString()) {
      return res.status(400).json({ message: "Cannot send request to yourself" });
    }

    await User.findByIdAndUpdate(currentUser._id, {
      $addToSet: { sentRequests: friendId }
    });

    await User.findByIdAndUpdate(friendId, {
      $addToSet: { pendingRequests: currentUser._id }
    });

    const updatedUser = await User.findById(currentUser._id).select("-password");
    res.status(200).json({ message: "Request sent", data: updatedUser });
  } catch (error) {
    next(error);
  }
};

export const acceptRequest = async (req, res, next) => {
  try {
    const { friendId } = req.params;
    const currentUser = req.user;

    // Remove from requests, add to friends for current user
    await User.findByIdAndUpdate(currentUser._id, {
      $pull: { pendingRequests: friendId },
      $addToSet: { friends: friendId }
    });

    // Remove from requests, add to friends for friend
    await User.findByIdAndUpdate(friendId, {
      $pull: { sentRequests: currentUser._id },
      $addToSet: { friends: currentUser._id }
    });

    const updatedUser = await User.findById(currentUser._id).select("-password");
    res.status(200).json({ message: "Request accepted", data: updatedUser });
  } catch (error) {
    next(error);
  }
};

export const declineRequest = async (req, res, next) => {
  try {
    const { friendId } = req.params;
    const currentUser = req.user;

    // Remove from pending for current
    await User.findByIdAndUpdate(currentUser._id, {
      $pull: { pendingRequests: friendId }
    });

    // Remove from sent for friend
    await User.findByIdAndUpdate(friendId, {
      $pull: { sentRequests: currentUser._id }
    });

    // Create automated decline message
    const newMessage = await Message.create({
      senderId: currentUser._id,
      receiverId: friendId,
      message: `${currentUser.fullName || currentUser.email} has declined your chat request.`,
      messageType: "text",
    });

    const io = getIo();
    const receiverSocketId = OnlineUsers[friendId];
    if (io && receiverSocketId) {
      io.to(receiverSocketId).emit("newMessage", newMessage);
    }

    const updatedUser = await User.findById(currentUser._id).select("-password");
    res.status(200).json({ message: "Request declined", data: updatedUser });
  } catch (error) {
    next(error);
  }
};