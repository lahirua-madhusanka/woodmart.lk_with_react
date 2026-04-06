import env from "../config/env.js";

const BREVO_CONTACTS_ENDPOINT = "https://api.brevo.com/v3/contacts";

const isBrevoConfigured = () => Boolean(env.brevoApiKey && env.brevoNewsletterListId);

const buildHeaders = () => ({
  accept: "application/json",
  "content-type": "application/json",
  "api-key": env.brevoApiKey,
});

export const syncNewsletterContactToBrevo = async ({ email, source = "website", userId = null }) => {
  if (!isBrevoConfigured()) {
    return {
      synced: false,
      skipped: true,
      reason: "Brevo newsletter sync is not configured",
    };
  }

  const attributes = {
    SOURCE: source,
  };

  if (userId) {
    attributes.USER_ID = String(userId);
  }

  const response = await fetch(BREVO_CONTACTS_ENDPOINT, {
    method: "POST",
    headers: buildHeaders(),
    body: JSON.stringify({
      email,
      listIds: [env.brevoNewsletterListId],
      updateEnabled: true,
      attributes,
    }),
  });

  if (!response.ok) {
    const payloadText = await response.text();
    const error = new Error(`Brevo sync failed (${response.status}): ${payloadText || "Unknown error"}`);
    error.statusCode = response.status;
    throw error;
  }

  return {
    synced: true,
    skipped: false,
  };
};

export const syncNewsletterUnsubscribeInBrevo = async ({ email }) => {
  if (!isBrevoConfigured()) {
    return {
      synced: false,
      skipped: true,
      reason: "Brevo newsletter sync is not configured",
    };
  }

  const response = await fetch(`${BREVO_CONTACTS_ENDPOINT}/${encodeURIComponent(email)}`, {
    method: "PUT",
    headers: buildHeaders(),
    body: JSON.stringify({
      unlinkListIds: [env.brevoNewsletterListId],
      updateEnabled: true,
    }),
  });

  if (response.status === 404) {
    return {
      synced: true,
      skipped: false,
      notFound: true,
    };
  }

  if (!response.ok) {
    const payloadText = await response.text();
    const error = new Error(`Brevo unsubscribe failed (${response.status}): ${payloadText || "Unknown error"}`);
    error.statusCode = response.status;
    throw error;
  }

  return {
    synced: true,
    skipped: false,
  };
};
