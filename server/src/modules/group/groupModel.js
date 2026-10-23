import mongoose from "mongoose";

const memberSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    role: { type: String, enum: ["admin", "member"], default: "member" },
    joinedAt: { type: Date, default: Date.now },
    mutedUntil: { type: Date, default: null },
  },
  { _id: false },
);

const groupSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    avatar: { type: String, default: "" },
    description: { type: String, default: "", maxlength: 500 },
    members: [memberSchema],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    inviteCode: { type: String, unique: true, sparse: true },
    onlyAdminsCanSend: { type: Boolean, default: false },
    lastMessage: { type: mongoose.Schema.Types.ObjectId, ref: "Message", default: null },
  },
  { timestamps: true },
);

groupSchema.index({ "members.user": 1 });
groupSchema.index({ name: "text" });

const Group = mongoose.model("Group", groupSchema);
export default Group;
