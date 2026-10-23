import mongoose from "mongoose";

const chatSettingSchema = new mongoose.Schema(
  {
    chatType: { type: String, enum: ["dm", "group"], required: true },
    chatId: { type: mongoose.Schema.Types.ObjectId, required: true },
    pinned: { type: Boolean, default: false },
    archived: { type: Boolean, default: false },
    mutedUntil: { type: Date, default: null },
    // Disappearing messages: 0 = off, otherwise hours (24, 168, 720)
    disappearingHours: { type: Number, default: 0 },
  },
  { _id: false },
);

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    mobileNumber: {
      type: String,
    },
    password: {
      type: String,
      required: function () {
        return this.loginType === "local";
      },
    },
    google_id: {
      type: String,
    },
    loginType: {
      type: String,
      enum: ["local", "google"],
      default: "local",
    },
    profilePic: {
      type: String,
      default: "",
    },
    about: {
      type: String,
      default: "Hey there! I am using ChatApp",
      maxlength: 139,
    },
    lastSeen: {
      type: Date,
      default: null,
    },
    friends: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    pendingRequests: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    sentRequests: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    blockedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    privacy: {
      lastSeen: {
        type: String,
        enum: ["everyone", "friends", "nobody"],
        default: "everyone",
      },
      profilePhoto: {
        type: String,
        enum: ["everyone", "friends", "nobody"],
        default: "everyone",
      },
      about: {
        type: String,
        enum: ["everyone", "friends", "nobody"],
        default: "everyone",
      },
      readReceipts: { type: Boolean, default: true },
    },
    chatSettings: [chatSettingSchema],
    resetPasswordOTP: {
      type: String,
    },
    resetPasswordExpires: {
      type: Date,
    },
  },
  { timestamps: true },
);

const User = mongoose.model("User", userSchema);
export default User;
