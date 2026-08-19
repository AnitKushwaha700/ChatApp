import express from "express";
import { getAllUsers, updateProfile } from "../controllers/userController.js";
import { SendMessage, GetMessages } from "../controllers/messageController.js";
import { Protect } from "../middleware/authMiddleware.js";
import { uploadProfilePic, uploadMessageMedia } from "../config/multer.js";

const router = express.Router();

router.get("/allUsers", Protect, getAllUsers);
router.put("/profile", Protect, uploadProfilePic.single("profilePic"), updateProfile);

router.post("/send-message", Protect, uploadMessageMedia.single("media"), SendMessage);
router.get("/get-messages/:friendId", Protect, GetMessages);

export default router;