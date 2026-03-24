import rateLimit from "express-rate-limit";

const createLimiter = (windowMinutes, max, message) =>
  rateLimit({
    windowMs: windowMinutes * 60 * 1000,
    max,
    message: { success: false, message },
    standardHeaders: true,
    legacyHeaders: false,
    // Use IP + user agent as key for better bot protection
    keyGenerator: (req) =>
      `${req.ip}::${req.headers["user-agent"] || "unknown"}`,
  });

// Auth endpoints (login, register)
export const authLimiter = createLimiter(
  15,
  20,
  "Too many authentication attempts. Please try again after 15 minutes."
);

// General API limiter (applied globally)
export const apiLimiter = createLimiter(
  15,
  300,
  "Too many requests from this IP. Please try again after 15 minutes."
);
