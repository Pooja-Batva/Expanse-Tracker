import mongoose from "mongoose";

const OTP_TYPES = ["verify", "reset", "login"];

const otpSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    hashedOtp: {
      type: String,
      required: true,
      select: false, // never exposed in queries
    },
    type: {
      type: String,
      enum: OTP_TYPES,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    used: {
      type: Boolean,
      default: false,
    },
    attempts: {
      type: Number,
      default: 0,
      max: [5, "Too many failed attempts"],
    },
  },
  { timestamps: true }
);

// Auto-delete expired documents (MongoDB TTL index)
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
// Speed up look-ups by email + type
otpSchema.index({ email: 1, type: 1 });

export const Otp = mongoose.model("Otp", otpSchema);
