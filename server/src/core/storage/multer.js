import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import dotenv from "dotenv";

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const profilePicStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "chat_app/profiles",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
    transformation: [{ width: 800, height: 800, crop: "fill", gravity: "face", quality: "auto" }],
  },
});

const messageMediaStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "chat_app/messages",
    resource_type: "auto", // Allows audio, video, raw documents
  },
});

export const uploadProfilePic = multer({ storage: profilePicStorage });
export const uploadMessageMedia = multer({ storage: messageMediaStorage });
