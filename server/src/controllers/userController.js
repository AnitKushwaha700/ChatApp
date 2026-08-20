import User from "../models/userModel.js";
import Message from "../models/messageModel.js";

export const getAllUsers = async (req, res, next) => {
  try {
    const currentUser = req.user;
    const { search } = req.query;

    const query = { _id: { $ne: currentUser._id } };

    if (search) {
      query.$or = [
        { fullName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { mobileNumber: { $regex: search, $options: "i" } },
      ];
    }

    const users = await User.find(query).select("-password").limit(50);

    res.status(200).json({ data: users });
  } catch (error) {
    next(error);
  }
};

export const updateProfile = async (req, res, next) => {
  try {
    const currentUser = req.user;

    const { fullName, email, mobileNumber } = req.body;
    let profilePicUrl = undefined;

    if (req.file) {
      profilePicUrl = `/public/uploads/profile_pics/${req.file.filename}`;
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

    // Find all messages where current user is sender or receiver
    const messages = await Message.find({
      $or: [
        { senderId: currentUser._id },
        { receiverId: currentUser._id },
      ],
    }).sort({ createdAt: -1 });

    // Extract unique user IDs that are not the current user
    const userIds = new Set();
    messages.forEach((msg) => {
      if (msg.senderId.toString() !== currentUser._id.toString()) {
        userIds.add(msg.senderId.toString());
      }
      if (msg.receiverId.toString() !== currentUser._id.toString()) {
        userIds.add(msg.receiverId.toString());
      }
    });

    // Fetch the actual user documents
    const users = await User.find({ _id: { $in: Array.from(userIds) } }).select("-password");

    // Optional: Sort users by most recent message (since userIds were added in order of newest message first)
    const sortedUsers = Array.from(userIds).map(id => users.find(u => u._id.toString() === id)).filter(Boolean);

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

    const updatedUser = await User.findById(currentUser._id).select("-password");
    res.status(200).json({ message: "Request declined", data: updatedUser });
  } catch (error) {
    next(error);
  }
};