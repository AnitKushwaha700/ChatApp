import express from "express";
import rateLimit from "express-rate-limit";
import { UserRegister, UserLogin, UserLogout, ForgotPassword, ResetPassword } from "./authController.js";
import { GoogleLogin } from "./googleAuthController.js";

const router = express.Router();

const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 mins
  max: 3, // 3 requests per IP
  message: { success: false, message: "Too many OTP requests. Please try again later." }
});

router.post("/register", UserRegister);
router.post("/login", UserLogin);
router.post("/logout", UserLogout);
router.post("/google", GoogleLogin);
router.post("/forgot-password", otpLimiter, ForgotPassword);
router.post("/reset-password", ResetPassword);

export default router;