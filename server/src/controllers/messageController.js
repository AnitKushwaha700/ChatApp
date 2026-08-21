import Message from "../models/messageModel.js";
import { OnlineUsers, getIo } from "../config/webSocket.js";

export const SendMessage = async (req, res, next) => {
  try {
    const { receiverID, message, messageType } = req.body;
    const currentUser = req.user;

    let mediaUrl = undefined;
    if (req.file) {
      mediaUrl = req.file.path;
    }

    console.log("Receiver ID:", receiverID);
    console.log("Message:", message);
    console.log("Message Type:", messageType);

    if (!receiverID || (!message && !mediaUrl)) {
      const error = new Error("Receiver ID and message/media required");
      error.statusCode = 400;
      return next(error);
    }

    const newMessage = await Message.create({
      senderId: currentUser._id,
      receiverId: receiverID,
      message: message || "Sent an attachment",
      messageType: messageType || "text",
      mediaUrl,
    });

    const io = getIo();
    const receiverSocketId = OnlineUsers[receiverID];
    if (io && receiverSocketId) {
      io.to(receiverSocketId).emit("newMessage", newMessage);
    }

    res
      .status(201)
      .json({ message: "Message sent successfully", data: newMessage });
  } catch (error) {
    console.log(error.message);
    next();
  }
};

export const GetMessages = async (req, res) => {
  try {
    const { friendId } = req.params;
    const currentUser = req.user;

    let messages = await Message.find({
      $or: [
        { senderId: currentUser._id, receiverId: friendId },
        { senderId: friendId, receiverId: currentUser._id },
      ],
      deletedBy: { $ne: currentUser._id } // exclude messages deleted by current user
    }).sort({ createdAt: 1 });
    
    // Scrub messages deleted for everyone
    messages = messages.map(msg => {
      if (msg.isDeletedForEveryone) {
        return {
          ...msg._doc,
          message: "🚫 This message was deleted",
          messageType: "text",
          mediaUrl: null
        };
      }
      return msg;
    });

    res.status(200).json({ data: messages });
  } catch (error) {
    console.log(error.message);
    next(error);
  }
};

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
      if (message.senderId.toString() !== currentUser._id.toString()) {
        const error = new Error("Unauthorized to delete this message for everyone");
        error.statusCode = 403;
        return next(error);
      }
      message.isDeletedForEveryone = true;
      await message.save();

      // Emit to receiver so their UI updates
      const io = getIo();
      const receiverSocketId = OnlineUsers[message.receiverId];
      if (io && receiverSocketId) {
        io.to(receiverSocketId).emit("messageDeleted", { messageId: message._id });
      }
    } else {
      // Default to "for_me"
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
        $or: [
          { senderId: currentUser._id, receiverId: friendId },
          { senderId: friendId, receiverId: currentUser._id },
        ],
      },
      {
        $addToSet: { deletedBy: currentUser._id },
      }
    );

    res.status(200).json({ success: true, message: "Chat cleared" });
  } catch (error) {
    console.log(error.message);
    next(error);
  }
};

export const MarkMessagesAsRead = async (req, res, next) => {
  try {
    const { friendId } = req.params;
    const currentUser = req.user;

    await Message.updateMany(
      { senderId: friendId, receiverId: currentUser._id, isRead: false },
      { $set: { isRead: true } }
    );

    res.status(200).json({ success: true, message: "Messages marked as read" });
  } catch (error) {
    console.log(error.message);
    next(error);
  }
};