import crypto from "crypto";
import asyncHandler from "express-async-handler";
import supabase from "../config/supabase.js";

const CUSTOM_PROJECT_IMAGES_BUCKET = process.env.CUSTOM_PROJECT_IMAGES_BUCKET || "custom-project-images";
const MAX_CUSTOM_PROJECT_IMAGES = 5;
const PURCHASE_WINDOW_DAYS = 10;

const baseProjectSelect =
  "id, user_id, name, email, mobile, description, specifications, budget, deadline, status, quotation_price, admin_message, quote_valid_until, quote_approved_at, quote_approved_by_user_id, customer_response, accepted_at, declined_at, purchase_link, purchase_link_message, purchase_link_sent_at, purchase_deadline, admin_responded_at, created_at, updated_at";

const projectSelect = `${baseProjectSelect}, images:custom_project_images(id, image_url, sort_order, created_at), quoteHistory:custom_project_quote_history(id, previous_quotation_price, previous_admin_message, previous_quote_valid_until, new_quotation_price, new_admin_message, new_quote_valid_until, changed_by_admin_id, created_at), notifications:custom_project_notifications(id, user_id, recipient_email, recipient_role, event_type, title, message, metadata, is_read, created_at)`;

const isMissingRelationError = (message = "") => {
  const normalized = String(message).toLowerCase();
  return normalized.includes("could not find") && (normalized.includes("relation") || normalized.includes("table"));
};

const formatDateOnly = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
};

const getEndOfDayUtc = (dateOnlyValue) => {
  if (!dateOnlyValue) return null;
  const date = new Date(`${dateOnlyValue}T23:59:59.999Z`);
  if (Number.isNaN(date.getTime())) return null;
  return date;
};

const isQuoteExpired = (row) => {
  if ((row.status || "") !== "quoted" || !row.quote_valid_until) {
    return false;
  }
  const endOfValidityUtc = getEndOfDayUtc(row.quote_valid_until);
  if (!endOfValidityUtc) return false;
  return endOfValidityUtc.getTime() < Date.now();
};

const isPurchaseWindowExpired = (row) => {
  if (!["accepted", "link_sent"].includes(row.status || "") || !row.purchase_deadline) {
    return false;
  }
  const deadline = new Date(row.purchase_deadline);
  if (Number.isNaN(deadline.getTime())) return false;
  return deadline.getTime() < Date.now();
};

const getDisplayStatus = (row) => {
  if (isQuoteExpired(row) || isPurchaseWindowExpired(row)) {
    return "expired";
  }
  return row.status || "pending";
};

const addDays = (isoDateString, days) => {
  const date = new Date(isoDateString);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString();
};

