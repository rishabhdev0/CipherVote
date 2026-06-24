const nodemailer = require("nodemailer");
const prisma = require("../config/database");
const logger = require("../config/logger");

let transporter;
function getTransporter() {
  if (transporter) return transporter;
  if (!process.env.SMTP_HOST) return null;
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
    name: process.env.SMTP_HELO_NAME || "ciphervote.local",
  });
  return transporter;
}

const sendNotification = async ({ userId, type, title, message, metadata }) => {
  try {
    await prisma.notification.create({
      data: { userId, type, title, message, metadata: metadata || undefined },
    });
  } catch (e) {
    logger.warn(`Notification write failed: ${e.message}`);
  }
};

async function sendEmail({ to, subject, text, html }) {
  const tx = getTransporter();
  if (!tx) {
    if (process.env.NODE_ENV === "production")
      throw new Error("SMTP is not configured");
    logger.warn(`Email skipped because SMTP is not configured: ${subject}`);
    return { skipped: true };
  }
  return tx.sendMail({
    from: process.env.SMTP_FROM || "CipherVote <no-reply@ciphervote.local>",
    to,
    subject,
    text,
    html,
  });
}

async function sendOtpEmail({ to, otp, purpose, expiresMinutes }) {
  return sendEmail({
    to,
    subject: `CipherVote ${purpose} code`,
    text: `Your CipherVote ${purpose} code is ${otp}. It expires in ${expiresMinutes} minutes.`,
    html: `<p>Your CipherVote ${purpose} code is <strong>${otp}</strong>.</p><p>It expires in ${expiresMinutes} minutes.</p>`,
  });
}

module.exports = {
  sendNotification,
  sendInApp: sendNotification,
  sendEmail,
  sendOtpEmail,
};
