import { generateToken } from "./authToken.js";
import User from "../user/userModel.js";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { sendEmail } from "../../shared/utils/sendEmail.js";

// ================= LOGOUT =================
export const UserLogout = async (req, res, next) => {
  try {
    const isProduction = process.env.NODE_ENV === "production";
    res.cookie("token", "", {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "none" : "lax",
      expires: new Date(0), // Expire cookie immediately
    });
    res.status(200).json({ message: "Logout successful" });
  } catch (error) {
    next(error);
  }
};

// ================= REGISTER =================
export const UserRegister = async (req, res, next) => {
  try {
    let { fullName, email, mobileNumber, password } = req.body;

    if (!fullName || !email || !mobileNumber || !password) {
      const error = new Error("All fields required");
      error.statusCode = 400;
      return next(error);
    }

    if (
      typeof fullName !== "string" ||
      typeof email !== "string" ||
      typeof mobileNumber !== "string" ||
      typeof password !== "string"
    ) {
      const error = new Error("Invalid input formats");
      error.statusCode = 400;
      return next(error);
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      const error = new Error("Invalid email format");
      error.statusCode = 400;
      return next(error);
    }
    
    email = email.toLowerCase();

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      const error = new Error("Email already exists");
      error.statusCode = 400;
      return next(error);
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    await User.create({
      fullName,
      email,
      mobileNumber,
      password: hashedPassword,
    });

    res.status(201).json({ message: "Registration successful" });
  } catch (error) {
    next(error);
  }
};

// ================= LOGIN =================
export const UserLogin = async (req, res, next) => {
  try {
    let { email, password } = req.body;

    if (!email || !password) {
      const error = new Error("All fields required");
      error.statusCode = 400;
      return next(error);
    }

    if (typeof email !== "string" || typeof password !== "string") {
      const error = new Error("Invalid input formats");
      error.statusCode = 400;
      return next(error);
    }
    
    email = email.trim().toLowerCase();

    const existingUser = await User.findOne({ email });
    if (!existingUser) {
      const error = new Error("Email not registered");
      error.statusCode = 400;
      return next(error);
    }

    const isPasswordMatch = await bcrypt.compare(password, existingUser.password);
    if (!isPasswordMatch) {
      const error = new Error("Password did not match");
      error.statusCode = 400;
      return next(error);
    }

    generateToken(existingUser._id, res);

    const userData = existingUser.toObject();
    delete userData.password;

    res.status(200).json({
      message: "Login successful",
      data: userData,
    });
  } catch (error) {
    next(error);
  }
};

// ================= FORGOT PASSWORD (SEND OTP) =================
export const ForgotPassword = async (req, res, next) => {
  try {
    let { email } = req.body;
    if (!email) {
      const error = new Error("Email is required");
      error.statusCode = 400;
      return next(error);
    }

    if (typeof email !== "string") {
      const error = new Error("Invalid input format");
      error.statusCode = 400;
      return next(error);
    }
    
    email = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      const error = new Error("Invalid email format");
      error.statusCode = 400;
      return next(error);
    }

    const user = await User.findOne({ email });
    if (!user) {
      const error = new Error("User not found with this email");
      error.statusCode = 404;
      return next(error);
    }

    // 60-Second Cooldown between consecutive OTP requests
    if (user.lastPasswordResetRequestedAt) {
      const elapsedSeconds = Math.floor(
        (Date.now() - new Date(user.lastPasswordResetRequestedAt).getTime()) / 1000
      );
      if (elapsedSeconds < 60) {
        const remaining = 60 - elapsedSeconds;
        const error = new Error(`Please wait ${remaining}s before requesting a new code`);
        error.statusCode = 429;
        return next(error);
      }
    }

    // Generate cryptographically secure 6-digit OTP
    const otp = crypto.randomInt(100000, 999999).toString();
    
    // Hash OTP before saving (SHA-256)
    const hashedOtp = crypto.createHash("sha256").update(otp).digest("hex");
    
    user.resetPasswordOTP = hashedOtp;
    user.resetPasswordExpires = Date.now() + 10 * 60 * 1000; // 10 mins
    user.resetPasswordAttempts = 0;
    user.lastPasswordResetRequestedAt = new Date();
    await user.save();

    console.log(`[AUTH] Password reset OTP for ${user.email}: ${otp}`);

    try {
      await sendEmail({
        to: user.email,
        subject: "Your Password Reset Code - WhatsApp ChatApp",
        otp,
      });
      return res.status(200).json({
        success: true,
        message: "Verification code sent to your email successfully",
      });
    } catch (emailError) {
      console.warn("⚠️ SMTP sending failed:", emailError.message);
      // In development or if SMTP credentials fail, still return the generated OTP so reset can proceed
      return res.status(200).json({
        success: true,
        message: `OTP: ${otp} (Email SMTP failed: check console)`,
        devOtp: otp,
      });
    }
  } catch (error) {
    next(error);
  }
};

// ================= RESET PASSWORD (VERIFY OTP & SET NEW) =================
export const ResetPassword = async (req, res, next) => {
  try {
    let { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      const error = new Error("Email, OTP and new password are required");
      error.statusCode = 400;
      return next(error);
    }

    if (typeof email !== "string" || typeof otp !== "string" || typeof newPassword !== "string") {
      const error = new Error("Invalid input formats");
      error.statusCode = 400;
      return next(error);
    }
    
    email = email.trim().toLowerCase();
    otp = otp.trim();

    if (newPassword.length < 6) {
      const error = new Error("New password must be at least 6 characters long");
      error.statusCode = 400;
      return next(error);
    }

    const user = await User.findOne({ email });
    if (!user || !user.resetPasswordOTP || !user.resetPasswordExpires) {
      const error = new Error("Invalid request or OTP expired");
      error.statusCode = 400;
      return next(error);
    }

    // Expiry Check
    if (Date.now() > user.resetPasswordExpires) {
      user.resetPasswordOTP = undefined;
      user.resetPasswordExpires = undefined;
      user.resetPasswordAttempts = 0;
      await user.save();
      const error = new Error("Verification code has expired. Please request a new one.");
      error.statusCode = 400;
      return next(error);
    }

    // Attempt Limit Check (Max 5 attempts)
    const MAX_ATTEMPTS = 5;
    if ((user.resetPasswordAttempts || 0) >= MAX_ATTEMPTS) {
      user.resetPasswordOTP = undefined;
      user.resetPasswordExpires = undefined;
      user.resetPasswordAttempts = 0;
      await user.save();
      const error = new Error("Too many failed attempts. Code invalidated. Please request a new one.");
      error.statusCode = 400;
      return next(error);
    }

    const hashedOtp = crypto.createHash("sha256").update(otp).digest("hex");
    if (user.resetPasswordOTP !== hashedOtp) {
      user.resetPasswordAttempts = (user.resetPasswordAttempts || 0) + 1;
      await user.save();
      const remaining = MAX_ATTEMPTS - user.resetPasswordAttempts;
      const error = new Error(
        remaining > 0
          ? `Invalid OTP. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.`
          : "Too many failed attempts. Code invalidated. Please request a new code."
      );
      error.statusCode = 400;
      return next(error);
    }

    // Reset password & invalidate sessions
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    user.loginType = "local";
    user.resetPasswordOTP = undefined;
    user.resetPasswordExpires = undefined;
    user.resetPasswordAttempts = 0;
    user.passwordChangedAt = new Date();
    await user.save();

    res.status(200).json({
      success: true,
      message: "Password reset successful! You can now log in with your new password.",
    });
  } catch (error) {
    next(error);
  }
};