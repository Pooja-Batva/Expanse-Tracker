import { ApiError } from "../utils/apiHelpers.js";
import validator from "validator";

/**
 * Thin validation helpers — call inside controllers or as middleware.
 * We keep this lightweight rather than pulling in express-validator as a dep.
 */

export const validateRegister = (req, _res, next) => {
  const { name, email, password } = req.body;
  const errors = [];

  if (!name || name.trim().length < 2) errors.push("Name must be at least 2 characters.");
  if (!email || !validator.isEmail(email)) errors.push("Valid email is required.");
  if (!password || password.length < 8) errors.push("Password must be at least 8 characters.");

  // Password strength: at least one uppercase, one number
  if (password && !/(?=.*[A-Z])(?=.*\d)/.test(password)) {
    errors.push("Password must contain at least one uppercase letter and one number.");
  }

  if (errors.length) throw new ApiError(400, "Validation failed", errors);
  next();
};

export const validateTransaction = (req, _res, next) => {
  const { amount, type, category, date } = req.body;
  const errors = [];

  if (!amount || isNaN(amount) || Number(amount) <= 0)
    errors.push("Amount must be a positive number.");
  if (!type || !["income", "expense"].includes(type))
    errors.push("Type must be 'income' or 'expense'.");
  if (!category) errors.push("Category is required.");
  if (date && isNaN(Date.parse(date))) errors.push("Invalid date format.");

  if (errors.length) throw new ApiError(400, "Validation failed", errors);
  next();
};

export const validateBudget = (req, _res, next) => {
  const { amount, category, startDate, endDate } = req.body;
  const errors = [];

  if (!amount || isNaN(amount) || Number(amount) < 1)
    errors.push("Budget amount must be at least 1.");
  if (!category) errors.push("Category is required.");
  if (!startDate || isNaN(Date.parse(startDate))) errors.push("Valid start date is required.");
  if (!endDate || isNaN(Date.parse(endDate))) errors.push("Valid end date is required.");
  if (startDate && endDate && new Date(startDate) >= new Date(endDate))
    errors.push("End date must be after start date.");

  if (errors.length) throw new ApiError(400, "Validation failed", errors);
  next();
};
