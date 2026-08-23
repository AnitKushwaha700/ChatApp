import express from "express";
import { UserRegister, UserLogin, ForgotPassword, ResetPassword } from "./authController.js";
import { GoogleLogin } from "./googleAuthController.js";

const router = express.Router();

router.post("/register", UserRegister);
router.post("/login", UserLogin);
router.post("/google", GoogleLogin);
router.post("/forgot-password", ForgotPassword);
router.post("/reset-password", ResetPassword);

export default router;