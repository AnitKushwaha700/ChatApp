import dotenv from "dotenv";
import path from "path";
dotenv.config();

import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import connectDB from "./src/config/db.js";
import AuthRouter from "./src/routers/authRouter.js";
import UserRouter from "./src/routers/userRouter.js";

import http from "http";
import { Server } from "socket.io";
import websocket from "./src/config/webSocket.js";

const app = express();

const allowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://172.168.7.164:5173",
];

// Middlewares
app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || 
          origin.startsWith("http://localhost") || 
          origin.startsWith("http://127.0.0.1") || 
          origin.startsWith("http://192.168.") || 
          origin.startsWith("http://172.") || 
          origin.startsWith("http://10.")) {
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
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  console.error("❌ Error:", err);
  res.status(statusCode).json({ success: false, message });
});

const PORT = process.env.PORT || 5000;

const httpServer = http.createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: function (origin, callback) {
      if (!origin || 
          origin.startsWith("http://localhost") || 
          origin.startsWith("http://127.0.0.1") || 
          origin.startsWith("http://192.168.") || 
          origin.startsWith("http://172.") || 
          origin.startsWith("http://10.")) {
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
