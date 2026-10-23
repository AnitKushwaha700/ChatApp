import mongoose from "mongoose";

const viewerSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    at: { type: Date, default: Date.now },
  },
  { _id: false },
);

const statusSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type: { type: String, enum: ["text", "image", "video"], required: true },
    text: { type: String, default: "" },
    bg: { type: String, default: "" },
    mediaUrl: { type: String, default: "" },
    viewers: [viewerSchema],
    // 24-hour story expiry; Mongo TTL deletes the document automatically
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true },
);

statusSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const Status = mongoose.model("Status", statusSchema);
export default Status;
