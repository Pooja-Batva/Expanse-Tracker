import { User } from "../models/User.model.js";
import { Otp } from "../models/Otp.model.js";
import { ApiError, ApiResponse, asyncHandler } from "../utils/apiHelpers.js";
import { generateTokens, verifyRefreshToken, cookieOptions } from "../utils/tokens.js";
import { generateOtp, hashOtp, verifyOtp, otpExpiry } from "../utils/otp.js";
import { sendOtpEmail } from "../utils/email.js";

// ─── helpers ────────────────────────────────────────────────────────────────

const issueOtp = async (user, type) => {
  // Invalidate any prior OTPs of the same type for this user
  await Otp.deleteMany({ user: user._id, type });

  const plain = generateOtp();
  const hashed = await hashOtp(plain);

  await Otp.create({
    user: user._id,
    email: user.email,
    hashedOtp: hashed,
    type,
    expiresAt: otpExpiry(),
  });

  await sendOtpEmail(user.email, plain, type);
};

// ─── controllers ────────────────────────────────────────────────────────────

/**
 * POST /api/auth/register
 * Creates user (unverified) and sends verification OTP.
 */
export const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  const existing = await User.findOne({ email: email.toLowerCase().trim() });
  if (existing) {
    if (existing.isVerified) throw new ApiError(409, "Email already registered.");
    // Resend OTP if account exists but unverified
    await issueOtp(existing, "verify");
    return res.status(200).json(
      new ApiResponse(200, null, "Account exists but unverified. OTP resent to your email.")
    );
  }

  const user = await User.create({ name, email, password });
  console.log(user);
  await issueOtp(user, "verify");

  res.status(201).json(
    new ApiResponse(201, { email: user.email }, "Registration successful. Please verify your email.")
  );
});

/**
 * POST /api/auth/verify-email
 * Verifies email with OTP.
 */
export const verifyEmail = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;

  const user = await User.findOne({ email: email.toLowerCase().trim() });
  if (!user) throw new ApiError(404, "User not found.");
  if (user.isVerified) throw new ApiError(400, "Email already verified.");

  const otpRecord = await Otp.findOne({
    user: user._id,
    type: "verify",
    used: false,
    expiresAt: { $gt: new Date() },
  }).select("+hashedOtp");

  if (!otpRecord) throw new ApiError(400, "OTP expired or invalid. Please request a new one.");

  // Increment attempt counter before verifying (prevents brute force)
  otpRecord.attempts += 1;
  if (otpRecord.attempts > 5) {
    await otpRecord.deleteOne();
    throw new ApiError(429, "Too many failed attempts. Please request a new OTP.");
  }

  const valid = await verifyOtp(otp, otpRecord.hashedOtp);
  if (!valid) {
    await otpRecord.save();
    throw new ApiError(400, `Invalid OTP. ${5 - otpRecord.attempts} attempt(s) remaining.`);
  }

  // Mark OTP as used and verify user atomically
  otpRecord.used = true;
  await otpRecord.save();
  user.isVerified = true;
  await user.save();

  res.status(200).json(new ApiResponse(200, null, "Email verified successfully. You can now log in."));
});

/**
 * POST /api/auth/resend-otp
 * Resends an OTP of a given type.
 */
export const resendOtp = asyncHandler(async (req, res) => {
  const { email, type } = req.body;
  if (!["verify", "reset", "login"].includes(type)) {
    throw new ApiError(400, "Invalid OTP type.");
  }

  const user = await User.findOne({ email: email.toLowerCase().trim() });
  if (!user) throw new ApiError(404, "User not found.");

  await issueOtp(user, type);
  res.status(200).json(new ApiResponse(200, null, `OTP resent to ${email}.`));
});

/**
 * POST /api/auth/login
 * Step 1: validate credentials → send login OTP.
 */
export const loginRequest = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email: email.toLowerCase().trim() }).select("+password");
  if (!user) throw new ApiError(401, "Invalid email or password.");

  const passwordMatch = await user.comparePassword(password);
  if (!passwordMatch) throw new ApiError(401, "Invalid email or password.");

  if (!user.isVerified) throw new ApiError(403, "Please verify your email first.");

  await issueOtp(user, "login");
  res.status(200).json(
    new ApiResponse(200, { email: user.email }, "OTP sent to your email. Please verify to log in.")
  );
});

/**
 * POST /api/auth/login/verify-otp
 * Step 2: verify login OTP → issue tokens.
 */
