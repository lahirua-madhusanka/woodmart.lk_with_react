import asyncHandler from "express-async-handler";
import supabase from "../config/supabase.js";
import { sendContactReplyEmail } from "../utils/email.js";

const CONTACT_STATUS = ["new", "read", "replied"];
const CONTACT_MESSAGE_SELECT =
  "id, user_id, first_name, last_name, email, subject, message, status, admin_reply, replied_at, replied_by, internal_note, created_at, updated_at";

const isMissingRelationError = (message = "") => {
  const normalized = String(message).toLowerCase();
  return normalized.includes("could not find") && (normalized.includes("relation") || normalized.includes("table"));
};

const mapContactMessage = (row = {}) => ({
  id: row.id,
  userId: row.user_id || null,
  firstName: row.first_name || "",
  lastName: row.last_name || "",
  email: row.email || "",
  subject: row.subject || "",
  message: row.message || "",
  status: row.status || "new",
  adminReply: row.admin_reply || "",
  repliedAt: row.replied_at || null,
  repliedBy: row.replied_by || null,
  internalNote: row.internal_note || "",
  createdAt: row.created_at || null,
  updatedAt: row.updated_at || null,
});

export const submitContactMessage = asyncHandler(async (req, res) => {
  const firstName = String(req.body.firstName || "").trim();
  const lastName = String(req.body.lastName || "").trim();
  const email = String(req.body.email || "").trim().toLowerCase();
  const subject = String(req.body.subject || "").trim();
  const message = String(req.body.message || "").trim();

  if (!firstName || !lastName || !email || !subject || !message) {
    res.status(400);
    throw new Error("All fields are required");
  }

  const { data, error } = await supabase
    .from("contact_messages")
    .insert({
      user_id: req.user?.id || null,
      first_name: firstName,
      last_name: lastName,
      email,
      subject,
      message,
      status: "new",
    })
    .select(CONTACT_MESSAGE_SELECT)
    .single();

  if (error) {
    if (isMissingRelationError(error.message)) {
      res.status(400);
      throw new Error("Run the latest schema SQL to enable contact inquiries table");
    }
    res.status(500);
    throw new Error(error.message);
  }

  res.status(201).json({
    message: "Your message has been sent successfully. We'll get back to you soon.",
    inquiry: mapContactMessage(data),
  });
});

