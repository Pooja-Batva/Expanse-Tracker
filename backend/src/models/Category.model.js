import mongoose from "mongoose";

const categorySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    name: {
      type: String,
      required: [true, "Category name is required"],
      trim: true,
      minlength: [2, "Category name must be at least 2 characters"],
      maxlength: [30, "Category name cannot exceed 30 characters"],
    },
    type: {
      type: String,
      enum: ["income", "expense"],
      required: [true, "Category type is required"],
    },
    icon: {
      type: String,
      default: "📁",
    },
    color: {
      type: String,
      default: "#6366F1",
      validate: {
        validator: (v) => /^#([0-9A-F]{3}){1,2}$/i.test(v),
        message: "Color must be a valid hex code",
      },
    },
    isDefault: {
      type: Boolean,
      default: false, // true for system-level seed categories (not user-created)
    },
  },
  { timestamps: true }
);

// ── Compound unique index: one user cannot have duplicate name+type ──────────
categorySchema.index({ user: 1, name: 1, type: 1 }, { unique: true });

export const Category = mongoose.model("Category", categorySchema);
