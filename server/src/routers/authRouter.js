import express from "express";
import { UserRegister, UserLogin } from "../controllers/authController.js";

const router = express.Router();

router.post("/register", UserRegister);
router.post("/login", UserLogin);


export default router;