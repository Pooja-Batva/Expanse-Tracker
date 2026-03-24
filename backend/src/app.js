import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import compression from "compression";
import mongoSanitize from "express-mongo-sanitize";
import hpp from "hpp";

import authRoutes from "./routes/auth.routes.js";
import categoryRoutes from "./routes/category.routes.js";
import transactionRoutes from "./routes/transaction.routes.js";
import budgetRoutes from "./routes/budget.routes.js";

import errorHandler from "./middlewares/error.middleware.js";
import { apiLimiter } from "./middlewares/rateLimiter.middleware.js";
import { ApiError } from "./utils/apiHelpers.js";

const app = express();

// ─── Security headers ────────────────────────────────────────────────────────
app.use(helmet());

// ─── CORS ────────────────────────────────────────────────────────────────────
app.use(
  cors({
    origin: true, // allow all origins (adjust in production)
    credentials: true, // allow cookies
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  })
);

// ─── Body parsers ────────────────────────────────────────────────────────────
app.use(express.json({ limit: "16kb" }));         // cap payload size
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(cookieParser());

// ─── Data sanitization ───────────────────────────────────────────────────────
app.use(mongoSanitize());   // strip $ and . from req.body/params (NoSQL injection)
// xss-clean removed: use CSP via helmet for XSS protection

// ─── HTTP parameter pollution protection ─────────────────────────────────────
app.use(hpp());

// ─── Response compression ────────────────────────────────────────────────────
app.use(compression());

// ─── Global rate limiter ─────────────────────────────────────────────────────
app.use("/api", apiLimiter);

// ─── Routes ──────────────────────────────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/budgets", budgetRoutes);

// ─── Health check ────────────────────────────────────────────────────────────
app.get("/api/health", (_req, res) => {
  res.status(200).json({ success: true, message: "Server is healthy 🟢", timestamp: new Date() });
});

// ─── 404 handler ─────────────────────────────────────────────────────────────
app.use((_req, _res, next) => {
  next(new ApiError(404, "Route not found."));
});

// ─── Global error handler (must be last) ─────────────────────────────────────
app.use(errorHandler);

export { app };
