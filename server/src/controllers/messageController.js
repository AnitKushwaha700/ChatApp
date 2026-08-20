import Message from "../models/messageModel.js";
import { OnlineUsers, getIo } from "../config/webSocket.js";

export const SendMessage = async (req, res, next) => {
  try {
    const { receiverID, message, messageType } = req.body;
    const currentUser = req.user;

    let mediaUrl = undefined;
    if (req.file) {
      mediaUrl = `/public/uploads/messages/${req.file.filename}`;
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

    const messages = await Message.find({
      $or: [
        { senderId: currentUser._id, receiverId: friendId },
        { senderId: friendId, receiverId: currentUser._id },
      ],
    }).sort({ createdAt: 1 });
    res.status(200).json({ data: messages });
  } catch (error) {
    console.log(error.message);
    next();
  }
};