export const loginVerify = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;

  const user = await User.findOne({ email: email.toLowerCase().trim() }).select("+refreshToken");
  if (!user) throw new ApiError(401, "Invalid email.");

  const otpRecord = await Otp.findOne({
    user: user._id,
    type: "login",
    used: false,
    expiresAt: { $gt: new Date() },
  }).select("+hashedOtp");

  if (!otpRecord) throw new ApiError(400, "OTP expired or invalid.");

  otpRecord.attempts += 1;
  if (otpRecord.attempts > 5) {
    await otpRecord.deleteOne();
    throw new ApiError(429, "Too many failed attempts. Please request a new OTP.");
  }

  const valid = await verifyOtp(otp, otpRecord.hashedOtp);
  if (!valid) {
    await otpRecord.save();
    throw new ApiError(400, `Invalid OTP. ${5 - otpRecord.attempts} attempt(s) remaining.`);
  }

  otpRecord.used = true;
  await otpRecord.save();

  user.lastLogin = new Date();
  const { accessToken, refreshToken } = generateTokens(user._id);
  user.refreshToken = refreshToken;
  await user.save({ validateBeforeSave: false });

  res
    .cookie("refreshToken", refreshToken, cookieOptions(7))
    .status(200)
    .json(
      new ApiResponse(
        200,
        { accessToken, user: { _id: user._id, name: user.name, email: user.email } },
        "Logged in successfully."
      )
    );
});

/**
 * POST /api/auth/refresh
 * Issue new access token from refresh token stored in httpOnly cookie.
 */
export const refreshAccessToken = asyncHandler(async (req, res) => {
  const token = req.cookies?.refreshToken;
  if (!token) throw new ApiError(401, "No refresh token provided.");

  let decoded;
  try {
    decoded = verifyRefreshToken(token);
  } catch {
    throw new ApiError(401, "Invalid or expired refresh token.");
  }

  const user = await User.findById(decoded.id).select("+refreshToken");
  if (!user || user.refreshToken !== token) {
    throw new ApiError(401, "Refresh token reuse detected. Please log in again.");
  }

  const { accessToken, refreshToken: newRefresh } = generateTokens(user._id);
  user.refreshToken = newRefresh;
  await user.save({ validateBeforeSave: false });

  res
    .cookie("refreshToken", newRefresh, cookieOptions(7))
    .status(200)
    .json(new ApiResponse(200, { accessToken }, "Token refreshed."));
});

/**
 * POST /api/auth/logout
 */
export const logout = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(req.user._id, { $unset: { refreshToken: 1 } });

  res
    .clearCookie("refreshToken")
    .status(200)
    .json(new ApiResponse(200, null, "Logged out successfully."));
});

/**
 * POST /api/auth/forgot-password
 */
export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email: email.toLowerCase().trim() });

  // Always return 200 to avoid email enumeration
  if (user && user.isVerified) {
    await issueOtp(user, "reset");
  }

  res.status(200).json(
    new ApiResponse(200, null, "If that email is registered, a reset OTP has been sent.")
  );
});

/**
 * POST /api/auth/reset-password
 */
export const resetPassword = asyncHandler(async (req, res) => {
  const { email, otp, newPassword } = req.body;
  if (!newPassword || newPassword.length < 8) {
    throw new ApiError(400, "New password must be at least 8 characters.");
  }

  const user = await User.findOne({ email: email.toLowerCase().trim() }).select("+password");
  if (!user) throw new ApiError(404, "User not found.");

  const otpRecord = await Otp.findOne({
    user: user._id,
    type: "reset",
    used: false,
    expiresAt: { $gt: new Date() },
  }).select("+hashedOtp");

  if (!otpRecord) throw new ApiError(400, "OTP expired or invalid.");

  const valid = await verifyOtp(otp, otpRecord.hashedOtp);
  if (!valid) throw new ApiError(400, "Invalid OTP.");

  otpRecord.used = true;
  await otpRecord.save();

  user.password = newPassword; // hashed by pre-save hook
  // Invalidate all existing sessions
  user.refreshToken = undefined;
  await user.save();

  res.clearCookie("refreshToken").status(200).json(
    new ApiResponse(200, null, "Password reset successfully. Please log in.")
  );
});

/**
 * GET /api/auth/me
 */
export const getMe = asyncHandler(async (req, res) => {
  res.status(200).json(new ApiResponse(200, req.user, "User profile fetched."));
});
