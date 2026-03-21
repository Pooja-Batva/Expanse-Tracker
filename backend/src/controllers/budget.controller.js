import { Budget } from "../models/Budget.model.js";
import { Category } from "../models/Category.model.js";
import { Transaction } from "../models/Transaction.model.js";
import { ApiError, ApiResponse, asyncHandler } from "../utils/apiHelpers.js";

/**
 * POST /api/budgets
 * Create a budget for a category over a user-defined date range.
 */
export const createBudget = asyncHandler(async (req, res) => {
  const { category, amount, startDate, endDate, label, alertThreshold } = req.body;

  // Validate category ownership
  const cat = await Category.findOne({ _id: category, user: req.user._id });
  if (!cat) throw new ApiError(404, "Category not found.");
  if (cat.type !== "expense") {
    throw new ApiError(400, "Budgets can only be set for expense categories.");
  }

  // Prevent overlapping budget for the same category
  const overlap = await Budget.findOne({
    user: req.user._id,
    category,
    $or: [
      { startDate: { $lte: new Date(endDate) }, endDate: { $gte: new Date(startDate) } },
    ],
  });
  if (overlap) {
    throw new ApiError(
      409,
      `A budget for this category already exists for the period ${overlap.label || overlap.startDate.toDateString()} – ${overlap.endDate.toDateString()}.`
    );
  }

  // Calculate already-spent amount for this period so the budget shows accurate data immediately
  const spentResult = await Transaction.aggregate([
    {
      $match: {
        user: req.user._id,
        category: cat._id,
        type: "expense",
        date: { $gte: new Date(startDate), $lte: new Date(endDate) },
      },
    },
    { $group: { _id: null, total: { $sum: "$amount" } } },
  ]);
  const spent = spentResult[0]?.total || 0;

  const budget = await Budget.create({
    user: req.user._id,
    category,
    amount: Number(amount),
    startDate: new Date(startDate),
    endDate: new Date(endDate),
    label,
    spent,
    alertThreshold: alertThreshold || 80,
  });

  await budget.populate("category", "name icon color");
  res.status(201).json(new ApiResponse(201, budget, "Budget created."));
});

/**
 * GET /api/budgets
 * Return all budgets for the user.
 * Optional: ?active=true → only budgets where today falls within the range
 */
export const getBudgets = asyncHandler(async (req, res) => {
  const filter = { user: req.user._id };

  if (req.query.active === "true") {
    const now = new Date();
    filter.startDate = { $lte: now };
    filter.endDate = { $gte: now };
  }

  const budgets = await Budget.find(filter)
    .populate("category", "name icon color type")
    .sort({ startDate: -1 });

  res.status(200).json(new ApiResponse(200, budgets, "Budgets fetched."));
});

/**
 * GET /api/budgets/:id
 */
export const getBudget = asyncHandler(async (req, res) => {
  const budget = await Budget.findOne({
    _id: req.params.id,
    user: req.user._id,
  }).populate("category", "name icon color type");

  if (!budget) throw new ApiError(404, "Budget not found.");
  res.status(200).json(new ApiResponse(200, budget, "Budget fetched."));
});

/**
 * PUT /api/budgets/:id
 * Update amount, label, alertThreshold. Dates and category cannot be changed
 * (delete and recreate instead for accuracy).
 */
export const updateBudget = asyncHandler(async (req, res) => {
  const budget = await Budget.findOne({ _id: req.params.id, user: req.user._id });
  if (!budget) throw new ApiError(404, "Budget not found.");

  const { amount, label, alertThreshold } = req.body;

  if (amount !== undefined) budget.amount = Number(amount);
  if (label !== undefined) budget.label = label;
  if (alertThreshold !== undefined) budget.alertThreshold = Number(alertThreshold);
  // Reset alert flag on update
  budget.alertSent = false;

  await budget.save();
  await budget.populate("category", "name icon color type");
  res.status(200).json(new ApiResponse(200, budget, "Budget updated."));
});

/**
 * DELETE /api/budgets/:id
 */
export const deleteBudget = asyncHandler(async (req, res) => {
  const budget = await Budget.findOne({ _id: req.params.id, user: req.user._id });
  if (!budget) throw new ApiError(404, "Budget not found.");

  await budget.deleteOne();
  res.status(200).json(new ApiResponse(200, null, "Budget deleted."));
});

/**
 * GET /api/budgets/:id/transactions
 * List all transactions that fall under this budget's period and category.
 */
export const getBudgetTransactions = asyncHandler(async (req, res) => {
  const budget = await Budget.findOne({ _id: req.params.id, user: req.user._id });
  if (!budget) throw new ApiError(404, "Budget not found.");

  const transactions = await Transaction.find({
    user: req.user._id,
    category: budget.category,
    type: "expense",
    date: { $gte: budget.startDate, $lte: budget.endDate },
  })
    .populate("category", "name icon color")
    .sort({ date: -1 });

  res.status(200).json(new ApiResponse(200, transactions, "Budget transactions fetched."));
});
