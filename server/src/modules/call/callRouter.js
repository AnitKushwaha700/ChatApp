import express from "express";
import { Protect } from "../../shared/middlewares/authMiddleware.js";
import { CreateCallLog, GetCallHistory } from "./callController.js";

const router = express.Router();

router.use(Protect);

router.post("/", CreateCallLog);
router.get("/history", GetCallHistory);

export default router;
