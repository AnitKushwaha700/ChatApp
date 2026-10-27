import express from "express";
import {
  accessOrCreateChat,
  fetchUserChats,
  createGroupChat,
  renameGroup,
  addToGroup,
  removeFromGroup,
  togglePinChat,
  toggleArchiveChat,
  toggleMuteChat,
  toggleStarMessage,
  getStarredMessages,
} from "./chatController.js";
import { Protect } from "../../shared/middlewares/authMiddleware.js";
import { uploadProfilePic } from "../../core/storage/multer.js";

const router = express.Router();

router.use(Protect);

router.post("/", accessOrCreateChat);
router.get("/", fetchUserChats);

router.post("/group", uploadProfilePic.single("groupIcon"), createGroupChat);
router.put("/group/:chatId/rename", renameGroup);
router.put("/group/:chatId/add", addToGroup);
router.put("/group/:chatId/remove", removeFromGroup);

router.put("/:chatId/pin", togglePinChat);
router.put("/:chatId/archive", toggleArchiveChat);
router.put("/:chatId/mute", toggleMuteChat);

router.get("/starred", getStarredMessages);
router.put("/message/:messageId/star", toggleStarMessage);

export default router;
