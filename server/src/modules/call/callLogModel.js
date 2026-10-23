import mongoose from "mongoose";

const callLogSchema = new mongoose.Schema(
  {
    caller: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    callee: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    type: { type: String, enum: ["audio", "video"], required: true },
    // missed  = callee never picked it up
    // answered = call connected
    // declined = callee rejected explicitly
    // unavailable = caller canceled before pickup
    status: {
      type: String,
      enum: ["missed", "answered", "declined", "unavailable"],
      required: true,
    },
    startedAt: { type: Date, default: Date.now },
    durationSec: { type: Number, default: 0 },
  },
  { timestamps: true },
);

callLogSchema.index({ caller: 1, createdAt: -1 });
callLogSchema.index({ callee:1, createdAt: -1 });

const CallLog = mongoose.model("CallLog", callLogSchema);
export default CallLog;
