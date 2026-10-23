import express from "express";
import { Protect } from "../../shared/middlewares/authMiddleware.js";
import { uploadProfilePic } from "../../core/storage/multer.js";
import {
  CreateGroup,
  ListGroups,
  GetGroup,
  UpdateGroup,
  AddMembers,
  RemoveMember,
  ChangeMemberRole,
  LeaveGroup,
  DeleteGroup,
  GenerateInviteLink,
  JoinByInvite,
} from "./groupController.js";

const router = express.Router();

router.use(Protect);

router.post("/", uploadProfilePic.single("avatar"), CreateGroup);
router.get("/", ListGroups);
router.post("/join/:code", JoinByInvite);
router.get("/:groupId", GetGroup);
router.patch("/:groupId", uploadProfilePic.single("avatar"), UpdateGroup);
router.delete("/:groupId", DeleteGroup);

router.post("/:groupId/members", AddMembers);
router.delete("/:groupId/members/:userId", RemoveMember);
router.post("/:groupId/role/:userId", ChangeMemberRole);
router.post("/:groupId/leave", LeaveGroup);
router.post("/:groupId/invite-link", GenerateInviteLink);

export default router;
