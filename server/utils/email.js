import nodemailer from "nodemailer";
import env from "../config/env.js";

let transporter = null;

const hasSmtpConfig = () =>
  Boolean(env.smtpHost && env.smtpPort && env.smtpUser && env.smtpPass);

const escapeHtml = (value = "") =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");

const getTransporter = () => {
  if (transporter) return transporter;
  if (!hasSmtpConfig()) return null;

  transporter = nodemailer.createTransport({
    host: env.smtpHost,
    port: env.smtpPort,
    secure: env.smtpPort === 465,
    auth: {
      user: env.smtpUser,
      pass: env.smtpPass,
    },
  });

  return transporter;
};

const throwMissingSmtpError = (purpose) => {
  const error = new Error(`SMTP email is not configured for ${purpose}.`);
  error.statusCode = 502;
  throw error;
};

const isSmtpThrottleError = (error) => {
  const code = String(error?.code || "").toUpperCase();
  const responseCode = Number(error?.responseCode || 0);
  const statusCode = Number(error?.statusCode || 0);
  const message = String(error?.message || "").toLowerCase();
  const response = String(error?.response || "").toLowerCase();

  if (code === "ETIMEDOUT" || code === "ECONNECTION") return false;

  return (
    responseCode === 429 ||
    statusCode === 429 ||
    code === "ETHROTTLE" ||
    code === "ERATELIMIT" ||
    message.includes("rate limit") ||
    message.includes("too many") ||
    response.includes("rate limit") ||
    response.includes("too many")
  );
};

export const sendPasswordResetEmail = async ({ toEmail, name, resetUrl }) => {
  const mailer = getTransporter();

  if (!mailer) {
    if (env.nodeEnv !== "development") {
      throwMissingSmtpError("password reset emails");
    }

    // Development fallback when SMTP isn't configured.
    // eslint-disable-next-line no-console
    console.log(`[PASSWORD_RESET_LINK] ${toEmail}: ${resetUrl}`);
    return;
  }

  try {
    await mailer.sendMail({
      from: env.smtpFrom || env.smtpUser,
      to: toEmail,
      subject: "Reset your password",
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.6;color:#0f172a;max-width:580px;margin:0 auto;border:1px solid #e2e8f0;border-radius:8px;padding:24px">
          <h2 style="margin:0 0 8px 0">Reset your password</h2>
          <p style="margin:0 0 12px 0">Hello ${name || "there"},</p>
          <p style="margin:0 0 18px 0">We received a request to reset your account password.</p>
          <p style="margin:0 0 18px 0">
            <a href="${resetUrl}" style="display:inline-block;padding:10px 16px;background:#0959a4;color:#fff;text-decoration:none;border-radius:6px;font-weight:600">
              Reset Password
            </a>
          </p>
          <p style="margin:0 0 8px 0;font-size:12px;color:#64748b">This reset link expires in 1 hour.</p>
          <p style="margin:0;font-size:12px;color:#64748b">If you did not request this, you can ignore this email safely.</p>
        </div>
      `,
    });
  } catch (error) {
    if (env.emailDebugLog) {
      // eslint-disable-next-line no-console
      console.error("[EMAIL_DEBUG] password reset provider error", {
        toEmail,
        message: error?.message || "Unknown error",
        response: error?.response || null,
        code: error?.code || null,
      });
    }

    if (isSmtpThrottleError(error)) {
      const wrappedError = new Error("Email provider is rate limiting requests. Please try again in 60 seconds.");
      wrappedError.statusCode = 429;
      wrappedError.retryAfter = 60;
      throw wrappedError;
    }

    const wrappedError = new Error("Failed to send password reset email.");
    wrappedError.statusCode = 502;
    throw wrappedError;
  }
};

export const sendContactReplyEmail = async ({
  toEmail,
  customerName,
  inquirySubject,
  inquiryMessage,
  replyMessage,
}) => {
  const mailer = getTransporter();

  if (!mailer) {
    if (env.nodeEnv !== "development") {
      throwMissingSmtpError("contact reply emails");
    }

    // Development fallback when SMTP isn't configured.
    // eslint-disable-next-line no-console
    console.log(
      `[CONTACT_REPLY] ${toEmail}: subject=${inquirySubject} reply=${replyMessage.replace(/\s+/g, " ").trim()}`
    );
    return;
  }

  try {
    const safeName = escapeHtml(customerName || "there");
    const safeSubject = escapeHtml(inquirySubject || "Inquiry");
    const safeInquiryMessage = escapeHtml(inquiryMessage || "(No original message)");
    const safeReply = escapeHtml(replyMessage || "");

    await mailer.sendMail({
      from: env.smtpFrom || env.smtpUser,
      to: toEmail,
      subject: `Re: ${inquirySubject || "Inquiry"}`,
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.6;color:#0f172a;max-width:620px;margin:0 auto;border:1px solid #e2e8f0;border-radius:8px;padding:24px">
          <h2 style="margin:0 0 12px 0">Response to your inquiry</h2>
          <p style="margin:0 0 14px 0">Hello ${safeName},</p>
          <p style="margin:0 0 14px 0">Thank you for contacting us. Our team has replied below:</p>
          <div style="margin:0 0 16px 0;padding:14px;border-radius:6px;background:#eff6ff;border:1px solid #bfdbfe;white-space:pre-wrap">${safeReply}</div>
          <p style="margin:0 0 10px 0;font-size:13px;color:#475569"><strong>Original subject:</strong> ${safeSubject}</p>
          <div style="margin:0;padding:12px;border-radius:6px;background:#f8fafc;border:1px solid #e2e8f0;white-space:pre-wrap;font-size:13px;color:#334155">${safeInquiryMessage}</div>
        </div>
      `,
    });
  } catch (error) {
    if (env.emailDebugLog) {
      // eslint-disable-next-line no-console
      console.error("[EMAIL_DEBUG] contact reply provider error", {
        toEmail,
        message: error?.message || "Unknown error",
        response: error?.response || null,
        code: error?.code || null,
      });
    }

    if (isSmtpThrottleError(error)) {
      const wrappedError = new Error("Email provider is rate limiting requests. Please try again in 60 seconds.");
      wrappedError.statusCode = 429;
      wrappedError.retryAfter = 60;
      throw wrappedError;
    }

    const wrappedError = new Error("Failed to send reply email.");
    wrappedError.statusCode = 502;
    throw wrappedError;
  }
};
