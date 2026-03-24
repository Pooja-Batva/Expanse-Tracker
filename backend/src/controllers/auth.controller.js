import { User } from "../models/User.model.js";
import { ApiError, ApiResponse, asyncHandler } from "../utils/apiHelpers.js";
import { generateTokens, verifyRefreshToken, cookieOptions } from "../utils/tokens.js";

// ─── controllers ────────────────────────────────────────────────────────────

/**
 * POST /api/auth/register
 * Creates user account.
 */
export const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  const existing = await User.findOne({ email: email.toLowerCase().trim() });
  if (existing) {
    throw new ApiError(409, "Email already registered.");
  }

  const user = await User.create({ name, email, password });

  res.status(201).json(
    new ApiResponse(201, { email: user.email }, "Registration successful. You can now log in.")
  );
});

/**
 * POST /api/auth/login
 * Authenticate user with email and password.
 */
export const loginRequest = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email: email.toLowerCase().trim() }).select("+password");
  if (!user) throw new ApiError(401, "Invalid email or password.");

  const passwordMatch = await user.comparePassword(password);
  if (!passwordMatch) throw new ApiError(401, "Invalid email or password.");

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
        { accessToken, refreshToken, user: { _id: user._id, name: user.name, email: user.email } },
        "Logged in successfully."
      )
    );
});

/**
 * POST /api/auth/refresh
 * Issue new access token from refresh token stored in httpOnly cookie.
 */
export const refreshAccessToken = asyncHandler(async (req, res) => {
  // Accept from httpOnly cookie (web) OR request body (mobile/React Native)
  const token = req.cookies?.refreshToken || req.body?.refreshToken;
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
    .json(new ApiResponse(200, { accessToken, refreshToken: newRefresh }, "Token refreshed."));
});

/**
 * POST /api/auth/logout
 */
export const logout = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(req.user._id, { $unset: { refreshToken: 1 } });

  res
    .clearCookie("refreshToken")
    .status(200)
    .json(new ApiResponse(200, null, "Logged out successfully."))});

  /**
   * GET /api/auth/me
   */
  export const getMe = asyncHandler(async (req, res) => {
    res.status(200).json(new ApiResponse(200, req.user, "User profile fetched."));
  });
