import express from "express";
import { Protect } from "../../shared/middlewares/authMiddleware.js";
import {
  SendFriendRequest,
  AcceptFriendRequest,
  DeclineFriendRequest,
  GetFriendRequests,
  GetFriends,
  RemoveFriend,
  BlockUser,
  UnblockUser,
  GetBlocked,
  UpdatePrivacy,
  UpdateAbout,
  GetUserProfile,
  UpdateChatSettings,
} from "./socialController.js";

const router = express.Router();

// Friend requests
router.post("/friend-request/:toId", Protect, SendFriendRequest);
router.post("/friend-request/:id/accept", Protect, AcceptFriendRequest);
router.post("/friend-request/:id/decline", Protect, DeclineFriendRequest);
router.get("/friend-requests", Protect, GetFriendRequests);
router.get("/friends", Protect, GetFriends);
router.delete("/friend/:id", Protect, RemoveFriend);

// Blocking
router.post("/block/:id", Protect, BlockUser);
router.delete("/block/:id", Protect, UnblockUser);
router.get("/blocked", Protect, GetBlocked);

// Privacy & profile
router.patch("/privacy", Protect, UpdatePrivacy);
router.patch("/about", Protect, UpdateAbout);
router.get("/user/:id", Protect, GetUserProfile);

// Per-chat settings: pin / archive / mute / disappearing messages
router.patch("/chat-settings/:chatType/:chatId", Protect, UpdateChatSettings);

export default router;
