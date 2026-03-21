import mongoose from "mongoose";

const budgetSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: [true, "Category is required"],
    },
    amount: {
      type: Number,
      required: [true, "Budget amount is required"],
      min: [1, "Budget must be at least 1"],
    },
    // Flexible interval: user defines their own start/end date
    startDate: {
      type: Date,
      required: [true, "Start date is required"],
    },
    endDate: {
      type: Date,
      required: [true, "End date is required"],
    },
    // Friendly label for UI (e.g. "March 2025", "Q1 2025", "Weekly")
    label: {
      type: String,
      trim: true,
      maxlength: [50, "Label cannot exceed 50 characters"],
    },
    // Track how much has been spent against this budget
    // This is a computed/cached value updated on transaction write
    spent: {
      type: Number,
      default: 0,
      min: 0,
    },
    alertThreshold: {
      type: Number,
      default: 80, // send alert when spent reaches X% of budget
      min: 10,
      max: 100,
    },
    alertSent: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

budgetSchema.pre("validate", function (next) {
  if (this.startDate && this.endDate && this.startDate >= this.endDate) {
    return next(new Error("End date must be after start date"));
  }
  next();
});

// Index for quick user+category budget lookups and active budget queries
budgetSchema.index({ user: 1, category: 1 });
budgetSchema.index({ user: 1, startDate: 1, endDate: 1 });

// Virtual: remaining budget
budgetSchema.virtual("remaining").get(function () {
  return this.amount - this.spent;
});

// Virtual: percentage used
budgetSchema.virtual("percentUsed").get(function () {
  return Math.min(((this.spent / this.amount) * 100).toFixed(1), 100);
});

budgetSchema.set("toJSON", { virtuals: true });
budgetSchema.set("toObject", { virtuals: true });

export const Budget = mongoose.model("Budget", budgetSchema);
