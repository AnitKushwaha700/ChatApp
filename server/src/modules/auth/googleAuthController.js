import { generateToken } from "./authToken.js";
import User from "../user/userModel.js";

// ================= GOOGLE LOGIN =================
export const GoogleLogin = async (req, res, next) => {
  try {
    const { access_token } = req.body;

    if (!access_token) {
      const error = new Error("Google access_token required");
      error.statusCode = 400;
      return next(error);
    }

    const response = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    });

    if (!response.ok) {
      const error = new Error("Failed to fetch user profile from Google");
      error.statusCode = 400;
      return next(error);
    }

    const payload = await response.json();
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
