import { OAuth2Client } from "google-auth-library";

import { generateToken } from "./authToken.js";
import User from "../user/userModel.js";

const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo";

/**
 * Verify the access token issued by the custom "Continue with Google" button
 * (useGoogleLogin / implicit flow) and read the profile straight from Google.
 * Identity is never taken from the request body.
 */
const getProfileFromAccessToken = async (accessToken) => {
  const response = await fetch(GOOGLE_USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    const error = new Error("Invalid or expired Google access token");
    error.statusCode = 401;
    throw error;
  }

  const profile = await response.json();

  if (!profile?.email) {
    const error = new Error("Google account did not share an email address");
    error.statusCode = 400;
    throw error;
  }

  return profile;
};

/**
 * Verify the ID token (credential) issued by Google's pre-rendered button /
 * One Tap. Fail closed when the server's Google client ID is missing: decoding
 * a token without verifying its signature would let a forged token through.
 */
const getProfileFromCredential = async (credential) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;

  if (!clientId) {
    const error = new Error(
      "Google ID-token verification is not configured on the server",
    );
    error.statusCode = 503;
    throw error;
  }

  const ticket = await new OAuth2Client(clientId).verifyIdToken({
    idToken: credential,
    audience: clientId,
  });
  const payload = ticket.getPayload();

  if (!payload?.email) {
    const error = new Error("Google account did not share an email address");
    error.statusCode = 400;
    throw error;
  }

  return payload;
};

// ================= GOOGLE LOGIN =================
export const GoogleLogin = async (req, res, next) => {
  try {
    const { credential, access_token: accessToken } = req.body;

    let profile;

    if (accessToken) {
      profile = await getProfileFromAccessToken(accessToken);
    } else if (credential) {
      profile = await getProfileFromCredential(credential);
    } else {
      const error = new Error("Google credential or access token required");
      error.statusCode = 400;
      return next(error);
    }

    const email = String(profile.email).trim().toLowerCase();
    const name = profile.name || email.split("@")[0];
    const picture = profile.picture || "";
    const sub = profile.sub;

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
    } else if (!existingUser.google_id) {
      // Link the Google account to a user that signed up with email/password
      existingUser.google_id = sub;
      if (!existingUser.profilePic && picture) existingUser.profilePic = picture;
      await existingUser.save();
    } else if (existingUser.google_id !== sub) {
      const error = new Error(
        "This email is already linked to a different Google account",
      );
      error.statusCode = 401;
      return next(error);
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
