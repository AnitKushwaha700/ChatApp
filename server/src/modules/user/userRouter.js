import express from "express";
import {
  getAllUsers,
  updateProfile,
  getConversations,
  getMe,
} from "./userController.js";
import {
  SendMessage,
  GetMessages,
  GetGroupMessages,
  DeleteMessage,
  ClearChat,
  ClearGroupChat,
  MarkMessagesAsRead,
  MarkGroupMessagesAsRead,
  EditMessage,
  ReactMessage,
  ToggleStarMessage,
  GetStarredMessages,
  ForwardMessage,
  GetChatList,
} from "../chat/messageController.js";
import { Protect } from "../../shared/middlewares/authMiddleware.js";
import {
  uploadProfilePic,
  uploadMessageMedia,
} from "../../core/storage/multer.js";

const router = express.Router();

// Users & profile
router.get("/me", Protect, getMe);
router.get("/allUsers", Protect, getAllUsers);
router.get("/conversations", Protect, getConversations);
router.put(
  "/profile",
  Protect,
  uploadProfilePic.single("profilePic"),
  updateProfile,
);

// WhatsApp-style unified chat list (DMs + groups, last message, unread, settings)
router.get("/chat-list", Protect, GetChatList);

// Messages (legacy + extended)
router.post(
  "/send-message",
  Protect,
  uploadMessageMedia.single("media"),
  SendMessage,
);
router.get("/get-messages/:friendId", Protect, GetMessages);
router.get("/group-messages/:groupId", Protect, GetGroupMessages);
router.put("/mark-read/:friendId", Protect, MarkMessagesAsRead);
router.put("/mark-read-group/:groupId", Protect, MarkGroupMessagesAsRead);
router.delete("/message/:messageId", Protect, DeleteMessage);
router.delete("/messages/:friendId", Protect, ClearChat);
router.delete("/group-messages/:groupId", Protect, ClearGroupChat);

// Rich message actions
router.patch("/message/:messageId", Protect, EditMessage);
router.post("/message/:messageId/react", Protect, ReactMessage);
router.post("/message/:messageId/star", Protect, ToggleStarMessage);
router.delete("/message/:messageId/star", Protect, ToggleStarMessage);
router.get("/starred-messages", Protect, GetStarredMessages);
router.post("/message/forward", Protect, ForwardMessage);

export default router;