const daysRemaining = (isoDateString) => {
  if (!isoDateString) return null;
  const target = new Date(isoDateString);
  if (Number.isNaN(target.getTime())) return null;
  const diff = target.getTime() - Date.now();
  if (diff <= 0) return 0;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

const createProjectNotification = async ({
  customProjectId,
  userId,
  recipientEmail,
  eventType,
  title,
  message,
  metadata = {},
  recipientRole = "customer",
}) => {
  const { error } = await supabase.from("custom_project_notifications").insert({
    custom_project_id: customProjectId,
    user_id: userId || null,
    recipient_email: recipientEmail || null,
    recipient_role: recipientRole,
    event_type: eventType,
    title,
    message,
    metadata,
  });

  if (error) {
    throw new Error(error.message);
  }
};

const createAdminNotifications = async ({ customProjectId, eventType, title, message, metadata = {} }) => {
  const { data: admins, error: adminsError } = await supabase
    .from("users")
    .select("id, email")
    .eq("role", "admin");

  if (adminsError) {
    throw new Error(adminsError.message);
  }

  const rows = (admins || []).map((admin) => ({
    custom_project_id: customProjectId,
    user_id: admin.id,
    recipient_email: admin.email,
    recipient_role: "admin",
    event_type: eventType,
    title,
    message,
    metadata,
  }));

  if (!rows.length) {
    return;
  }

  const { error } = await supabase.from("custom_project_notifications").insert(rows);
  if (error) {
    throw new Error(error.message);
  }
};

const mapProject = (row = {}) => {
  const displayStatus = getDisplayStatus(row);
  const quoteExpired = isQuoteExpired(row);
  const purchaseExpired = isPurchaseWindowExpired(row);
  const purchaseDaysLeft = daysRemaining(row.purchase_deadline);
  const images = (row.images || [])
    .slice()
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
    .map((entry) => ({
      id: entry.id,
      url: entry.image_url,
      sortOrder: Number(entry.sort_order || 0),
      createdAt: entry.created_at,
    }));

  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    email: row.email,
    mobile: row.mobile,
    description: row.description,
    specifications: row.specifications || "",
    budget: row.budget == null ? null : Number(row.budget),
    deadline: row.deadline || null,
    status: row.status || "pending",
    displayStatus,
    quotationPrice: row.quotation_price == null ? null : Number(row.quotation_price),
    adminMessage: row.admin_message || "",
    quoteValidUntil: row.quote_valid_until || null,
    customerResponse: row.customer_response || null,
    acceptedAt: row.accepted_at || null,
    declinedAt: row.declined_at || null,
    purchaseLink: row.purchase_link || "",
    purchaseLinkMessage: row.purchase_link_message || "",
    purchaseLinkSentAt: row.purchase_link_sent_at || null,
    purchaseDeadline: row.purchase_deadline || null,
    purchaseWindowDaysRemaining: purchaseDaysLeft,
    isQuoteExpired: quoteExpired,
    isPurchaseWindowExpired: purchaseExpired,
    canAcceptQuote: (row.status || "") === "quoted" && !quoteExpired,
    canDeclineQuote: (row.status || "") === "quoted" && !quoteExpired,
    canRespondToQuote: (row.status || "") === "quoted" && !quoteExpired,
    canUsePurchaseLink:
      Boolean(row.purchase_link) && ["accepted", "link_sent"].includes(row.status || "") && !purchaseExpired,
    quoteApprovedAt: row.quote_approved_at || null,
    quoteApprovedByUserId: row.quote_approved_by_user_id || null,
    adminRespondedAt: row.admin_responded_at || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    purchaseNotice:
      ["accepted", "link_sent"].includes(row.status || "")
        ? "You can buy this product within the next 10 days. We will send you the product link."
        : "",
    images,
    imageUrls: images.map((entry) => entry.url).filter(Boolean),
    quoteHistory: (row.quoteHistory || [])
      .slice()
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .map((entry) => ({
        id: entry.id,
        previousQuotationPrice:
          entry.previous_quotation_price == null ? null : Number(entry.previous_quotation_price),
        previousAdminMessage: entry.previous_admin_message || "",
        previousQuoteValidUntil: entry.previous_quote_valid_until || null,
        newQuotationPrice: entry.new_quotation_price == null ? null : Number(entry.new_quotation_price),
        newAdminMessage: entry.new_admin_message || "",
        newQuoteValidUntil: entry.new_quote_valid_until || null,
        changedByAdminId: entry.changed_by_admin_id || null,
        createdAt: entry.created_at,
      })),
    notifications: (row.notifications || [])
      .slice()
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .map((entry) => ({
        id: entry.id,
        userId: entry.user_id || null,
        recipientEmail: entry.recipient_email || null,
        recipientRole: entry.recipient_role,
        eventType: entry.event_type,
        title: entry.title,
        message: entry.message || "",
        metadata: entry.metadata || {},
        isRead: Boolean(entry.is_read),
        createdAt: entry.created_at,
      })),
  };
};

const getProjectById = async (id) => {
  const { data, error } = await supabase.from("custom_projects").select(projectSelect).eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return data || null;
};

const ensureImagesBucket = async () => {
  const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
  if (bucketsError) throw new Error(bucketsError.message);

  const exists = (buckets || []).some((bucket) => bucket.name === CUSTOM_PROJECT_IMAGES_BUCKET);
  if (exists) return;

  const { error: createBucketError } = await supabase.storage.createBucket(CUSTOM_PROJECT_IMAGES_BUCKET, {
    public: true,
  });
  if (createBucketError) throw new Error(createBucketError.message);
};

const uploadRequestImages = async (files = []) => {
  if (!files.length) return [];

  await ensureImagesBucket();

  const uploadedPaths = [];
  const imageUrls = [];

  for (let index = 0; index < files.length; index += 1) {
    const file = files[index];
    const extension = file.originalname.includes(".")
      ? file.originalname.slice(file.originalname.lastIndexOf(".")).toLowerCase()
      : "";
    const path = `custom-projects/${Date.now()}-${crypto.randomUUID()}${extension}`;

    const { error: uploadError } = await supabase.storage
      .from(CUSTOM_PROJECT_IMAGES_BUCKET)
      .upload(path, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      });

    if (uploadError) {
      if (uploadedPaths.length) {
        await supabase.storage.from(CUSTOM_PROJECT_IMAGES_BUCKET).remove(uploadedPaths);
      }
      throw new Error(uploadError.message);
    }

    uploadedPaths.push(path);

    const {
      data: { publicUrl },
    } = supabase.storage.from(CUSTOM_PROJECT_IMAGES_BUCKET).getPublicUrl(path);

    imageUrls.push({ imageUrl: publicUrl, sortOrder: index });
  }

  return imageUrls;
};

