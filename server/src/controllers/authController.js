import { generateToken } from "../config/authToken.js";
import User from "../models/userModel.js";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { sendEmail } from "../utils/sendEmail.js";

// ================= REGISTER =================
export const UserRegister = async (req, res, next) => {
  try {
    const { fullName, email, mobileNumber, password } = req.body;

    if (!fullName || !email || !mobileNumber || !password) {
      const error = new Error("All fields required");
      error.statusCode = 400;
      return next(error);
    }

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
    const { email, password } = req.body;

    if (!email || !password) {
      const error = new Error("All fields required");
      error.statusCode = 400;
      return next(error);
    }

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
    const { email } = req.body;
    if (!email) {
      const error = new Error("Email is required");
      error.statusCode = 400;
      return next(error);
    }

    const user = await User.findOne({ email });
    if (!user) {
      const error = new Error("User not found with this email");
      error.statusCode = 404;
      return next(error);
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Hash OTP before saving
    const hashedOtp = crypto.createHash("sha256").update(otp).digest("hex");
    
    user.resetPasswordOTP = hashedOtp;
    user.resetPasswordExpires = Date.now() + 10 * 60 * 1000; // 10 mins
    await user.save();

    const emailText = `Your OTP for resetting your Mingo Chat password is: ${otp}. It is valid for 10 minutes.`;
    await sendEmail({
      to: user.email,
      subject: "Password Reset OTP",
      text: emailText,
    });

    res.status(200).json({ message: "OTP sent to email successfully" });
  } catch (error) {
    next(error);
  }
};

// ================= RESET PASSWORD (VERIFY OTP & SET NEW) =================
export const ResetPassword = async (req, res, next) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      const error = new Error("Email, OTP and new password are required");
      error.statusCode = 400;
      return next(error);
    }

    const user = await User.findOne({ email });
    if (!user || !user.resetPasswordOTP || !user.resetPasswordExpires) {
      const error = new Error("Invalid request or OTP expired");
      error.statusCode = 400;
      return next(error);
    }

    if (Date.now() > user.resetPasswordExpires) {
      user.resetPasswordOTP = undefined;
      user.resetPasswordExpires = undefined;
      await user.save();
      const error = new Error("OTP has expired");
      error.statusCode = 400;
      return next(error);
    }

    const hashedOtp = crypto.createHash("sha256").update(otp).digest("hex");
    if (user.resetPasswordOTP !== hashedOtp) {
      const error = new Error("Invalid OTP");
      error.statusCode = 400;
      return next(error);
    }

    // Reset password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    
    // Make sure loginType is local if they set a password
    user.loginType = "local";

    user.resetPasswordOTP = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.status(200).json({ message: "Password reset successful" });
  } catch (error) {
    next(error);
  }
};