export const getAdminContactMessages = asyncHandler(async (req, res) => {
  const status = String(req.query.status || "").trim().toLowerCase();
  const q = String(req.query.q || "").trim().toLowerCase();

  let query = supabase
    .from("contact_messages")
    .select(CONTACT_MESSAGE_SELECT)
    .order("created_at", { ascending: false });

  if (status && CONTACT_STATUS.includes(status)) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;

  if (error) {
    if (isMissingRelationError(error.message)) {
      res.status(400);
      throw new Error("Run the latest schema SQL to enable contact inquiries table");
    }
    res.status(500);
    throw new Error(error.message);
  }

  let rows = (data || []).map(mapContactMessage);

  if (q) {
    rows = rows.filter((item) => {
      const haystack = [item.firstName, item.lastName, item.email, item.subject, item.message]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }

  res.json(rows);
});

export const getAdminContactMessageById = asyncHandler(async (req, res) => {
  const { data, error } = await supabase
    .from("contact_messages")
    .select(CONTACT_MESSAGE_SELECT)
    .eq("id", req.params.id)
    .maybeSingle();

  if (error) {
    if (isMissingRelationError(error.message)) {
      res.status(400);
      throw new Error("Run the latest schema SQL to enable contact inquiries table");
    }
    res.status(500);
    throw new Error(error.message);
  }

  if (!data) {
    res.status(404);
    throw new Error("Contact message not found");
  }

  res.json(mapContactMessage(data));
});

export const updateAdminContactMessageStatus = asyncHandler(async (req, res) => {
  const status = String(req.body.status || "").trim().toLowerCase();

  if (!CONTACT_STATUS.includes(status)) {
    res.status(400);
    throw new Error("Invalid contact message status");
  }

  const { data, error } = await supabase
    .from("contact_messages")
    .update({ status })
    .eq("id", req.params.id)
    .select(CONTACT_MESSAGE_SELECT)
    .maybeSingle();

  if (error) {
    if (isMissingRelationError(error.message)) {
      res.status(400);
      throw new Error("Run the latest schema SQL to enable contact inquiries table");
    }
    res.status(500);
    throw new Error(error.message);
  }

  if (!data) {
    res.status(404);
    throw new Error("Contact message not found");
  }

  res.json({
    message: "Contact message status updated",
    inquiry: mapContactMessage(data),
  });
});

export const getCustomerContactMessages = asyncHandler(async (req, res) => {
  if (!req.user?.id) {
    res.status(401);
    throw new Error("User not authenticated");
  }

  const userEmail = String(req.user.email || "").trim().toLowerCase();

  const { data, error } = await supabase
    .from("contact_messages")
    .select(CONTACT_MESSAGE_SELECT)
    .or(`user_id.eq.${req.user.id},email.eq.${userEmail}`)
    .order("created_at", { ascending: false });

  if (error) {
    if (isMissingRelationError(error.message)) {
      res.status(400);
      throw new Error("Run the latest schema SQL to enable contact inquiries table");
    }
    res.status(500);
    throw new Error(error.message);
  }

  // Backfill ownership for legacy rows that were created before user_id was stored.
  const legacyIds = (data || [])
    .filter((row) => !row.user_id && String(row.email || "").toLowerCase() === userEmail)
    .map((row) => row.id);

  if (legacyIds.length > 0) {
    await supabase.from("contact_messages").update({ user_id: req.user.id }).in("id", legacyIds);
  }

  const rows = (data || []).map(mapContactMessage);
  res.json(rows);
});

export const deleteCustomerContactMessage = asyncHandler(async (req, res) => {
  if (!req.user?.id) {
    res.status(401);
    throw new Error("User not authenticated");
  }

  const userEmail = String(req.user.email || "").trim().toLowerCase();

  const { data: existing, error: fetchError } = await supabase
    .from("contact_messages")
    .select("id, user_id, email")
    .eq("id", req.params.id)
    .maybeSingle();

  if (fetchError) {
    if (isMissingRelationError(fetchError.message)) {
      res.status(400);
      throw new Error("Run the latest schema SQL to enable contact inquiries table");
    }
    res.status(500);
    throw new Error(fetchError.message);
  }

  if (!existing) {
    res.status(404);
    throw new Error("Contact message not found");
  }

  const ownsById = existing.user_id === req.user.id;
  const ownsLegacyByEmail = !existing.user_id && String(existing.email || "").toLowerCase() === userEmail;

  if (!ownsById && !ownsLegacyByEmail) {
    res.status(403);
    throw new Error("You can only delete your own inquiries");
  }

  const { error: deleteError } = await supabase
    .from("contact_messages")
    .delete()
    .eq("id", req.params.id);

  if (deleteError) {
    if (isMissingRelationError(deleteError.message)) {
      res.status(400);
      throw new Error("Run the latest schema SQL to enable contact inquiries table");
    }
    res.status(500);
    throw new Error(deleteError.message);
  }

  res.json({
    message: "Inquiry deleted successfully",
    id: req.params.id,
  });
});

export const replyAdminContactMessage = asyncHandler(async (req, res) => {
  const replyMessage = String(req.body.replyMessage || "").trim();
  const internalNoteRaw = req.body.internalNote;
  const internalNote = typeof internalNoteRaw === "string" ? internalNoteRaw.trim() : "";

  if (!replyMessage) {
    res.status(400);
    throw new Error("Reply message is required");
  }

  const { data: existing, error: fetchError } = await supabase
    .from("contact_messages")
    .select("id, first_name, last_name, email, subject, message")
    .eq("id", req.params.id)
    .maybeSingle();

  if (fetchError) {
    if (isMissingRelationError(fetchError.message)) {
      res.status(400);
      throw new Error("Run the latest schema SQL to enable contact inquiries table");
    }
    res.status(500);
    throw new Error(fetchError.message);
  }

  if (!existing) {
    res.status(404);
    throw new Error("Contact message not found");
  }

  await sendContactReplyEmail({
    toEmail: existing.email,
    customerName: [existing.first_name, existing.last_name].filter(Boolean).join(" ").trim() || "there",
    inquirySubject: existing.subject,
    inquiryMessage: existing.message,
    replyMessage,
  });

  const updatePayload = {
    status: "replied",
    admin_reply: replyMessage,
    replied_at: new Date().toISOString(),
    replied_by: req.user?.id || null,
    internal_note: internalNote || null,
  };

  const { data, error } = await supabase
    .from("contact_messages")
    .update(updatePayload)
    .eq("id", req.params.id)
    .select(CONTACT_MESSAGE_SELECT)
    .maybeSingle();

  if (error) {
    if (isMissingRelationError(error.message)) {
      res.status(400);
      throw new Error("Run the latest schema SQL to enable contact inquiries table");
    }
    res.status(500);
    throw new Error(error.message);
  }

  if (!data) {
    res.status(404);
    throw new Error("Contact message not found");
  }

  res.json({
    message: "Reply sent and inquiry updated",
    inquiry: mapContactMessage(data),
  });
});
