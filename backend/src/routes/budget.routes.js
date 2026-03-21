import { Router } from "express";
import {
  createBudget,
  getBudgets,
  getBudget,
  updateBudget,
  deleteBudget,
  getBudgetTransactions,
} from "../controllers/budget.controller.js";
import { protect } from "../middlewares/auth.middleware.js";
import { validateBudget } from "../middlewares/validate.middleware.js";

const router = Router();

router.use(protect);

router.route("/").get(getBudgets).post(validateBudget, createBudget);
router.route("/:id").get(getBudget).put(updateBudget).delete(deleteBudget);
router.get("/:id/transactions", getBudgetTransactions);

export default router;
