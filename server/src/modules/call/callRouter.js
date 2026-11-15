import express from "express";
import {
  createCallLog,
  getCallLogs,
  deleteCallLog,
  clearAllCallLogs,
} from "./callController.js";
import { Protect } from "../../shared/middlewares/authMiddleware.js";

const router = express.Router();

router.use(Protect);

router.get("/", getCallLogs);
router.post("/", createCallLog);
router.delete("/clear/all", clearAllCallLogs);
router.delete("/:callId", deleteCallLog);

export default router;
