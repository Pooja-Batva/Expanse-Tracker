import { Category } from "../models/Category.model.js";
import { Transaction } from "../models/Transaction.model.js";
import { ApiError, ApiResponse, asyncHandler } from "../utils/apiHelpers.js";

/**
 * POST /api/categories
 * Create a category. Duplicate name+type for the same user is rejected
 * at DB level (unique index) and caught by the global error handler → 409.
 */
export const createCategory = asyncHandler(async (req, res) => {
  const { name, type, icon, color } = req.body;

  if (!name || !type) throw new ApiError(400, "Name and type are required.");
  if (!["income", "expense"].includes(type)) throw new ApiError(400, "Type must be 'income' or 'expense'.");

  const category = await Category.create({
    user: req.user._id,
    name: name.trim(),
    type,
    icon,
    color,
  });

  res.status(201).json(new ApiResponse(201, category, "Category created."));
});

/**
 * GET /api/categories
 * Return all categories for the logged-in user.
 */
export const getCategories = asyncHandler(async (req, res) => {
  const { type } = req.query; // optional filter: ?type=income|expense
  const filter = { user: req.user._id };
  if (type) filter.type = type;

  const categories = await Category.find(filter).sort({ name: 1 });
  res.status(200).json(new ApiResponse(200, categories, "Categories fetched."));
});

/**
 * PUT /api/categories/:id
 * Update name, icon, or color of a category.
 */
export const updateCategory = asyncHandler(async (req, res) => {
  const category = await Category.findOne({
    _id: req.params.id,
    user: req.user._id,
  });
  if (!category) throw new ApiError(404, "Category not found.");

  const { name, icon, color } = req.body;
  // Prevent duplicate: check if new name+type combo already exists for user
  if (name && name.trim() !== category.name) {
    const exists = await Category.findOne({
      user: req.user._id,
      name: name.trim(),
      type: category.type,
      _id: { $ne: category._id },
    });
    if (exists) throw new ApiError(409, "A category with this name already exists.");
    category.name = name.trim();
  }

  if (icon !== undefined) category.icon = icon;
  if (color !== undefined) category.color = color;

  await category.save();
  res.status(200).json(new ApiResponse(200, category, "Category updated."));
});

/**
 * DELETE /api/categories/:id
 * Refuses deletion if any transaction references this category.
 */
export const deleteCategory = asyncHandler(async (req, res) => {
  const category = await Category.findOne({
    _id: req.params.id,
    user: req.user._id,
  });
  if (!category) throw new ApiError(404, "Category not found.");

  // Guard: check if any transaction uses this category
  const txCount = await Transaction.countDocuments({
    user: req.user._id,
    category: category._id,
  });
  if (txCount > 0) {
    throw new ApiError(
      400,
      `Cannot delete this category. It is used by ${txCount} transaction(s). Reassign or delete them first.`
    );
  }

  await category.deleteOne();
  res.status(200).json(new ApiResponse(200, null, "Category deleted."));
});
