import Message from "./messageModel.js";
import Chat from "./chatModel.js";
import { OnlineUsers, getIo } from "../../core/socket/webSocket.js";

export const SendMessage = async (req, res, next) => {
  try {
    const { receiverID, chatId, message, messageType, repliedTo } = req.body;
    const currentUser = req.user;

    let mediaUrl = undefined;
    if (req.file) {
      mediaUrl = req.file.path;
    }

    if (!receiverID && !chatId) {
      const error = new Error("Receiver ID or Chat ID required");
      error.statusCode = 400;
      return next(error);
    }

    if (!message && !mediaUrl) {
      const error = new Error("Message or media required");
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

    let activeChat = null;
    if (chatId) {
      activeChat = await Chat.findById(chatId);
    } else if (receiverID) {
      activeChat = await Chat.findOne({
        isGroupChat: false,
        $and: [
          { users: { $elemMatch: { $eq: currentUser._id } } },
          { users: { $elemMatch: { $eq: receiverID } } },
        ],
      });
      if (!activeChat) {
        activeChat = await Chat.create({
          isGroupChat: false,
          chatName: "direct",
          users: [currentUser._id, receiverID],
        });
      }
    }

    let targetReceiver = receiverID;
    if (!targetReceiver && activeChat && !activeChat.isGroupChat) {
      targetReceiver = activeChat.users.find(
        (u) => u.toString() !== currentUser._id.toString()
      );
    }

    let newMessage = await Message.create({
      chat: activeChat ? activeChat._id : null,
      senderId: currentUser._id,
      receiverId: targetReceiver,
      message: message || "Sent an attachment",
      messageType: messageType || "text",
      mediaUrl,
      repliedTo: repliedTo || null,
      readBy: [currentUser._id],
      deliveredTo: [currentUser._id],
    });

    if (activeChat) {
      activeChat.latestMessage = newMessage._id;
      await activeChat.save();
    }

    if (newMessage.repliedTo) {
      newMessage = await newMessage.populate({
        path: "repliedTo",
        select: "_id message messageType mediaUrl senderId",
      });
    }

    newMessage = await newMessage.populate(
      "senderId",
      "fullName profilePic email"
    );

    const io = getIo();
    if (io) {
      if (activeChat && activeChat.isGroupChat) {
        activeChat.users.forEach((userId) => {
          if (userId.toString() !== currentUser._id.toString()) {
            const socketId = OnlineUsers[userId.toString()];
            if (socketId) {
              io.to(socketId).emit("newMessage", newMessage);
            }
          }
        });
        io.to(activeChat._id.toString()).emit("newMessage", newMessage);
      } else {
        const receiverSocketId = OnlineUsers[targetReceiver];
        if (receiverSocketId) {
          io.to(receiverSocketId).emit("newMessage", newMessage);
        }
        if (activeChat) {
          io.to(activeChat._id.toString()).emit("newMessage", newMessage);
        }
      }
    }

    res
      .status(201)
      .json({ message: "Message sent successfully", data: newMessage });
  } catch (error) {
    console.log(error.message);
    next(error);
  }
};

export const GetMessages = async (req, res, next) => {
  try {
    const { friendId } = req.params;
    const currentUser = req.user;

    let messages = await Message.find({
      $or: [
        { chat: friendId },
        { senderId: currentUser._id, receiverId: friendId },
        { senderId: friendId, receiverId: currentUser._id },
      ],
      deletedBy: { $ne: currentUser._id },
    })
      .populate("senderId", "fullName profilePic email")
      .populate({
        path: "repliedTo",
        select: "_id message messageType mediaUrl senderId",
      })
      .sort({ createdAt: 1 });
    
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
      if (
        message.senderId.toString() !== currentUser._id.toString() &&
        message.receiverId.toString() !== currentUser._id.toString()
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

    const result = await Message.updateMany(
      { senderId: friendId, receiverId: currentUser._id, isRead: false },
      { $set: { isRead: true, readAt: new Date() } }
    );

    // Notify the friend via socket so their blue ticks show up immediately
    const io = getIo();
    const senderSocketId = OnlineUsers[friendId];
    if (io && senderSocketId) {
      io.to(senderSocketId).emit("messagesRead", {
        friendId: currentUser._id,
        readBy: currentUser._id,
      });
    }

    res.status(200).json({ success: true, message: "Messages marked as read", modifiedCount: result.modifiedCount });
  } catch (error) {
    console.log(error.message);
    next(error);
  }
};

export const ReactToMessage = async (req, res, next) => {
  try {
    const { messageId } = req.params;
    const { emoji } = req.body;
    const currentUser = req.user;

    if (!emoji || typeof emoji !== "string") {
      const error = new Error("Emoji is required");
      error.statusCode = 400;
      return next(error);
    }

    const message = await Message.findById(messageId);
    if (!message) {
      const error = new Error("Message not found");
      error.statusCode = 404;
      return next(error);
    }

    const isSender = message.senderId.toString() === currentUser._id.toString();
    const isReceiver = message.receiverId.toString() === currentUser._id.toString();
    if (!isSender && !isReceiver) {
      const error = new Error("Unauthorized to react to this message");
      error.statusCode = 403;
      return next(error);
    }

    if (!message.reactions) {
      message.reactions = [];
    }

    const existingIndex = message.reactions.findIndex(
      (r) => r.user.toString() === currentUser._id.toString()
    );

    if (existingIndex > -1) {
      if (message.reactions[existingIndex].emoji === emoji) {
        // Toggle off
        message.reactions.splice(existingIndex, 1);
      } else {
        // Change emoji
        message.reactions[existingIndex].emoji = emoji;
      }
    } else {
      message.reactions.push({
        user: currentUser._id,
        emoji,
      });
    }

    await message.save();

    const io = getIo();
    const otherUserId = isSender ? message.receiverId.toString() : message.senderId.toString();
    const otherSocketId = OnlineUsers[otherUserId];
    const currentSocketId = OnlineUsers[currentUser._id.toString()];

    const payload = {
      messageId: message._id,
      reactions: message.reactions,
      friendId: currentUser._id,
    };

    if (io) {
      if (otherSocketId) io.to(otherSocketId).emit("messageReaction", payload);
      if (currentSocketId) io.to(currentSocketId).emit("messageReaction", payload);
    }

    res.status(200).json({ success: true, reactions: message.reactions });
  } catch (error) {
    console.log(error.message);
    next(error);
  }
};

export const EditMessage = async (req, res, next) => {
  try {
    const { messageId } = req.params;
    const { message: newText } = req.body;
    const currentUser = req.user;

    if (!newText || typeof newText !== "string") {
      const error = new Error("New message text is required");
      error.statusCode = 400;
      return next(error);
    }

    const message = await Message.findById(messageId);
    if (!message) {
      const error = new Error("Message not found");
      error.statusCode = 404;
      return next(error);
    }

    if (message.senderId.toString() !== currentUser._id.toString()) {
      const error = new Error("Only the sender can edit this message");
      error.statusCode = 403;
      return next(error);
    }

    if (message.isDeletedForEveryone) {
      const error = new Error("Cannot edit a deleted message");
      error.statusCode = 400;
      return next(error);
    }

    message.message = newText;
    message.isEdited = true;
    await message.save();

    const io = getIo();
    const receiverSocketId = OnlineUsers[message.receiverId];
    const senderSocketId = OnlineUsers[message.senderId];
    const payload = {
      messageId: message._id,
      message: message.message,
      isEdited: true,
    };
    if (io) {
      if (receiverSocketId) io.to(receiverSocketId).emit("messageEdited", payload);
      if (senderSocketId) io.to(senderSocketId).emit("messageEdited", payload);
    }

    res.status(200).json({ success: true, data: message });
  } catch (error) {
    next(error);
  }
};