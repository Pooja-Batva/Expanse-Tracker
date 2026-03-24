import { Transaction } from "../models/Transaction.model.js";
import { Category } from "../models/Category.model.js";
import { Budget } from "../models/Budget.model.js";
import { ApiError, ApiResponse, asyncHandler } from "../utils/apiHelpers.js";

// ─── helpers ────────────────────────────────────────────────────────────────

/**
 * After creating/updating/deleting a transaction, recalculate
 * "spent" on any active budgets that cover that category + date.
 */
const syncBudgetSpent = async (userId, categoryId) => {
  const budgets = await Budget.find({
    user: userId,
    category: categoryId,
  });

  for (const budget of budgets) {
    const result = await Transaction.aggregate([
      {
        $match: {
          user: userId,
          category: categoryId,
          type: "expense",
          date: { $gte: budget.startDate, $lte: budget.endDate },
        },
      },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    budget.spent = result[0]?.total || 0;
    await budget.save();
  }
};

// ─── controllers ────────────────────────────────────────────────────────────

/**
 * POST /api/transactions
 * Create a new transaction.
 */
export const createTransaction = asyncHandler(async (req, res) => {
  const { amount, type, category, note, date, tags } = req.body;

  // Ensure category belongs to this user
  const cat = await Category.findOne({ _id: category, user: req.user._id });
  if (!cat) throw new ApiError(404, "Category not found.");

  // Category type must match transaction type
  if (cat.type !== type) {
    throw new ApiError(
      400,
      `Category type "${cat.type}" does not match transaction type "${type}".`
    );
  }

  const transaction = await Transaction.create({
    user: req.user._id,
    category,
    type,
    amount: Number(amount),
    note,
    date: date ? new Date(date) : new Date(),
    tags,
  });

  // Sync budget spent asynchronously (don't block response)
  syncBudgetSpent(req.user._id, category).catch(() => { });

  await transaction.populate("category", "name icon color type");
  res.status(201).json(new ApiResponse(201, transaction, "Transaction created."));
});

/**
 * GET /api/transactions
 * Returns transactions with flexible filtering:
 *   - ?month=3&year=2025          → Monthly view (default current month)
 *   - ?startDate=2025-03-07&endDate=2025-05-07  → Custom date range
 *   - ?category=<id>              → Filter by category
 *   - ?type=income|expense        → Filter by type
 *   - ?sortBy=amount_desc|amount_asc|date_desc|date_asc  → Sorting
 *   - ?page=1&limit=20            → Pagination
 */
export const getTransactions = asyncHandler(async (req, res) => {
  const {
    month,
    year,
    startDate,
    endDate,
    category,
    type,
    sortBy = "date_desc",
    page = 1,
    limit = 20,
  } = req.query;

  const filter = { user: req.user._id };

  // ── Date range ──────────────────────────────────────────────────────────
  if (startDate && endDate) {
    filter.date = {
      $gte: new Date(startDate),
      $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999)),
    };
  } else {
    // Default to current month
    const now = new Date();
    const m = month ? Number(month) - 1 : now.getMonth();
    const y = year ? Number(year) : now.getFullYear();
    filter.date = {
      $gte: new Date(y, m, 1),
      $lte: new Date(y, m + 1, 0, 23, 59, 59, 999),
    };
  }

  if (category) filter.category = category;
  if (type && ["income", "expense"].includes(type)) filter.type = type;

  // ── Sorting ─────────────────────────────────────────────────────────────
  const sortMap = {
    amount_desc: { amount: -1 },
    amount_asc: { amount: 1 },
    date_desc: { date: -1 },
    date_asc: { date: 1 },
  };
  const sort = sortMap[sortBy] || { date: -1 };

  // ── Pagination ──────────────────────────────────────────────────────────
  const pageNum = Math.max(1, Number(page));
  const limitNum = Math.min(100, Math.max(1, Number(limit)));
  const skip = (pageNum - 1) * limitNum;

  const [transactions, total] = await Promise.all([
    Transaction.find(filter)
      .populate("category", "name icon color type")
      .sort(sort)
      .skip(skip)
      .limit(limitNum)
      .lean(),
    Transaction.countDocuments(filter),
  ]);

  // ── Summary for the queried period ─────────────────────────────────────
  const summary = await Transaction.aggregate([
    { $match: filter },
    {
      $group: {
        _id: "$type",
        total: { $sum: "$amount" },
        count: { $sum: 1 },
      },
    },
  ]);

  const income = summary.find((s) => s._id === "income");
  const expense = summary.find((s) => s._id === "expense");

  res.status(200).json(
    new ApiResponse(
      200,
      {
        transactions,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum),
        },
        summary: {
          totalIncome: income?.total || 0,
          totalExpense: expense?.total || 0,
          net: (income?.total || 0) - (expense?.total || 0),
          incomeCount: income?.count || 0,
          expenseCount: expense?.count || 0,
        },
      },
      "Transactions fetched."
    )
  );
});

