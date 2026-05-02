import env from "../config/env.js";
import { isSmtpConfigured, sendSmtpEmail } from "../utils/email.js";

const BREVO_SEND_URL = "https://api.brevo.com/v3/smtp/email";

const isRestApiKey = (key) => String(key || "").trim().startsWith("xkeysib-");

const parseResponsePayload = async (response) => {
  const responseText = await response.text();
  if (!responseText) return null;

  try {
    return JSON.parse(responseText);
  } catch {
    return responseText;
  }
};

const resolveSender = () => {
  const email = env.brevoSenderEmail || env.smtpFrom || env.smtpUser;
  const name = env.brevoSenderName || env.orderEmailBrandName || "Woodmart.lk";

  if (!email) {
    const error = new Error("Brevo sender email is not configured");
    error.statusCode = 502;
    throw error;
  }

  return { email, name };
};

export const sendBrevoTransactionalEmail = async ({
  toEmail,
  toName,
  subject,
  htmlContent,
  tag = "transactional",
  logContext = "brevo_transactional",
}) => {
  // Use SMTP fallback when the configured key is not a v3 REST key.
  if (!isRestApiKey(env.brevoApiKey)) {
    if (!isSmtpConfigured()) {
      const error = new Error(
        "Email is not configured: provide a Brevo v3 REST API key (xkeysib-...) or SMTP credentials"
      );
      error.statusCode = 502;
      throw error;
    }

    // eslint-disable-next-line no-console
    console.log(
      "[EMAIL_PROVIDER]",
      JSON.stringify({
        event: "smtp_fallback_attempt",
        context: logContext,
        toEmail,
        tag,
        reason: env.brevoApiKey ? "non_rest_key" : "missing_key",
        timestamp: new Date().toISOString(),
      })
    );

    try {
      const result = await sendSmtpEmail({ toEmail, toName, subject, htmlContent });
      // eslint-disable-next-line no-console
      console.log(
        "[EMAIL_PROVIDER]",
        JSON.stringify({
          event: "smtp_fallback_success",
          context: logContext,
          toEmail,
          tag,
          messageId: result?.messageId || null,
          timestamp: new Date().toISOString(),
        })
      );
      return { messageId: result?.messageId || null, transport: "smtp" };
    } catch (smtpError) {
      // eslint-disable-next-line no-console
      console.error(
        "[EMAIL_PROVIDER]",
        JSON.stringify({
          event: "smtp_fallback_failed",
          context: logContext,
          toEmail,
          tag,
          message: smtpError?.message || "Unknown error",
          code: smtpError?.code || null,
          response: smtpError?.response || null,
          timestamp: new Date().toISOString(),
        })
      );
      const error = new Error("Failed to send transactional email via SMTP");
      error.statusCode = 502;
      throw error;
    }
  }

  const sender = resolveSender();

  // eslint-disable-next-line no-console
  console.log(
    "[EMAIL_PROVIDER]",
    JSON.stringify({
      event: "send_attempt",
      context: logContext,
      provider: "brevo_api",
      toEmail,
      tag,
      timestamp: new Date().toISOString(),
    })
  );

  const response = await fetch(BREVO_SEND_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "api-key": env.brevoApiKey,
    },
    body: JSON.stringify({
      sender,
      to: [
        {
          email: String(toEmail || "").trim(),
          name: String(toName || "").trim() || undefined,
        },
      ],
      subject,
      htmlContent,
      tags: [tag],
    }),
  });

  const providerPayload = await parseResponsePayload(response);

  if (!response.ok) {
    // eslint-disable-next-line no-console
    console.error(
      "[EMAIL_PROVIDER]",
      JSON.stringify({
        event: "send_failed",
        context: logContext,
        provider: "brevo_api",
        toEmail,
        tag,
        status: response.status,
        providerPayload,
        timestamp: new Date().toISOString(),
      })
    );

    if (isSmtpConfigured()) {
      try {
        const result = await sendSmtpEmail({ toEmail, toName, subject, htmlContent });
        // eslint-disable-next-line no-console
        console.log(
          "[EMAIL_PROVIDER]",
          JSON.stringify({
            event: "smtp_fallback_success",
            context: logContext,
            toEmail,
            tag,
            messageId: result?.messageId || null,
            timestamp: new Date().toISOString(),
          })
        );
        return { messageId: result?.messageId || null, transport: "smtp" };
      } catch (smtpError) {
        // eslint-disable-next-line no-console
        console.error(
          "[EMAIL_PROVIDER]",
          JSON.stringify({
            event: "smtp_fallback_failed",
            context: logContext,
            toEmail,
            tag,
            message: smtpError?.message || "Unknown error",
            code: smtpError?.code || null,
            timestamp: new Date().toISOString(),
          })
        );
      }
    }

    const error = new Error("Failed to send transactional email");
    error.statusCode = response.status >= 500 ? 502 : response.status;
    error.providerStatus = response.status;
    error.providerPayload = providerPayload;
    throw error;
  }

  // eslint-disable-next-line no-console
  console.log(
    "[EMAIL_PROVIDER]",
    JSON.stringify({
      event: "send_success",
      context: logContext,
      provider: "brevo_api",
      toEmail,
      tag,
      status: response.status,
      providerPayload,
      timestamp: new Date().toISOString(),
    })
  );

  return providerPayload;
};
