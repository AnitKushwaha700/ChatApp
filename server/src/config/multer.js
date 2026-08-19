import multer from "multer";
import path from "path";
import fs from "fs";

// Ensure directories exist
const profilePicsDir = path.join(process.cwd(), "public", "uploads", "profile_pics");
const messagesDir = path.join(process.cwd(), "public", "uploads", "messages");

[profilePicsDir, messagesDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Profile Pic Storage
const profilePicStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, profilePicsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'dp-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// Messages Media Storage
const messageMediaStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, messagesDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'media-' + uniqueSuffix + path.extname(file.originalname));
  }
});

export const uploadProfilePic = multer({ storage: profilePicStorage });
export const uploadMessageMedia = multer({ storage: messageMediaStorage });
