import { ApiError, asyncHandler } from "../utils/apiHelpers.js";
import { verifyAccessToken } from "../utils/tokens.js";
import { User } from "../models/User.model.js";

/**
 * Protect routes — verifies Bearer JWT in Authorization header.
 * Attaches req.user for downstream handlers.
 */
export const protect = asyncHandler(async (req, _res, next) => {
  let token;

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.split(" ")[1];
  }

  if (!token) {
    throw new ApiError(401, "Access denied. No token provided.");
  }

  let decoded;
  try {
    decoded = verifyAccessToken(token);
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      throw new ApiError(401, "Token expired. Please refresh.");
    }
    throw new ApiError(401, "Invalid token.");
  }

  const user = await User.findById(decoded.id).select("-password -refreshToken");
  if (!user) {
    throw new ApiError(401, "User belonging to this token no longer exists.");
  }

  req.user = user;
  next();
});
