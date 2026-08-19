import mongoose from "mongoose";

const messageSchema = mongoose.Schema(
  {
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    messageType: {
      type: String,
      enum: ["text", "image", "document", "audio", "video"],
      default: "text",
    },
    message: {
      type: String,
      required: function() { return this.messageType === 'text'; },
    },
    mediaUrl: {
      type: String,
    },
  },
  { timestamps: true }
);

const Message = mongoose.model("Message", messageSchema);
export default Message;