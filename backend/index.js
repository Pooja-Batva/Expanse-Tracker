import "dotenv/config";
import mongoose from "mongoose";
import { app } from "./src/app.js";
import { connectDB } from "./src/db/index.js";
import logger from "./src/utils/logger.js";

const PORT = process.env.PORT || 5000;

// ─── Mongoose global settings ────────────────────────────────────────────────

mongoose.set("strictQuery", true);

// Log queries in development
if (process.env.NODE_ENV === "development") {
  mongoose.set("debug", (coll, method) => {
    logger.debug(`Mongoose: ${coll}.${method}`);
  });
}

// ─── Graceful shutdown ────────────────────────────────────────────────────────

const shutdown = async (signal) => {
  logger.info(`${signal} received — shutting down gracefully…`);
  await mongoose.connection.close();
  logger.info("MongoDB connection closed.");
  process.exit(0);
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

// ─── Unhandled errors ─────────────────────────────────────────────────────────

process.on("unhandledRejection", (err) => {
  logger.error(`Unhandled Rejection: ${err.message}`);
  process.exit(1);
});

process.on("uncaughtException", (err) => {
  logger.error(`Uncaught Exception: ${err.message}`);
  process.exit(1);
});

// ─── Bootstrap ───────────────────────────────────────────────────────────────

const start = async () => {
  await connectDB();

  app.listen(PORT, () => {
    logger.info(
      `🚀 Server running on port ${PORT} in ${process.env.NODE_ENV} mode`,
    );
  });
};

start();