export const createCustomProjectRequest = asyncHandler(async (req, res) => {
  const files = req.files || [];

  if (!req.user?.id) {
    res.status(401);
    throw new Error("Not authorized, token missing");
  }

  if (files.length > MAX_CUSTOM_PROJECT_IMAGES) {
    res.status(400);
    throw new Error(`You can upload up to ${MAX_CUSTOM_PROJECT_IMAGES} images only`);
  }

  const description = String(req.body.description || "").trim();
  const name = String(req.user?.name || req.body.name || "").trim();
  const email = String(req.user?.email || req.body.email || "").trim().toLowerCase();
  const mobile = String(req.body.mobile || "").trim();
  const specifications = String(req.body.specifications || "").trim();
  const budgetRaw = req.body.budget;
  const deadlineRaw = String(req.body.deadline || "").trim();

  if (!description) {
    res.status(400);
    throw new Error("Product description is required");
  }

  if (!name || !email || !mobile) {
    res.status(400);
    throw new Error("Name, email, and mobile number are required");
  }

  const budget =
    budgetRaw === undefined || budgetRaw === null || String(budgetRaw).trim() === "" ? null : Number(budgetRaw);

  if (budget != null && (!Number.isFinite(budget) || budget < 0)) {
    res.status(400);
    throw new Error("Budget must be a non-negative number");
  }

  const deadline = deadlineRaw || null;
  if (deadline) {
    const parsed = new Date(deadline);
    if (Number.isNaN(parsed.getTime())) {
      res.status(400);
      throw new Error("Deadline must be a valid date");
    }
  }

  let imageRows = [];
  try {
    imageRows = await uploadRequestImages(files);
  } catch (error) {
    res.status(500);
    throw new Error(error.message || "Failed to upload custom project images");
  }

  const payload = {
    user_id: req.user.id,
    name,
    email,
    mobile,
    description,
    specifications: specifications || null,
    budget,
    deadline,
    status: "pending",
  };

  const { data: insertedProject, error: insertError } = await supabase
    .from("custom_projects")
    .insert(payload)
    .select(baseProjectSelect)
    .single();

  if (insertError || !insertedProject) {
    if (isMissingRelationError(insertError?.message)) {
      res.status(400);
      throw new Error("Run the latest schema SQL to enable custom project requests");
    }
    res.status(500);
    throw new Error(insertError?.message || "Failed to create custom project request");
  }

  if (imageRows.length) {
    const { error: imageInsertError } = await supabase.from("custom_project_images").insert(
      imageRows.map((entry) => ({
        custom_project_id: insertedProject.id,
        image_url: entry.imageUrl,
        sort_order: entry.sortOrder,
      }))
    );

    if (imageInsertError) {
      res.status(500);
      throw new Error(imageInsertError.message);
    }
  }

  const projectWithRelations = await getProjectById(insertedProject.id);
  if (!projectWithRelations) {
    res.status(500);
    throw new Error("Failed to load created request");
  }

  return res.status(201).json({
    message: "Custom project request submitted successfully",
    request: mapProject(projectWithRelations),
  });
});

export const getMyCustomProjectRequests = asyncHandler(async (req, res) => {
  const { data, error } = await supabase
    .from("custom_projects")
    .select(projectSelect)
    .eq("user_id", req.user.id)
    .order("created_at", { ascending: false });

  if (error) {
    if (isMissingRelationError(error.message)) {
      res.status(400);
      throw new Error("Run the latest schema SQL to enable custom project requests");
    }
    res.status(500);
    throw new Error(error.message);
  }

  return res.json((data || []).map(mapProject));
});

