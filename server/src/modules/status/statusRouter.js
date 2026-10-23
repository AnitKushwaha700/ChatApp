import express from "express";
import { Protect } from "../../shared/middlewares/authMiddleware.js";
import { uploadMessageMedia } from "../../core/storage/multer.js";
import {
  CreateStatus,
  ListStatus,
  ViewStatus,
  StatusViewers,
  DeleteStatus,
} from "./statusController.js";

const router = express.Router();

router.use(Protect);

router.post("/", uploadMessageMedia.single("media"), CreateStatus);
router.get("/", ListStatus);
router.post("/:id/view", ViewStatus);
router.get("/:id/viewers", StatusViewers);
router.delete("/:id", DeleteStatus);

export default router;
