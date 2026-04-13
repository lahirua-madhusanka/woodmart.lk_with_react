import env from "../config/env.js";
import nodemailer from "nodemailer";

const BREVO_SEND_URL = "https://api.brevo.com/v3/smtp/email";

const buildVerificationEmailHtml = ({ name, verificationUrl, expiresInHours }) => {
  const safeName = String(name || "there");
  const safeUrl = String(verificationUrl || "");
  const brandName = "Woodmart.lk";

  return `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#0f172a;max-width:620px;margin:0 auto;border:1px solid #e2e8f0;border-radius:10px;padding:24px;background:#ffffff">
      <p style="margin:0 0 8px 0;font-size:12px;letter-spacing:0.12em;text-transform:uppercase;color:#64748b">${brandName}</p>
      <h2 style="margin:0 0 10px 0;font-size:24px;color:#0f172a">Verify your email</h2>
      <p style="margin:0 0 14px 0">Hello ${safeName},</p>
      <p style="margin:0 0 18px 0">Thanks for creating your account. Please verify your email address to activate login access.</p>
      <p style="margin:0 0 18px 0">
        <a href="${safeUrl}" style="display:inline-block;padding:11px 18px;background:#0959a4;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:600">
          Verify Email
        </a>
      </p>
      <p style="margin:0 0 10px 0;font-size:13px;color:#475569">If the button does not work, copy and paste this link into your browser:</p>
      <p style="margin:0 0 16px 0;font-size:13px;word-break:break-all;color:#0f172a">${safeUrl}</p>
      <p style="margin:0;font-size:12px;color:#64748b">This link expires in ${expiresInHours} hour(s). If you did not register, you can ignore this email.</p>
    </div>
  `;
};

const logBrevo = (event, payload = {}) => {
  // eslint-disable-next-line no-console
  console.log(
    "[BREVO_VERIFICATION]",
    JSON.stringify({
      event,
      timestamp: new Date().toISOString(),
      ...payload,
    })
  );
};

const hasSmtpConfig = () =>
  Boolean(env.smtpHost && env.smtpPort && env.smtpUser && env.smtpPass);

const sendVerificationEmailViaSmtp = async ({ toEmail, name, verificationUrl, expiresInHours }) => {
  if (!hasSmtpConfig()) {
    const error = new Error("Verification email provider is not configured");
    error.statusCode = 502;
    throw error;
  }

  const senderEmail = env.brevoSenderEmail || env.smtpFrom || env.smtpUser;
  const senderName = env.brevoSenderName || "Woodmart.lk";

  const transporter = nodemailer.createTransport({
    host: env.smtpHost,
    port: env.smtpPort,
    secure: env.smtpPort === 465,
    auth: {
      user: env.smtpUser,
      pass: env.smtpPass,
    },
  });

  await transporter.sendMail({
    from: {
      name: senderName,
      address: senderEmail,
    },
    to: toEmail,
    subject: "Verify your email",
    html: buildVerificationEmailHtml({
      name,
      verificationUrl,
      expiresInHours,
    }),
  });

  logBrevo("smtp_send_success", {
    toEmail,
    provider: "smtp",
  });

  return { provider: "smtp" };
};

export const sendVerificationEmail = async ({ toEmail, name, verificationUrl, expiresInHours = 1 }) => {
  if (!env.brevoApiKey) {
    logBrevo("brevo_not_configured_using_smtp", { toEmail });
    return sendVerificationEmailViaSmtp({ toEmail, name, verificationUrl, expiresInHours });
  }

  const senderEmail = env.brevoSenderEmail || env.smtpFrom || env.smtpUser;
  if (!senderEmail) {
    logBrevo("brevo_sender_missing_using_smtp", { toEmail });
    return sendVerificationEmailViaSmtp({ toEmail, name, verificationUrl, expiresInHours });
  }

  const payload = {
    sender: {
      email: senderEmail,
      name: env.brevoSenderName || "Woodmart.lk",
    },
    to: [
      {
        email: String(toEmail || "").trim(),
        name: String(name || "").trim() || undefined,
      },
    ],
    subject: "Verify your email",
    htmlContent: buildVerificationEmailHtml({
      name,
      verificationUrl,
      expiresInHours,
    }),
  };

  logBrevo("send_attempt", {
    toEmail,
    provider: "brevo_api",
  });

  let response;
  try {
    response = await fetch(BREVO_SEND_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": env.brevoApiKey,
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    logBrevo("send_network_failed_using_smtp", {
      toEmail,
      message: error?.message || "Unknown error",
    });
    return sendVerificationEmailViaSmtp({ toEmail, name, verificationUrl, expiresInHours });
  }

  const responseText = await response.text();
  let parsed = null;
  try {
    parsed = responseText ? JSON.parse(responseText) : null;
  } catch {
    parsed = null;
  }

  if (!response.ok) {
    logBrevo("send_failed", {
      toEmail,
      status: response.status,
      body: parsed || responseText || null,
    });

    if (hasSmtpConfig()) {
      logBrevo("send_failed_using_smtp_fallback", {
        toEmail,
        status: response.status,
      });
      return sendVerificationEmailViaSmtp({ toEmail, name, verificationUrl, expiresInHours });
    }

    const error = new Error("Failed to send verification email");
    error.statusCode = response.status >= 500 ? 502 : response.status;
    error.providerStatus = response.status;
    error.providerBody = parsed || responseText || null;
    throw error;
  }

  logBrevo("send_success", {
    toEmail,
    status: response.status,
    messageId: parsed?.messageId || null,
    response: parsed || null,
  });

  return parsed;
};