export const getAdminCustomProjectRequests = asyncHandler(async (req, res) => {
  const status = String(req.query.status || "").trim().toLowerCase();
  const q = String(req.query.q || "").trim().toLowerCase();

  let query = supabase.from("custom_projects").select(projectSelect).order("created_at", { ascending: false });

  if (status && status !== "all" && status !== "expired") {
    query = query.eq("status", status);
  }

  const { data, error } = await query;

  if (error) {
    if (isMissingRelationError(error.message)) {
      res.status(400);
      throw new Error("Run the latest schema SQL to enable custom project requests");
    }
    res.status(500);
    throw new Error(error.message);
  }

  let rows = (data || []).map(mapProject);

  if (status === "expired") {
    rows = rows.filter((row) => row.displayStatus === "expired");
  }

  if (q) {
    rows = rows.filter((row) => {
      const haystack = [row.name, row.email, row.mobile, row.description].join(" ").toLowerCase();
      return haystack.includes(q);
    });
  }

  return res.json(rows);
});

export const getAdminCustomProjectRequestById = asyncHandler(async (req, res) => {
  const data = await getProjectById(req.params.id);

  if (!data) {
    res.status(404);
    throw new Error("Custom request not found");
  }

  return res.json(mapProject(data));
});

export const updateAdminCustomProjectRequest = asyncHandler(async (req, res) => {
  const status = String(req.body.status || "").trim().toLowerCase();
  const adminMessage = String(req.body.adminMessage || "").trim();
  const quotationRaw = req.body.quotationPrice;
  const quoteValidUntilRaw = String(req.body.quoteValidUntil || "").trim();

  if (!status) {
    res.status(400);
    throw new Error("Status is required");
  }

  const allowedStatuses = ["pending", "reviewed", "quoted", "accepted", "declined", "link_sent", "approved", "rejected"];
  if (!allowedStatuses.includes(status)) {
    res.status(400);
    throw new Error("Invalid status value");
  }

  const quotationPrice =
    quotationRaw === undefined || quotationRaw === null || String(quotationRaw).trim() === ""
      ? null
      : Number(quotationRaw);

  if (quotationPrice != null && (!Number.isFinite(quotationPrice) || quotationPrice < 0)) {
    res.status(400);
    throw new Error("Quotation price must be a non-negative number");
  }

  const quoteValidUntil = quoteValidUntilRaw ? formatDateOnly(quoteValidUntilRaw) : null;
  if (quoteValidUntilRaw && !quoteValidUntil) {
    res.status(400);
    throw new Error("Quote valid until must be a valid date");
  }

  if (status === "quoted" && quotationPrice == null) {
    res.status(400);
    throw new Error("Quotation price is required when status is quoted");
  }

  if (status === "quoted" && !quoteValidUntil) {
    res.status(400);
    throw new Error("Quote valid until is required when status is quoted");
  }

  const existing = await getProjectById(req.params.id);
  if (!existing) {
    res.status(404);
    throw new Error("Custom request not found");
  }

  const quoteChanged =
    (existing.quotation_price == null ? null : Number(existing.quotation_price)) !== quotationPrice ||
    (existing.admin_message || "") !== (adminMessage || "") ||
    (existing.quote_valid_until || null) !== quoteValidUntil;

  const payload = {
    status,
    quotation_price: quotationPrice,
    admin_message: adminMessage || null,
    quote_valid_until: quoteValidUntil,
    admin_responded_at: new Date().toISOString(),
  };

  if (status === "quoted") {
    payload.customer_response = null;
    payload.accepted_at = null;
    payload.declined_at = null;
    payload.purchase_link = null;
    payload.purchase_link_message = null;
    payload.purchase_link_sent_at = null;
    payload.purchase_deadline = null;
  }

  const { data, error } = await supabase
    .from("custom_projects")
    .update(payload)
    .eq("id", req.params.id)
    .select(baseProjectSelect)
    .maybeSingle();

  if (error) {
    res.status(500);
    throw new Error(error.message);
  }

  if (!data) {
    res.status(404);
    throw new Error("Custom request not found");
  }

  if (quoteChanged) {
    const { error: historyError } = await supabase.from("custom_project_quote_history").insert({
      custom_project_id: data.id,
      previous_quotation_price: existing.quotation_price,
      previous_admin_message: existing.admin_message,
      previous_quote_valid_until: existing.quote_valid_until,
      new_quotation_price: data.quotation_price,
      new_admin_message: data.admin_message,
      new_quote_valid_until: data.quote_valid_until,
      changed_by_admin_id: req.user.id,
    });

    if (historyError) {
      res.status(500);
      throw new Error(historyError.message);
    }
  }

  if (status === "quoted") {
    await createProjectNotification({
      customProjectId: data.id,
      userId: data.user_id,
      recipientEmail: data.email,
      eventType: "quote_sent",
      title: "Your custom project quote is ready",
      message: `A quote of Rs. ${Number(data.quotation_price || 0).toFixed(2)} is available until ${data.quote_valid_until}.`,
      metadata: {
        quotationPrice: data.quotation_price,
        quoteValidUntil: data.quote_valid_until,
      },
    });
  }

  const projectWithRelations = await getProjectById(data.id);
  if (!projectWithRelations) {
    res.status(500);
    throw new Error("Failed to load updated custom request");
  }

  return res.json({
    message: "Custom request updated",
    request: mapProject(projectWithRelations),
  });
});