/**
 * GET /api/transactions/by-category
 * Spending breakdown per category, sorted most→least, for a date range.
 *   - ?startDate=&endDate=   or  ?month=&year=
 *   - ?type=expense (default)
 */
export const getTransactionsByCategory = asyncHandler(async (req, res) => {
  const { startDate, endDate, month, year, type = "expense" } = req.query;

  let dateFilter;
  if (startDate && endDate) {
    dateFilter = {
      $gte: new Date(startDate),
      $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999)),
    };
  } else {
    const now = new Date();
    const m = month ? Number(month) - 1 : now.getMonth();
    const y = year ? Number(year) : now.getFullYear();
    dateFilter = { $gte: new Date(y, m, 1), $lte: new Date(y, m + 1, 0, 23, 59, 59, 999) };
  }

  const breakdown = await Transaction.aggregate([
    {
      $match: {
        user: req.user._id,
        type,
        date: dateFilter,
      },
    },
    {
      $group: {
        _id: "$category",
        total: { $sum: "$amount" },
        count: { $sum: 1 },
      },
    },
    { $sort: { total: -1 } }, // most to least
    {
      $lookup: {
        from: "categories",
        localField: "_id",
        foreignField: "_id",
        as: "category",
      },
    },
    { $unwind: "$category" },
    {
      $project: {
        _id: 0,
        category: { _id: "$category._id", name: "$category.name", icon: "$category.icon", color: "$category.color" },
        total: 1,
        count: 1,
      },
    },
  ]);

  res.status(200).json(new ApiResponse(200, breakdown, "Category breakdown fetched."));
});

/**
 * GET /api/transactions/:id
 */
export const getTransaction = asyncHandler(async (req, res) => {
  const transaction = await Transaction.findOne({
    _id: req.params.id,
    user: req.user._id,
  }).populate("category", "name icon color type");

  if (!transaction) throw new ApiError(404, "Transaction not found.");
  res.status(200).json(new ApiResponse(200, transaction, "Transaction fetched."));
});

/**
 * PUT /api/transactions/:id
 */
export const updateTransaction = asyncHandler(async (req, res) => {
  const transaction = await Transaction.findOne({
    _id: req.params.id,
    user: req.user._id,
  });
  if (!transaction) throw new ApiError(404, "Transaction not found.");

  const oldCategoryId = transaction.category.toString();
  const { amount, type, category, note, date, tags } = req.body;

  if (category) {
    const cat = await Category.findOne({ _id: category, user: req.user._id });
    if (!cat) throw new ApiError(404, "Category not found.");
    const resolvedType = type || transaction.type;
    if (cat.type !== resolvedType) {
      throw new ApiError(400, `Category type "${cat.type}" does not match transaction type "${resolvedType}".`);
    }
    transaction.category = category;
  }

  if (amount !== undefined) transaction.amount = Number(amount);
  if (type !== undefined) transaction.type = type;
  if (note !== undefined) transaction.note = note;
  if (date !== undefined) transaction.date = new Date(date);
  if (tags !== undefined) transaction.tags = tags;

  await transaction.save();
  await transaction.populate("category", "name icon color type");

  // Sync budgets for both old and (possibly new) category
  const categoriesToSync = new Set([oldCategoryId, transaction.category._id.toString()]);
  for (const catId of categoriesToSync) {
    syncBudgetSpent(req.user._id, catId).catch(() => { });
  }

  res.status(200).json(new ApiResponse(200, transaction, "Transaction updated."));
});

/**
 * DELETE /api/transactions/:id
 */
export const deleteTransaction = asyncHandler(async (req, res) => {
  const transaction = await Transaction.findOne({
    _id: req.params.id,
    user: req.user._id,
  });
  if (!transaction) throw new ApiError(404, "Transaction not found.");

  const categoryId = transaction.category.toString();
  await transaction.deleteOne();

  syncBudgetSpent(req.user._id, categoryId).catch(() => { });

  res.status(200).json(new ApiResponse(200, null, "Transaction deleted."));
});

/**
 * GET /api/transactions/monthly-summary
 * Returns income/expense totals grouped by month for the last N months.
 * ?months=6 (default 6)
 */
export const getMonthlySummary = asyncHandler(async (req, res) => {
  const months = Math.min(24, Math.max(1, Number(req.query.months) || 6));

  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - months + 1);
  startDate.setDate(1);
  startDate.setHours(0, 0, 0, 0);

  const data = await Transaction.aggregate([
    {
      $match: {
        user: req.user._id,
        date: { $gte: startDate },
      },
    },
    {
      $group: {
        _id: {
          year: { $year: "$date" },
          month: { $month: "$date" },
          type: "$type",
        },
        total: { $sum: "$amount" },
      },
    },
    { $sort: { "_id.year": 1, "_id.month": 1 } },
  ]);

  res.status(200).json(new ApiResponse(200, data, "Monthly summary fetched."));
});
