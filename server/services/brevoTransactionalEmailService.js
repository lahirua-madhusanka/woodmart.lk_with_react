import env from "../config/env.js";
import nodemailer from "nodemailer";

const BREVO_SEND_URL = "https://api.brevo.com/v3/smtp/email";

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

const hasSmtpConfig = () =>
  Boolean(env.smtpHost && env.smtpPort && env.smtpUser && env.smtpPass);

const sendSmtpTransactionalEmail = async ({
  toEmail,
  toName,
  subject,
  htmlContent,
  tag,
  logContext,
}) => {
  if (!hasSmtpConfig()) {
    const error = new Error("SMTP is not configured for transactional email fallback");
    error.statusCode = 502;
    throw error;
  }

  const sender = resolveSender();
  const transporter = nodemailer.createTransport({
    host: env.smtpHost,
    port: env.smtpPort,
    secure: env.smtpPort === 465,
    auth: {
      user: env.smtpUser,
      pass: env.smtpPass,
    },
  });

  // eslint-disable-next-line no-console
  console.log(
    "[EMAIL_PROVIDER]",
    JSON.stringify({
      event: "send_attempt",
      context: logContext,
      provider: "smtp",
      toEmail,
      tag,
      timestamp: new Date().toISOString(),
    })
  );

  const info = await transporter.sendMail({
    from: {
      name: sender.name,
      address: sender.email,
    },
    to: {
      name: String(toName || "").trim() || undefined,
      address: String(toEmail || "").trim(),
    },
    subject,
    html: htmlContent,
  });

  // eslint-disable-next-line no-console
  console.log(
    "[EMAIL_PROVIDER]",
    JSON.stringify({
      event: "send_success",
      context: logContext,
      provider: "smtp",
      toEmail,
      tag,
      messageId: info?.messageId || null,
      timestamp: new Date().toISOString(),
    })
  );

  return {
    provider: "smtp",
    messageId: info?.messageId || null,
  };
};

export const sendBrevoTransactionalEmail = async ({
  toEmail,
  toName,
  subject,
  htmlContent,
  tag = "transactional",
  logContext = "brevo_transactional",
}) => {
  if (!env.brevoApiKey) {
    // eslint-disable-next-line no-console
    console.warn(
      "[EMAIL_PROVIDER]",
      JSON.stringify({
        event: "brevo_missing_key_using_smtp_fallback",
        context: logContext,
        toEmail,
        tag,
        timestamp: new Date().toISOString(),
      })
    );

    return sendSmtpTransactionalEmail({
      toEmail,
      toName,
      subject,
      htmlContent,
      tag,
      logContext,
    });
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

  let response;
  try {
    response = await fetch(BREVO_SEND_URL, {
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
  } catch (fetchError) {
    // eslint-disable-next-line no-console
    console.error(
      "[EMAIL_PROVIDER]",
      JSON.stringify({
        event: "send_failed_network",
        context: logContext,
        provider: "brevo_api",
        toEmail,
        tag,
        message: fetchError?.message || "Unknown error",
        timestamp: new Date().toISOString(),
      })
    );

    return sendSmtpTransactionalEmail({
      toEmail,
      toName,
      subject,
      htmlContent,
      tag,
      logContext,
    });
  }

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

    if (hasSmtpConfig()) {
      // eslint-disable-next-line no-console
      console.warn(
        "[EMAIL_PROVIDER]",
        JSON.stringify({
          event: "brevo_failed_using_smtp_fallback",
          context: logContext,
          toEmail,
          tag,
          providerStatus: response.status,
          timestamp: new Date().toISOString(),
        })
      );

      return sendSmtpTransactionalEmail({
        toEmail,
        toName,
        subject,
        htmlContent,
        tag,
        logContext,
      });
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
