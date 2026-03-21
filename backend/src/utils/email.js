import nodemailer from "nodemailer";
import logger from "./logger.js";

const createTransporter = () =>
  nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

/**
 * Generic send-email helper.
 * @param {Object} options  - { to, subject, html, text? }
 */
export const sendEmail = async ({ to, subject, html, text }) => {
  const transporter = createTransporter();

  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to,
    subject,
    html,
    text: text || html.replace(/<[^>]+>/g, ""), // fallback plain-text
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    logger.info(`Email sent to ${to} — messageId: ${info.messageId}`);
    return info;
  } catch (err) {
    logger.error(`Failed to send email to ${to}: ${err.message}`);
    throw err;
  }
};

// ─── OTP email template ────────────────────────────────────────────────────

export const sendOtpEmail = async (to, otp, type = "verify") => {
  const subjects = {
    verify: "Verify your Expense Tracker account",
    reset: "Reset your Expense Tracker password",
    login: "Your Expense Tracker login OTP",
  };

  const actions = {
    verify: "verify your account",
    reset: "reset your password",
    login: "log in to your account",
  };

  const html = `
    <!DOCTYPE html>
    <html>
    <body style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:24px;">
      <h2 style="color:#4F46E5;">Expense Tracker</h2>
      <p>Use the OTP below to ${actions[type]}. It expires in <strong>${process.env.OTP_EXPIRES_MINUTES} minutes</strong>.</p>
      <div style="font-size:36px;font-weight:bold;letter-spacing:12px;color:#4F46E5;margin:24px 0;text-align:center;">
        ${otp}
      </div>
      <p style="color:#6B7280;font-size:13px;">If you did not request this, please ignore this email.</p>
    </body>
    </html>
  `;

  return sendEmail({ to, subject: subjects[type], html });
};

// ─── Monthly report email template ─────────────────────────────────────────

export const sendMonthlyReportEmail = async (to, name, report) => {
  const {
    month,
    year,
    totalIncome,
    totalExpense,
    net,
    topCategories,
    transactions,
  } = report;

  const categoryRows = topCategories
    .map(
      (c) => `<tr>
        <td style="padding:8px;border-bottom:1px solid #E5E7EB;">${c.name}</td>
        <td style="padding:8px;border-bottom:1px solid #E5E7EB;text-align:right;">₹${c.total.toFixed(2)}</td>
      </tr>`,
    )
    .join("");

  const html = `
    <!DOCTYPE html>
    <html>
    <body style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:24px;">
      <h2 style="color:#4F46E5;">Expense Tracker — Monthly Report</h2>
      <p>Hi <strong>${name}</strong>, here is your financial summary for <strong>${month} ${year}</strong>.</p>

      <table style="width:100%;border-collapse:collapse;margin:16px 0;">
        <tr style="background:#F3F4F6;">
          <td style="padding:12px;font-weight:bold;">Total Income</td>
          <td style="padding:12px;text-align:right;color:#10B981;font-weight:bold;">₹${totalIncome.toFixed(2)}</td>
        </tr>
        <tr>
          <td style="padding:12px;font-weight:bold;">Total Expense</td>
          <td style="padding:12px;text-align:right;color:#EF4444;font-weight:bold;">₹${totalExpense.toFixed(2)}</td>
        </tr>
        <tr style="background:#F3F4F6;">
          <td style="padding:12px;font-weight:bold;">Net Balance</td>
          <td style="padding:12px;text-align:right;font-weight:bold;color:${net >= 0 ? "#10B981" : "#EF4444"};">₹${net.toFixed(2)}</td>
        </tr>
      </table>

      <h3 style="color:#374151;">Top Spending Categories</h3>
      <table style="width:100%;border-collapse:collapse;">
        <thead>
          <tr style="background:#4F46E5;color:#fff;">
            <th style="padding:8px;text-align:left;">Category</th>
            <th style="padding:8px;text-align:right;">Amount</th>
          </tr>
        </thead>
        <tbody>${categoryRows}</tbody>
      </table>

      <p style="color:#6B7280;font-size:12px;margin-top:24px;">
        This is an automated report. Log in to your Expense Tracker for full details.
      </p>
    </body>
    </html>
  `;

  return sendEmail({
    to,
    subject: `Your ${month} ${year} Expense Report`,
    html,
  });
};
