import express from "express";
import { getAllUsers, updateProfile, getConversations, getMe } from "./userController.js";
import { SendMessage, GetMessages, DeleteMessage, ClearChat, MarkMessagesAsRead } from "../chat/messageController.js";
import { Protect } from "../../shared/middlewares/authMiddleware.js";
import { uploadProfilePic, uploadMessageMedia } from "../../core/storage/multer.js";

const router = express.Router();

router.get("/me", Protect, getMe);
router.get("/allUsers", Protect, getAllUsers);
router.get("/conversations", Protect, getConversations);
router.put("/profile", Protect, uploadProfilePic.single("profilePic"), updateProfile);



router.post("/send-message", Protect, uploadMessageMedia.single("media"), SendMessage);
router.get("/get-messages/:friendId", Protect, GetMessages);
router.put("/mark-read/:friendId", Protect, MarkMessagesAsRead);
router.delete("/message/:messageId", Protect, DeleteMessage);
router.delete("/messages/:friendId", Protect, ClearChat);

export default router;