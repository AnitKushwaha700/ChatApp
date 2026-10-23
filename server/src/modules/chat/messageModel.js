import mongoose from "mongoose";

const reactionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    emoji: { type: String, required: true },
    at: { type: Date, default: Date.now },
  },
  { _id: false },
);

const readEntrySchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    at: { type: Date, default: Date.now },
  },
  { _id: false },
);

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
    // Set for group messages; receiverId stays null for groups
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group",
      default: null,
    },
    messageType: {
      type: String,
      enum: [
        "text",
        "image",
        "document",
        "audio",
        "video",
        "system",
        "location",
      ],
      default: "text",
    },
    message: {
      type: String,
      required: function () {
        return this.messageType === "text" || this.messageType === "system";
      },
    },
    mediaUrl: {
      type: String,
    },
    mediaMeta: {
      name: String,
      size: Number,
      mimeType: String,
      duration: Number,
    },
    // WhatsApp-style rich messaging
    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
      default: null,
    },
    forwardedFrom: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    reactions: [reactionSchema],
    isEdited: { type: Boolean, default: false },
    editedAt: { type: Date, default: null },
    starredBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    // Delivery pipeline: sent -> delivered -> read
    deliveredTo: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    readBy: [readEntrySchema],
    tempClientId: { type: String, default: null },
    // Disappearing messages (Mongo TTL removes the doc automatically)
    expiresAt: { type: Date, default: null },
    // Legacy soft-delete semantics (kept for backward compatibility)
    deletedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    isDeletedForEveryone: {
      type: Boolean,
      default: false,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

// History queries (DM + group)
messageSchema.index({ senderId: 1, receiverId: 1, createdAt: -1 });
messageSchema.index({ groupId: 1, createdAt: -1 });
// Unread count aggregation
messageSchema.index({ receiverId: 1, isRead: 1 });
// TTL cleanup for disappearing messages & nothing else (sparse behaviour via null)
messageSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0, partialFilterExpression: { expiresAt: { $type: "date" } } });
// Idempotent optimistic sends
messageSchema.index({ tempClientId: 1 }, { sparse: true });

const Message = mongoose.model("Message", messageSchema);
export default Message;
