import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import connectDB from "./src/config/db.js";
import AuthRouter from "./src/routers/authRouter.js";
import UserRouter from "./src/routers/userRouter.js";

const app = express();

// Middlewares
app.use(
  cors({
    origin: ["http://localhost:5173"],
    credentials: true,
  }),
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan("dev"));

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

app.listen(PORT, async () => {
  await connectDB();
  console.log("🔗 Server started at port:", PORT);
});