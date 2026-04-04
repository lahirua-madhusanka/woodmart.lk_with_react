import asyncHandler from "express-async-handler";
import supabase from "../config/supabase.js";

const CONTACT_STATUS = ["new", "read", "replied"];

const isMissingRelationError = (message = "") => {
  const normalized = String(message).toLowerCase();
  return normalized.includes("could not find") && (normalized.includes("relation") || normalized.includes("table"));
};

const mapContactMessage = (row = {}) => ({
  id: row.id,
  firstName: row.first_name || "",
  lastName: row.last_name || "",
  email: row.email || "",
  subject: row.subject || "",
  message: row.message || "",
  status: row.status || "new",
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
      first_name: firstName,
      last_name: lastName,
      email,
      subject,
      message,
      status: "new",
    })
    .select("id, first_name, last_name, email, subject, message, status, created_at, updated_at")
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
    .select("id, first_name, last_name, email, subject, message, status, created_at, updated_at")
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
    .select("id, first_name, last_name, email, subject, message, status, created_at, updated_at")
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
