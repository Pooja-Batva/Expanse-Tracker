import crypto from "crypto";
import bcrypt from "bcryptjs";

/**
 * Generate a cryptographically secure 6-digit OTP.
 */
export const generateOtp = () => {
  // Use crypto.randomInt for unbiased range
  const otp = crypto.randomInt(100000, 999999).toString();
  return otp;
};

/**
 * Hash OTP before storing in DB (treat like a password).
 */
export const hashOtp = async (otp) => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(otp, salt);
};

/**
 * Compare plain OTP against stored hash.
 */
export const verifyOtp = async (plainOtp, hashedOtp) => {
  return bcrypt.compare(plainOtp, hashedOtp);
};

/**
 * Return the expiry Date object based on env config.
 */
export const otpExpiry = () => {
  const minutes = Number(process.env.OTP_EXPIRES_MINUTES) || 10;
  return new Date(Date.now() + minutes * 60 * 1000);
};
