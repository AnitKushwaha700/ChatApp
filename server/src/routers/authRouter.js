import express from "express";
import { UserRegister, UserLogin, SwitchUser } from "../controllers/authController.js";

const router = express.Router();

router.post("/register", UserRegister);
router.post("/login", UserLogin);
router.post("/switch", SwitchUser);

export default router;