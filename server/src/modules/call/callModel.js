import mongoose from "mongoose";

const callSchema = new mongoose.Schema(
  {
    caller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    callType: {
      type: String,
      enum: ["audio", "video"],
      default: "audio",
    },
    status: {
      type: String,
      enum: ["completed", "missed", "rejected", "ongoing"],
      default: "completed",
    },
    duration: {
      type: Number, // duration in seconds
      default: 0,
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    endedAt: {
      type: Date,
    },
    chat: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Chat",
      default: null,
    },
  },
  { timestamps: true }
);

callSchema.index({ createdAt: -1 });

const Call = mongoose.model("Call", callSchema);
export default Call;
