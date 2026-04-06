import asyncHandler from "express-async-handler";
import supabase from "../config/supabase.js";
import {
  syncNewsletterContactToBrevo,
  syncNewsletterUnsubscribeInBrevo,
} from "../services/brevoService.js";

const TABLE_NAME = "newsletter_subscribers";
const SUBSCRIBER_SELECT = "id, email, status, user_id, source, subscribed_at, unsubscribed_at, created_at, updated_at";

const isMissingRelationError = (message = "") => {
  const normalized = String(message).toLowerCase();
  return normalized.includes("could not find") && (normalized.includes("relation") || normalized.includes("table"));
};

const mapSubscriber = (row = {}) => ({
  id: row.id,
  email: row.email,
  status: row.status,
  source: row.source,
  userId: row.user_id || null,
  subscribedAt: row.subscribed_at || null,
  unsubscribedAt: row.unsubscribed_at || null,
  createdAt: row.created_at || null,
  updatedAt: row.updated_at || null,
});

const tryBrevoSync = async ({ email, source, userId }) => {
  try {
    const syncResult = await syncNewsletterContactToBrevo({ email, source, userId });
    return {
      synced: Boolean(syncResult?.synced),
      skipped: Boolean(syncResult?.skipped),
    };
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn("[newsletter] Brevo sync failed", error?.message || error);
    return {
      synced: false,
      skipped: false,
    };
  }
};

const tryBrevoUnsubscribe = async ({ email }) => {
  try {
    const syncResult = await syncNewsletterUnsubscribeInBrevo({ email });
    return {
      synced: Boolean(syncResult?.synced),
      skipped: Boolean(syncResult?.skipped),
    };
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn("[newsletter] Brevo unsubscribe failed", error?.message || error);
    return {
      synced: false,
      skipped: false,
    };
  }
};

export const subscribeNewsletter = asyncHandler(async (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  const source = String(req.body.source || "website").trim().slice(0, 100) || "website";
  const userId = req.user?.id || null;

  if (!email) {
    res.status(400);
    throw new Error("Email is required");
  }

  const { data: existing, error: existingError } = await supabase
    .from(TABLE_NAME)
    .select(SUBSCRIBER_SELECT)
    .eq("email", email)
    .maybeSingle();

  if (existingError) {
    if (isMissingRelationError(existingError.message)) {
      res.status(400);
      throw new Error("Run the latest schema SQL to enable newsletter subscribers table");
    }
    res.status(500);
    throw new Error(existingError.message);
  }

  if (existing?.status === "active") {
    return res.status(200).json({
      status: "already_subscribed",
      message: "You are already subscribed",
      subscriber: mapSubscriber(existing),
    });
  }

  if (existing) {
    const { data: updated, error: updateError } = await supabase
      .from(TABLE_NAME)
      .update({
        status: "active",
        subscribed_at: new Date().toISOString(),
        unsubscribed_at: null,
        source,
        user_id: existing.user_id || userId,
      })
      .eq("id", existing.id)
      .select(SUBSCRIBER_SELECT)
      .single();

    if (updateError) {
      res.status(500);
      throw new Error(updateError.message);
    }

    const brevo = await tryBrevoSync({ email, source, userId: updated.user_id || userId });

    return res.status(200).json({
      status: "subscribed",
      message: "Subscribed successfully!",
      subscriber: mapSubscriber(updated),
      brevo,
    });
  }

  const { data: created, error: insertError } = await supabase
    .from(TABLE_NAME)
    .insert({
      email,
      source,
      status: "active",
      user_id: userId,
      unsubscribed_at: null,
    })
    .select(SUBSCRIBER_SELECT)
    .single();

  if (insertError) {
    if (String(insertError.code || "") === "23505") {
      return res.status(200).json({
        status: "already_subscribed",
        message: "You are already subscribed",
      });
    }

    if (isMissingRelationError(insertError.message)) {
      res.status(400);
      throw new Error("Run the latest schema SQL to enable newsletter subscribers table");
    }

    res.status(500);
    throw new Error(insertError.message);
  }

  const brevo = await tryBrevoSync({ email, source, userId });

  res.status(201).json({
    status: "subscribed",
    message: "Subscribed successfully!",
    subscriber: mapSubscriber(created),
    brevo,
  });
});

export const unsubscribeNewsletter = asyncHandler(async (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();

  if (!email) {
    res.status(400);
    throw new Error("Email is required");
  }

  const { data: existing, error: existingError } = await supabase
    .from(TABLE_NAME)
    .select(SUBSCRIBER_SELECT)
    .eq("email", email)
    .maybeSingle();

  if (existingError) {
    if (isMissingRelationError(existingError.message)) {
      res.status(400);
      throw new Error("Run the latest schema SQL to enable newsletter subscribers table");
    }
    res.status(500);
    throw new Error(existingError.message);
  }

  if (!existing || existing.status === "unsubscribed") {
    const brevo = await tryBrevoUnsubscribe({ email });
    return res.status(200).json({
      status: "already_unsubscribed",
      message: "You are already unsubscribed",
      brevo,
    });
  }

  const { data: updated, error: updateError } = await supabase
    .from(TABLE_NAME)
    .update({
      status: "unsubscribed",
      unsubscribed_at: new Date().toISOString(),
    })
    .eq("id", existing.id)
    .select(SUBSCRIBER_SELECT)
    .single();

  if (updateError) {
    res.status(500);
    throw new Error(updateError.message);
  }

  const brevo = await tryBrevoUnsubscribe({ email });

  res.status(200).json({
    status: "unsubscribed",
    message: "Unsubscribed successfully",
    subscriber: mapSubscriber(updated),
    brevo,
  });
});
