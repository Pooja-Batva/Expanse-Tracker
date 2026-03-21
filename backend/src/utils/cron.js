import cron from "node-cron";
import { User } from "../models/User.model.js";
import { Transaction } from "../models/Transaction.model.js";
import { Budget } from "../models/Budget.model.js";
import { sendMonthlyReportEmail, sendEmail } from "./email.js";
import logger from "./logger.js";

// ─── Monthly Report — runs at 08:00 on the 1st of every month ───────────────

export const scheduleMonthlyReports = () => {
  cron.schedule("0 8 1 * *", async () => {
    logger.info("⏰ Cron: sending monthly expense reports…");

    try {
      const users = await User.find({ isVerified: true }).select("name email");

      // Previous month's date range
      const now = new Date();
      const firstOfPrevMonth = new Date(
        now.getFullYear(),
        now.getMonth() - 1,
        1,
      );
      const lastOfPrevMonth = new Date(
        now.getFullYear(),
        now.getMonth(),
        0,
        23,
        59,
        59,
        999,
      );

      const monthName = firstOfPrevMonth.toLocaleString("default", {
        month: "long",
      });
      const year = firstOfPrevMonth.getFullYear();

      for (const user of users) {
        try {
          // Income / Expense totals
          const totals = await Transaction.aggregate([
            {
              $match: {
                user: user._id,
                date: { $gte: firstOfPrevMonth, $lte: lastOfPrevMonth },
              },
            },
            {
              $group: {
                _id: "$type",
                total: { $sum: "$amount" },
              },
            },
          ]);

          const income = totals.find((t) => t._id === "income")?.total || 0;
          const expense = totals.find((t) => t._id === "expense")?.total || 0;

          // Top categories by spending
          const topCategories = await Transaction.aggregate([
            {
              $match: {
                user: user._id,
                type: "expense",
                date: { $gte: firstOfPrevMonth, $lte: lastOfPrevMonth },
              },
            },
            { $group: { _id: "$category", total: { $sum: "$amount" } } },
            { $sort: { total: -1 } },
            { $limit: 5 },
            {
              $lookup: {
                from: "categories",
                localField: "_id",
                foreignField: "_id",
                as: "cat",
              },
            },
            { $unwind: "$cat" },
            { $project: { _id: 0, name: "$cat.name", total: 1 } },
          ]);

          // Only send if user had any activity
          if (income > 0 || expense > 0) {
            await sendMonthlyReportEmail(user.email, user.name, {
              month: monthName,
              year,
              totalIncome: income,
              totalExpense: expense,
              net: income - expense,
              topCategories,
            });
          }
        } catch (userErr) {
          logger.error(
            `Monthly report failed for ${user.email}: ${userErr.message}`,
          );
        }
      }

      logger.info("✅ Cron: monthly reports sent.");
    } catch (err) {
      logger.error(`Cron monthly report error: ${err.message}`);
    }
  });
};

// ─── Budget Alert Check — runs every hour ───────────────────────────────────

export const scheduleBudgetAlerts = () => {
  cron.schedule("0 * * * *", async () => {
    try {
      const now = new Date();

      // Find budgets where spent >= alertThreshold% and alert not yet sent
      const budgets = await Budget.find({
        startDate: { $lte: now },
        endDate: { $gte: now },
        alertSent: false,
        $expr: {
          $gte: [
            { $divide: ["$spent", "$amount"] },
            { $divide: ["$alertThreshold", 100] },
          ],
        },
      })
        .populate("user", "name email")
        .populate("category", "name");

      for (const budget of budgets) {
        const percentUsed = ((budget.spent / budget.amount) * 100).toFixed(1);

        const html = `
          <h2 style="color:#EF4444;">Budget Alert 🚨</h2>
          <p>Hi <strong>${budget.user.name}</strong>,</p>
          <p>You have used <strong>${percentUsed}%</strong> of your 
          <strong>${budget.category.name}</strong> budget 
          (₹${budget.spent.toFixed(2)} of ₹${budget.amount.toFixed(2)}).</p>
          <p>Budget period: ${budget.startDate.toDateString()} – ${budget.endDate.toDateString()}</p>
        `;

        await sendEmail({
          to: budget.user.email,
          subject: `Budget Alert: ${budget.category.name} is ${percentUsed}% used`,
          html,
        });

        budget.alertSent = true;
        await budget.save();

        logger.info(
          `Budget alert sent to ${budget.user.email} for category ${budget.category.name}`,
        );
      }
    } catch (err) {
      logger.error(`Budget alert cron error: ${err.message}`);
    }
  });
};
