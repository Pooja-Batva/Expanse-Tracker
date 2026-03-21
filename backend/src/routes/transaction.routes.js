import { Router } from "express";
import {
  createTransaction,
  getTransactions,
  getTransaction,
  updateTransaction,
  deleteTransaction,
  getTransactionsByCategory,
  getMonthlySummary,
} from "../controllers/transaction.controller.js";
import { protect } from "../middlewares/auth.middleware.js";
import { validateTransaction } from "../middlewares/validate.middleware.js";

const router = Router();

router.use(protect);

// Specific routes before parameterized ones
router.get("/by-category", getTransactionsByCategory);
router.get("/monthly-summary", getMonthlySummary);

router.route("/").get(getTransactions).post(validateTransaction, createTransaction);
router.route("/:id").get(getTransaction).put(updateTransaction).delete(deleteTransaction);

export default router;
