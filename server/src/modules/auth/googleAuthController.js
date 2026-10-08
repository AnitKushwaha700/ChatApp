import { generateToken } from "./authToken.js";
import User from "../user/userModel.js";

import jwt from "jsonwebtoken";

// ================= GOOGLE LOGIN =================
export const GoogleLogin = async (req, res, next) => {
  try {
    const { credential } = req.body;

    if (!credential) {
      const error = new Error("Google credential required");
      error.statusCode = 400;
      return next(error);
    }

    const payload = jwt.decode(credential);
    if (!payload || !payload.email) {
      const error = new Error("Invalid Google credential");
      error.statusCode = 400;
      return next(error);
    }

    const { email, name, picture, sub } = payload;

    let existingUser = await User.findOne({ email });

    if (!existingUser) {
      // Create new user
      existingUser = await User.create({
        fullName: name,
        email: email,
        google_id: sub,
        loginType: "google",
        profilePic: picture,
      });
    } else {
      // Update existing user with google id if not present
      if (!existingUser.google_id) {
        existingUser.google_id = sub;
        existingUser.loginType = existingUser.loginType === "local" ? "local" : "google";
        if(!existingUser.profilePic) existingUser.profilePic = picture;
        await existingUser.save();
      }
    }

    generateToken(existingUser._id, res);

    const userData = existingUser.toObject();
    delete userData.password;

    res.status(200).json({
      message: "Google Login successful",
      data: userData,
    });
  } catch (error) {
    next(error);
  }
};