export const acceptCustomProjectQuote = asyncHandler(async (req, res) => {
  const existing = await getProjectById(req.params.id);
  if (!existing || existing.user_id !== req.user.id) {
    res.status(404);
    throw new Error("Custom request not found");
  }

  if (isQuoteExpired(existing)) {
    res.status(400);
    throw new Error("This quote has expired. Please request an updated quotation.");
  }

  if ((existing.status || "") !== "quoted") {
    res.status(400);
    throw new Error("Only quoted requests can be accepted");
  }

  const acceptedAt = new Date().toISOString();
  const purchaseDeadline = addDays(acceptedAt, PURCHASE_WINDOW_DAYS);

  const { data, error } = await supabase
    .from("custom_projects")
    .update({
      status: "accepted",
      customer_response: "accepted",
      accepted_at: acceptedAt,
      declined_at: null,
      purchase_deadline: purchaseDeadline,
      updated_at: new Date().toISOString(),
    })
    .eq("id", req.params.id)
    .eq("user_id", req.user.id)
    .select(baseProjectSelect)
    .maybeSingle();

  if (error) {
    res.status(500);
    throw new Error(error.message);
  }

  if (!data) {
    res.status(404);
    throw new Error("Custom request not found");
  }

  await createProjectNotification({
    customProjectId: data.id,
    userId: data.user_id,
    recipientEmail: data.email,
    eventType: "quote_accepted",
    title: "Quote accepted",
    message: "You have accepted the quotation. The admin will send you the product link shortly.",
    metadata: {
      acceptedAt,
      purchaseDeadline,
    },
  });

  await createAdminNotifications({
    customProjectId: data.id,
    eventType: "customer_quote_accepted",
    title: "Customer accepted the quote",
    message: `${data.name} accepted the custom quote. Please send a product purchase link.`,
    metadata: {
      requestId: data.id,
      acceptedAt,
      purchaseDeadline,
    },
  });

  const projectWithRelations = await getProjectById(data.id);
  if (!projectWithRelations) {
    res.status(500);
    throw new Error("Failed to load accepted custom request");
  }

  return res.json({
    message: "You have accepted the quotation. The admin will send you the product link shortly.",
    request: mapProject(projectWithRelations),
  });
});

