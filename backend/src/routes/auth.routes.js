import { Router } from "express";
import {
  register,
  verifyEmail,
  resendOtp,
  loginRequest,
  loginVerify,
  refreshAccessToken,
  logout,
  forgotPassword,
  resetPassword,
  getMe,
} from "../controllers/auth.controller.js";
import { protect } from "../middlewares/auth.middleware.js";
import { authLimiter, otpLimiter } from "../middlewares/rateLimiter.middleware.js";
import { validateRegister, validateOtp } from "../middlewares/validate.middleware.js";

const router = Router();

// Public routes
router.post("/register", authLimiter, validateRegister, register);
router.post("/verify-email", authLimiter, validateOtp, verifyEmail);
router.post("/resend-otp", otpLimiter, resendOtp);
router.post("/login", authLimiter, loginRequest);
router.post("/login/verify-otp", authLimiter, validateOtp, loginVerify);
router.post("/refresh", refreshAccessToken);
router.post("/forgot-password", otpLimiter, forgotPassword);
router.post("/reset-password", authLimiter, resetPassword);

// Protected routes
router.get("/me", protect, getMe);
router.post("/logout", protect, logout);

export default router;
