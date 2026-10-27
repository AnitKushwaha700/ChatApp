import express from "express";
import {
  createStatus,
  getStatuses,
  viewStatus,
  deleteStatus,
} from "./statusController.js";
import { Protect } from "../../shared/middlewares/authMiddleware.js";
import { uploadMessageMedia } from "../../core/storage/multer.js";

const router = express.Router();

router.use(Protect);

router.post("/", uploadMessageMedia.single("media"), createStatus);
router.get("/", getStatuses);
router.put("/:statusId/view", viewStatus);
router.delete("/:statusId", deleteStatus);

export default router;