export const declineCustomProjectQuote = asyncHandler(async (req, res) => {
  const existing = await getProjectById(req.params.id);
  if (!existing || existing.user_id !== req.user.id) {
    res.status(404);
    throw new Error("Custom request not found");
  }

  if (isQuoteExpired(existing)) {
    res.status(400);
    throw new Error("This quote has expired and can no longer be declined.");
  }

  if ((existing.status || "") !== "quoted") {
    res.status(400);
    throw new Error("Only quoted requests can be declined");
  }

  const declinedAt = new Date().toISOString();

  const { data, error } = await supabase
    .from("custom_projects")
    .update({
      status: "declined",
      customer_response: "declined",
      declined_at: declinedAt,
      accepted_at: null,
      purchase_link: null,
      purchase_link_message: null,
      purchase_link_sent_at: null,
      purchase_deadline: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", req.params.id)
    .eq("user_id", req.user.id)
    .select(baseProjectSelect)
    .maybeSingle();

  if (error) {
    res.status(500);
    throw new Error(error.message);
  }

  if (!data) {
    res.status(404);
    throw new Error("Custom request not found");
  }

  await createProjectNotification({
    customProjectId: data.id,
    userId: data.user_id,
    recipientEmail: data.email,
    eventType: "quote_declined",
    title: "Quote declined",
    message: "You declined this quotation.",
    metadata: {
      declinedAt,
    },
  });

  await createAdminNotifications({
    customProjectId: data.id,
    eventType: "customer_quote_declined",
    title: "Customer declined the quote",
    message: `${data.name} declined the custom quote.`,
    metadata: {
      requestId: data.id,
      declinedAt,
    },
  });

  const projectWithRelations = await getProjectById(data.id);
  if (!projectWithRelations) {
    res.status(500);
    throw new Error("Failed to load declined custom request");
  }

  return res.json({
    message: "Quote declined successfully",
    request: mapProject(projectWithRelations),
  });
});

export const sendCustomProjectPurchaseLink = asyncHandler(async (req, res) => {
  const purchaseLink = String(req.body.purchaseLink || "").trim();
  const purchaseLinkMessage = String(req.body.purchaseLinkMessage || "").trim();

  if (!purchaseLink) {
    res.status(400);
    throw new Error("Purchase link is required");
  }

  try {
    // Validate URL format before saving.
    // eslint-disable-next-line no-new
    new URL(purchaseLink);
  } catch {
    res.status(400);
    throw new Error("Purchase link must be a valid URL");
  }

  const existing = await getProjectById(req.params.id);
  if (!existing) {
    res.status(404);
    throw new Error("Custom request not found");
  }

  if ((existing.customer_response || "") !== "accepted") {
    res.status(400);
    throw new Error("Purchase link can only be sent after customer accepts the quote");
  }

  if (!["accepted", "link_sent"].includes(existing.status || "")) {
    res.status(400);
    throw new Error("Purchase link can only be sent for accepted requests");
  }

  if (isPurchaseWindowExpired(existing)) {
    res.status(400);
    throw new Error("Purchase window has expired for this request");
  }

  const sentAt = new Date().toISOString();

  const { data, error } = await supabase
    .from("custom_projects")
    .update({
      status: "link_sent",
      purchase_link: purchaseLink,
      purchase_link_message: purchaseLinkMessage || null,
      purchase_link_sent_at: sentAt,
      updated_at: new Date().toISOString(),
    })
    .eq("id", req.params.id)
    .select(baseProjectSelect)
    .maybeSingle();

  if (error) {
    res.status(500);
    throw new Error(error.message);
  }

  if (!data) {
    res.status(404);
    throw new Error("Custom request not found");
  }

  await createProjectNotification({
    customProjectId: data.id,
    userId: data.user_id,
    recipientEmail: data.email,
    eventType: "purchase_link_sent",
    title: "Your custom product purchase link is ready",
    message:
      purchaseLinkMessage ||
      "Your custom product is ready. Use the purchase link within 10 days to complete your purchase.",
    metadata: {
      purchaseLink,
      purchaseDeadline: data.purchase_deadline,
      purchaseLinkSentAt: sentAt,
    },
  });

  const projectWithRelations = await getProjectById(data.id);
  if (!projectWithRelations) {
    res.status(500);
    throw new Error("Failed to load updated custom request");
  }

  return res.json({
    message: "Purchase link sent successfully",
    request: mapProject(projectWithRelations),
  });
});

export const deleteCustomProjectRequest = asyncHandler(async (req, res) => {
  const existing = await getProjectById(req.params.id);
  if (!existing || existing.user_id !== req.user.id) {
    res.status(404);
    throw new Error("Custom request not found");
  }

  // Customer can only delete before accepting the quotation
  if ((existing.customer_response || "") === "accepted") {
    res.status(400);
    throw new Error("You cannot delete a request after accepting the quotation");
  }

  // Also prevent deletion if purchase link has been sent (window is active)
  if (["accepted", "link_sent"].includes(existing.status || "")) {
    res.status(400);
    throw new Error("You cannot delete this request at this stage");
  }

  const { error: deleteError } = await supabase
    .from("custom_projects")
    .delete()
    .eq("id", req.params.id)
    .eq("user_id", req.user.id);

  if (deleteError) {
    res.status(500);
    throw new Error(deleteError.message);
  }

  return res.json({
    message: "Custom request deleted successfully",
  });
});

export const adminDeleteCustomProjectRequest = asyncHandler(async (req, res) => {
  const existing = await getProjectById(req.params.id);
  if (!existing) {
    res.status(404);
    throw new Error("Custom request not found");
  }

  // Admin can delete anytime
  const { error: deleteError } = await supabase
    .from("custom_projects")
    .delete()
    .eq("id", req.params.id);

  if (deleteError) {
    res.status(500);
    throw new Error(deleteError.message);
  }

  return res.json({
    message: "Custom request deleted successfully",
  });
});
