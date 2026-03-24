import { Router } from "express";
import {
  register,
  loginRequest,
  refreshAccessToken,
  logout,
  getMe,
} from "../controllers/auth.controller.js";
import { protect } from "../middlewares/auth.middleware.js";
import { authLimiter } from "../middlewares/rateLimiter.middleware.js";
import { validateRegister } from "../middlewares/validate.middleware.js";

const router = Router();

// Public routes
router.post("/register", authLimiter, validateRegister, register);
router.post("/login", authLimiter, loginRequest);
router.post("/refresh", refreshAccessToken);

// Protected routes
router.get("/me", protect, getMe);
router.post("/logout", protect, logout);

export default router;
