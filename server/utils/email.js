import nodemailer from "nodemailer";
import env from "../config/env.js";

let transporter = null;

const hasSmtpConfig = () =>
  Boolean(env.smtpHost && env.smtpPort && env.smtpUser && env.smtpPass);

const isSmtpThrottleError = (error) => {
  const message = String(error?.message || "").toLowerCase();
  const response = String(error?.response || "").toLowerCase();

  return (
    message.includes("too many emails") ||
    message.includes("rate limit") ||
    response.includes("too many emails") ||
    response.includes("rate limit") ||
    response.includes("5.7.0")
  );
};

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

export const sendVerificationEmail = async ({ toEmail, name, verificationUrl }) => {
  const mailer = getTransporter();

  if (!mailer) {
    // Development fallback when SMTP isn't configured.
    // eslint-disable-next-line no-console
    console.log(`[EMAIL_VERIFICATION_LINK] ${toEmail}: ${verificationUrl}`);
    return;
  }

  try {
    const sendResult = await mailer.sendMail({
      from: env.smtpFrom || env.smtpUser,
      to: toEmail,
      subject: "Verify your email",
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.6;color:#0f172a;max-width:580px;margin:0 auto;border:1px solid #e2e8f0;border-radius:8px;padding:24px">
          <h2 style="margin:0 0 8px 0">Verify your email</h2>
          <p style="margin:0 0 12px 0">Hello ${name || "there"},</p>
          <p style="margin:0 0 18px 0">Thanks for registering. Please verify your email before logging in.</p>
          <p style="margin:0 0 18px 0">
            <a href="${verificationUrl}" style="display:inline-block;padding:10px 16px;background:#0959a4;color:#fff;text-decoration:none;border-radius:6px;font-weight:600">
              Verify your email
            </a>
          </p>
          <p style="margin:0 0 8px 0;font-size:12px;color:#64748b">This verification link expires in 1 hour.</p>
          <p style="margin:0;font-size:12px;color:#64748b">If you did not create this account, you can ignore this email.</p>
        </div>
      `,
    });

    if (env.emailDebugLog) {
      // Temporary diagnostics to correlate app sends with Brevo transactional logs.
      // eslint-disable-next-line no-console
      console.log(
        "[EMAIL_DEBUG] verification sent",
        JSON.stringify({
          provider: "brevo-smtp",
          recipient: toEmail,
          messageId: sendResult?.messageId || null,
          envelope: sendResult?.envelope || null,
          accepted: sendResult?.accepted || [],
          rejected: sendResult?.rejected || [],
          response: sendResult?.response || null,
          timestamp: new Date().toISOString(),
        })
      );
    }
  } catch (error) {
    if (isSmtpThrottleError(error)) {
      const wrappedError = new Error("Email provider is rate limiting requests. Please try again in 60 seconds.");
      wrappedError.statusCode = 429;
      wrappedError.retryAfter = 60;
      throw wrappedError;
    }

    const wrappedError = new Error("Failed to send verification email.");
    wrappedError.statusCode = 502;
    throw wrappedError;
  }
};
