import mongoose from "mongoose";

const statusSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    mediaUrl: {
      type: String,
      default: "",
    },
    mediaType: {
      type: String,
      enum: ["image", "video", "text"],
      default: "image",
    },
    caption: {
      type: String,
      default: "",
    },
    backgroundColor: {
      type: String,
      default: "#075E54", // WhatsApp classic green for text statuses
    },
    viewers: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        viewedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    expiresAt: {
      type: Date,
      required: true,
      index: { expireAfterSeconds: 0 }, // MongoDB TTL auto-deletion
    },
  },
  { timestamps: true }
);

const Status = mongoose.model("Status", statusSchema);
export default Status;
