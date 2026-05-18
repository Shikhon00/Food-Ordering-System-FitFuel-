import nodemailer from "nodemailer";

// Helper for detecting unchanged .env placeholder values.
const isPlaceholderValue = (value = "") =>
  !value ||
  value.includes("your_email@gmail.com") ||
  value.includes("your_app_password");

const smtpUser = (process.env.SMTP_USER || "").trim();
const smtpPass = (process.env.SMTP_PASS || "").replace(/\s+/g, "");
const mailFrom = (process.env.MAIL_FROM || "").trim();
const resolvedMailFrom = isPlaceholderValue(mailFrom) ? smtpUser : mailFrom;

// Nodemailer transporter is configured once and reused for OTP/order emails.
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: Number(process.env.SMTP_PORT || 465),
  secure: String(process.env.SMTP_SECURE || "true") === "true",
  auth: {
    user: smtpUser,
    pass: smtpPass,
  },
});

// Sends HTML emails. Used for password reset OTP and order confirmation.
export const sendEmail = async ({ to, subject, html }) => {
  // Clear message for demo setup if SMTP credentials are missing.
  if (isPlaceholderValue(smtpUser) || isPlaceholderValue(smtpPass)) {
    throw new Error("Email service is not configured. Update SMTP_USER and SMTP_PASS in backend/.env.");
  }

  return transporter.sendMail({
    from: resolvedMailFrom,
    to,
    subject,
    html,
  });
};

export default transporter;
