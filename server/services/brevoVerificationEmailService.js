import env from "../config/env.js";
import { isSmtpConfigured, sendSmtpEmail } from "../utils/email.js";

const BREVO_SEND_URL = "https://api.brevo.com/v3/smtp/email";

const isRestApiKey = (key) => {
  const value = String(key || "").trim();
  return value.startsWith("xkeysib-");
};

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

export const sendVerificationEmail = async ({ toEmail, name, verificationUrl, expiresInHours = 1 }) => {
  const subject = "Verify your email";
  const htmlContent = buildVerificationEmailHtml({ name, verificationUrl, expiresInHours });

  // If the configured Brevo key is not a v3 REST key (e.g. xsmtpsib-...),
  // skip the API call and use SMTP directly. The REST endpoint only accepts
  // xkeysib-... keys.
  if (!isRestApiKey(env.brevoApiKey)) {
    if (!isSmtpConfigured()) {
      const error = new Error(
        "Email is not configured: provide a Brevo v3 REST API key (xkeysib-...) or SMTP credentials"
      );
      error.statusCode = 502;
      throw error;
    }

    logBrevo("smtp_fallback_attempt", { toEmail, reason: env.brevoApiKey ? "non_rest_key" : "missing_key" });
    try {
      const result = await sendSmtpEmail({ toEmail, toName: name, subject, htmlContent });
      logBrevo("smtp_fallback_success", { toEmail, messageId: result?.messageId || null });
      return { messageId: result?.messageId || null, transport: "smtp" };
    } catch (smtpError) {
      logBrevo("smtp_fallback_failed", {
        toEmail,
        message: smtpError?.message || "Unknown error",
        code: smtpError?.code || null,
        response: smtpError?.response || null,
      });
      const error = new Error("Failed to send verification email via SMTP");
      error.statusCode = 502;
      throw error;
    }
  }

  const senderEmail = env.brevoSenderEmail || env.smtpFrom || env.smtpUser;
  if (!senderEmail) {
    const error = new Error("Brevo sender email is not configured");
    error.statusCode = 502;
    throw error;
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
    subject,
    htmlContent,
  };

  logBrevo("send_attempt", { toEmail, provider: "brevo_api" });

  const response = await fetch(BREVO_SEND_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": env.brevoApiKey,
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  });

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

    if (isSmtpConfigured()) {
      logBrevo("smtp_fallback_attempt", { toEmail, reason: `rest_status_${response.status}` });
      try {
        const result = await sendSmtpEmail({ toEmail, toName: name, subject, htmlContent });
        logBrevo("smtp_fallback_success", { toEmail, messageId: result?.messageId || null });
        return { messageId: result?.messageId || null, transport: "smtp" };
      } catch (smtpError) {
        logBrevo("smtp_fallback_failed", {
          toEmail,
          message: smtpError?.message || "Unknown error",
          code: smtpError?.code || null,
        });
      }
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
