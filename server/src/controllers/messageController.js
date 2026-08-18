import Message from "../models/messageModel.js";

export const SendMessage = async (req, res) => {
  try {
    const { receiverID, message } = req.body;
    const currentUser = req.user;

    console.log("Receiver ID:", receiverID);
    console.log("Message:", message);

    if (!receiverID || !message) {
      const error = new Error("All fields required");
      error.statusCode = 400;
      return next(error);
    }

    const newMessage = await Message.create({
      senderId: currentUser._id,
      receiverId: receiverID,
      message,
    });
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