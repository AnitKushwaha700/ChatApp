import dotenv from "dotenv";
import path from "path";
dotenv.config();

import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import connectDB from "./src/core/database/db.js";
import AuthRouter from "./src/modules/auth/authRouter.js";
import UserRouter from "./src/modules/user/userRouter.js";

import http from "http";
import { Server } from "socket.io";
import websocket from "./src/core/socket/webSocket.js";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

const app = express();

const allowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "https://chat-app-anikett78.vercel.app",
  process.env.CLIENT_URL, // Allow dynamic frontend URL from environment
].filter(Boolean); // Remove undefined values

// Middlewares
app.use(helmet());
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Limit each IP to 200 requests per window
  message: { success: false, message: "Too many requests from this IP, please try again later" },
});
app.use(limiter);

app.use(
  cors({
    origin: function (origin, callback) {
      if (
        !origin ||
        origin.startsWith("http://localhost") ||
        origin.startsWith("http://127.0.0.1") ||
        origin.startsWith("http://192.168.") ||
        origin.startsWith("http://172.") ||
        origin.startsWith("http://10.") ||
        allowedOrigins.includes(origin)
      ) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  }),
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan("dev"));
app.use("/public", express.static(path.join(process.cwd(), "public")));

// Routes
app.use("/auth", AuthRouter);
app.use("/user", UserRouter);

// Health check
app.get("/", (req, res) => {
  res.status(200).json({ message: "Mingo Chat API is running 🚀" });
});

// Global error handler
app.use((err, req, res, _next) => {
  const statusCode = err.statusCode || 500;
  let message = err.message || "Internal Server Error";
  
  if (process.env.NODE_ENV === "production" && statusCode === 500) {
    message = "Internal Server Error";
  }

  if (statusCode === 500) {
    console.error("❌ Error:", err);
  } else {
    console.warn(`⚠️ Client Error (${statusCode}):`, err.message);
  }
  res.status(statusCode).json({ success: false, message });
});

const PORT = process.env.PORT || 5000;

const httpServer = http.createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: function (origin, callback) {
      if (
        !origin ||
        origin.startsWith("http://localhost") ||
        origin.startsWith("http://127.0.0.1") ||
        origin.startsWith("http://192.168.") ||
        origin.startsWith("http://172.") ||
        origin.startsWith("http://10.") ||
        allowedOrigins.includes(origin)
      ) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST"],
  },
});

websocket(io);

httpServer.listen(PORT, async () => {
  await connectDB();
  console.log("Server started at port:", PORT);
});
