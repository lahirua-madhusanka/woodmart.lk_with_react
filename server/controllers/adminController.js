import asyncHandler from "express-async-handler";
import bcrypt from "bcryptjs";
import supabase from "../config/supabase.js";
import { addOrderStatusHistory, autoDeliverIfDue, buildOrderLifecycleTimestamps } from "../services/orderWorkflow.js";
import { mapOrder, mapProduct, mapUser } from "../utils/dbMappers.js";

const STOREFRONT_ASSETS_BUCKET =
  process.env.STOREFRONT_ASSETS_BUCKET || "storefront-assets";

const orderSelect =
  "id, user_id, subtotal_amount, shipping_total, discount_total, product_cost_total, profit_total, total_amount, payment_status, order_status, payment_method, payment_intent_id, transaction_id, paid_amount, tracking_number, courier_name, admin_note, tracking_added_at, shipped_at, out_for_delivery_at, delivered_at, returned_at, cancelled_at, invoice_number, coupon_id, coupon_code, coupon_title, coupon_discount_type, coupon_discount_value, coupon_discount_amount, created_at, updated_at, users:user_id(id, name, email), order_items(product_id, name, image, sku, price, list_price, discount_amount, product_cost, shipping_price, quantity, line_subtotal, line_shipping_total, line_discount_total, line_product_cost_total, line_total, line_profit_total), order_shipping_addresses(full_name, line1, line2, city, state, postal_code, country, phone), order_status_history(id, order_status, note, changed_by, changed_at, users:changed_by(name, email))";

const productSelect =
  "id, name, description, price, discount_price, product_cost, shipping_price, category, stock, rating, created_at, updated_at, product_images(image_url, sort_order), product_reviews(id, user_id, name, rating, comment, created_at, updated_at)";

const settingsSelect = "*";

const defaultStoreSettings = {
  storeName: "Woodmart.lk",
  supportEmail: "",
  contactNumber: "",
  storeAddress: "",
  businessHours: "Mon - Sat, 9:00 AM - 7:00 PM",
  supportNote: "Visit our showroom or contact our team for personalized recommendations.",
  contactImageUrl:
    "https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1000&q=80",
  currency: "Rs.",
  freeShippingThreshold: 199,
  themeAccent: "#0959a4",
  heroTitle: "Craft your space with timeless pieces.",
  heroSubtitle:
    "Discover premium furniture, decor, and lifestyle objects inspired by natural materials and modern living.",
  heroPrimaryButtonText: "Shop Now",
  heroPrimaryButtonLink: "/shop",
  heroSecondaryButtonText: "View Collection",
  heroSecondaryButtonLink: "/shop",
  heroImage:
    "https://images.unsplash.com/photo-1493666438817-866a91353ca9?auto=format&fit=crop&w=1200&q=80",
};

const isMissingRelationError = (message = "") => {
  const normalized = String(message).toLowerCase();
  return normalized.includes("could not find") && (normalized.includes("relation") || normalized.includes("table"));
};

const isMissingColumnError = (message = "") => {
  const normalized = String(message).toLowerCase();
  return normalized.includes("column") && normalized.includes("does not exist");
};

const isPermissionError = (message = "") => {
  const normalized = String(message).toLowerCase();
  return (
    normalized.includes("permission") ||
    normalized.includes("not authorized") ||
    normalized.includes("unauthorized") ||
    normalized.includes("forbidden")
  );
};

const startOfDay = (date) => {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
};

const endOfDay = (date) => {
  const value = new Date(date);
  value.setHours(23, 59, 59, 999);
  return value;
};

const buildDateRange = ({ period = "month", startDate, endDate }) => {
  const now = new Date();
  let from;
  let to;

  switch (period) {
    case "today": {
      from = startOfDay(now);
      to = endOfDay(now);
      break;
    }
    case "week": {
      const weekday = now.getDay();
      const mondayOffset = weekday === 0 ? -6 : 1 - weekday;
      from = startOfDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() + mondayOffset));
      to = endOfDay(now);
      break;
    }
    case "year": {
      from = startOfDay(new Date(now.getFullYear(), 0, 1));
      to = endOfDay(now);
      break;
    }
    case "custom": {
      if (!startDate || !endDate) {
        throw new Error("Start date and end date are required for custom range");
      }
      from = startOfDay(new Date(startDate));
      to = endOfDay(new Date(endDate));
      break;
    }
    case "month":
    default: {
      from = startOfDay(new Date(now.getFullYear(), now.getMonth(), 1));
      to = endOfDay(now);
      break;
    }
  }

  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    throw new Error("Invalid date range");
  }

  if (from > to) {
    throw new Error("Start date cannot be after end date");
  }

  return {
    from,
    to,
  };
};

const orderNumber = (value) => Number(value || 0);

const mapStoreSettings = (row = {}) => ({
  storeName: row.store_name ?? defaultStoreSettings.storeName,
  supportEmail: row.support_email ?? row.admin_email ?? defaultStoreSettings.supportEmail,
  contactNumber: row.contact_number ?? defaultStoreSettings.contactNumber,
  storeAddress: row.store_address ?? defaultStoreSettings.storeAddress,
  businessHours: row.business_hours ?? defaultStoreSettings.businessHours,
  supportNote: row.support_note ?? defaultStoreSettings.supportNote,
  contactImageUrl: row.contact_image_url ?? defaultStoreSettings.contactImageUrl,
  currency: row.currency ?? defaultStoreSettings.currency,
  freeShippingThreshold: Number(
    row.free_shipping_threshold ?? defaultStoreSettings.freeShippingThreshold
  ),
  themeAccent: row.theme_accent ?? defaultStoreSettings.themeAccent,
  heroTitle: row.hero_title ?? defaultStoreSettings.heroTitle,
  heroSubtitle: row.hero_subtitle ?? defaultStoreSettings.heroSubtitle,
  heroPrimaryButtonText:
    row.hero_primary_button_text ?? defaultStoreSettings.heroPrimaryButtonText,
  heroPrimaryButtonLink:
    row.hero_primary_button_link ?? defaultStoreSettings.heroPrimaryButtonLink,
  heroSecondaryButtonText:
    row.hero_secondary_button_text ?? defaultStoreSettings.heroSecondaryButtonText,
  heroSecondaryButtonLink:
    row.hero_secondary_button_link ?? defaultStoreSettings.heroSecondaryButtonLink,
  heroImage: row.hero_image_url ?? defaultStoreSettings.heroImage,
});

const normalizeNumericSetting = (value, fallback) => {
  const normalized = Number(value);
  return Number.isFinite(normalized) ? normalized : fallback;
};

const ensureStorefrontAssetsBucket = async () => {
  const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
  if (bucketsError) {
    if (isPermissionError(bucketsError.message)) {
      throw new Error(
        "Storage access denied. Set SUPABASE_SERVICE_ROLE_KEY on the server and ensure bucket '" +
          STOREFRONT_ASSETS_BUCKET +
          "' exists in Supabase Storage."
      );
    }
    throw new Error(bucketsError.message);
  }

  const exists = (buckets || []).some((bucket) => bucket.name === STOREFRONT_ASSETS_BUCKET);
  if (exists) return;

  const { error: createBucketError } = await supabase.storage.createBucket(STOREFRONT_ASSETS_BUCKET, {
    public: true,
  });

  if (createBucketError) {
    if (isPermissionError(createBucketError.message)) {
      throw new Error(
        "Cannot create storage bucket. Set SUPABASE_SERVICE_ROLE_KEY on the server or create bucket '" +
          STOREFRONT_ASSETS_BUCKET +
          "' manually in Supabase Storage."
      );
    }
    throw new Error(createBucketError.message);
  }
};

const buildStoreSettingsPayload = (body = {}) => ({
  id: true,
  store_name: String(body.storeName ?? defaultStoreSettings.storeName).trim() || defaultStoreSettings.storeName,
  support_email: String(body.supportEmail ?? "").trim() || null,
  contact_number: String(body.contactNumber ?? "").trim() || null,
  store_address: String(body.storeAddress ?? "").trim() || null,
  business_hours: String(body.businessHours ?? defaultStoreSettings.businessHours).trim() || defaultStoreSettings.businessHours,
  support_note: String(body.supportNote ?? defaultStoreSettings.supportNote).trim() || defaultStoreSettings.supportNote,
  contact_image_url:
    String(body.contactImageUrl ?? defaultStoreSettings.contactImageUrl).trim() || defaultStoreSettings.contactImageUrl,
  currency: String(body.currency ?? defaultStoreSettings.currency).trim() || defaultStoreSettings.currency,
  free_shipping_threshold: Math.max(
    0,
    normalizeNumericSetting(body.freeShippingThreshold, defaultStoreSettings.freeShippingThreshold)
  ),
  theme_accent: String(body.themeAccent ?? defaultStoreSettings.themeAccent).trim() || defaultStoreSettings.themeAccent,
  hero_title: String(body.heroTitle ?? defaultStoreSettings.heroTitle).trim() || defaultStoreSettings.heroTitle,
  hero_subtitle:
    String(body.heroSubtitle ?? defaultStoreSettings.heroSubtitle).trim() || defaultStoreSettings.heroSubtitle,
  hero_primary_button_text:
    String(body.heroPrimaryButtonText ?? defaultStoreSettings.heroPrimaryButtonText).trim() ||
    defaultStoreSettings.heroPrimaryButtonText,
  hero_primary_button_link:
    String(body.heroPrimaryButtonLink ?? defaultStoreSettings.heroPrimaryButtonLink).trim() ||
    defaultStoreSettings.heroPrimaryButtonLink,
  hero_secondary_button_text:
    String(body.heroSecondaryButtonText ?? defaultStoreSettings.heroSecondaryButtonText).trim() ||
    defaultStoreSettings.heroSecondaryButtonText,
  hero_secondary_button_link:
    String(body.heroSecondaryButtonLink ?? defaultStoreSettings.heroSecondaryButtonLink).trim() ||
    defaultStoreSettings.heroSecondaryButtonLink,
  hero_image_url: String(body.heroImage ?? defaultStoreSettings.heroImage).trim() || defaultStoreSettings.heroImage,
});

export const getAdminSettings = asyncHandler(async (req, res) => {
  const { data, error } = await supabase
    .from("store_settings")
    .select(settingsSelect)
    .eq("id", true)
    .maybeSingle();

  if (error) {
    if (isMissingRelationError(error.message)) {
      return res.json({ ...defaultStoreSettings, schemaReady: false });
    }
    res.status(500);
    throw new Error(error.message);
  }

  if (!data) {
    const payload = buildStoreSettingsPayload(defaultStoreSettings);
    const { data: created, error: createError } = await supabase
      .from("store_settings")
      .upsert(payload, { onConflict: "id" })
      .select(settingsSelect)
      .single();

    if (createError || !created) {
      res.status(500);
      throw new Error(createError?.message || "Failed to initialize store settings");
    }

    return res.json(mapStoreSettings(created));
  }

  return res.json(mapStoreSettings(data));
});

export const updateAdminSettings = asyncHandler(async (req, res) => {
  const payload = buildStoreSettingsPayload(req.body);

  const { data, error } = await supabase
    .from("store_settings")
    .upsert(payload, { onConflict: "id" })
    .select(settingsSelect)
    .single();

  if (error) {
    if (isMissingRelationError(error.message)) {
      res.status(400);
      throw new Error("Run the latest schema SQL to enable settings management");
    }
    if (isMissingColumnError(error.message)) {
      res.status(400);
      throw new Error("Run the latest schema SQL to add latest storefront settings fields");
    }

    res.status(500);
    throw new Error(error.message);
  }

  return res.json(mapStoreSettings(data));
});

export const uploadAdminHeroImage = asyncHandler(async (req, res) => {
  if (!req.file) {
    res.status(400);
    throw new Error("Hero image file is required");
  }

  await ensureStorefrontAssetsBucket();

  const extension = req.file.originalname.includes(".")
    ? req.file.originalname.slice(req.file.originalname.lastIndexOf(".")).toLowerCase()
    : ".jpg";
  const filePath = `hero/${Date.now()}-${Math.random().toString(36).slice(2)}${extension}`;

  const { error: uploadError } = await supabase.storage
    .from(STOREFRONT_ASSETS_BUCKET)
    .upload(filePath, req.file.buffer, {
      contentType: req.file.mimetype,
      upsert: false,
    });

  if (uploadError) {
    res.status(500);
    if (isPermissionError(uploadError.message)) {
      throw new Error(
        "Hero image upload failed due to storage permissions. Verify SUPABASE_SERVICE_ROLE_KEY and bucket policies."
      );
    }
    throw new Error(uploadError.message);
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(STOREFRONT_ASSETS_BUCKET).getPublicUrl(filePath);

  const payload = buildStoreSettingsPayload({
    ...defaultStoreSettings,
    heroImage: publicUrl,
  });

  const { data, error } = await supabase
    .from("store_settings")
    .upsert(payload, { onConflict: "id" })
    .select(settingsSelect)
    .single();

  if (error) {
    res.status(500);
    throw new Error(error.message);
  }

  return res.json({
    message: "Hero image uploaded successfully",
    heroImage: publicUrl,
    settings: mapStoreSettings(data),
  });
});

export const getAdminDashboardStats = asyncHandler(async (req, res) => {
  const [productsCount, ordersCount, usersCount, recentOrdersRes, lowStockRes, revenueOrdersRes] =
    await Promise.all([
      supabase.from("products").select("id", { count: "exact", head: true }),
      supabase.from("orders").select("id", { count: "exact", head: true }),
      supabase.from("users").select("id", { count: "exact", head: true }),
      supabase.from("orders").select(orderSelect).order("created_at", { ascending: false }).limit(5),
      supabase.from("products").select(productSelect).lte("stock", 10).order("stock", { ascending: true }).limit(8),
      supabase.from("orders").select("total_amount, payment_status, order_status, created_at"),
    ]);

  const errors = [
    productsCount.error,
    ordersCount.error,
    usersCount.error,
    recentOrdersRes.error,
    lowStockRes.error,
    revenueOrdersRes.error,
  ].filter(Boolean);

  if (errors.length) {
    res.status(500);
    throw new Error(errors[0].message);
  }

  const totalRevenue = (revenueOrdersRes.data || [])
    .filter((item) => item.order_status !== "cancelled" && item.payment_status !== "failed")
    .reduce((sum, item) => sum + Number(item.total_amount || 0), 0);

  const monthFormatter = new Intl.DateTimeFormat("en-US", { month: "short" });
  const now = new Date();
  const monthlyTemplate = Array.from({ length: 6 }).map((_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
    return {
      key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`,
      month: monthFormatter.format(date),
      revenue: 0,
    };
  });

  const monthlyMap = new Map(monthlyTemplate.map((entry) => [entry.key, entry]));

  (revenueOrdersRes.data || [])
    .filter((item) => item.order_status !== "cancelled" && item.payment_status !== "failed")
    .forEach((item) => {
      if (!item.created_at) return;
      const createdAt = new Date(item.created_at);
      if (Number.isNaN(createdAt.getTime())) return;

      const key = `${createdAt.getFullYear()}-${String(createdAt.getMonth() + 1).padStart(2, "0")}`;
      const bucket = monthlyMap.get(key);
      if (!bucket) return;

      bucket.revenue += Number(item.total_amount || 0);
    });

  const monthlyRevenue = monthlyTemplate.map((entry) => ({
    month: entry.month,
    revenue: Number(entry.revenue.toFixed(2)),
  }));

  res.json({
    totals: {
      products: productsCount.count || 0,
      orders: ordersCount.count || 0,
      users: usersCount.count || 0,
      revenue: totalRevenue,
    },
    monthlyRevenue,
    recentOrders: (recentOrdersRes.data || []).map((row) => mapOrder(row, { includeUser: true })),
    lowStockProducts: (lowStockRes.data || []).map(mapProduct),
  });
});

export const getAllOrdersAdmin = asyncHandler(async (req, res) => {
  const { paymentStatus, orderStatus, q, fromDate, toDate } = req.query;
  let queryBuilder = supabase.from("orders").select(orderSelect).order("created_at", { ascending: false });

  if (paymentStatus) queryBuilder = queryBuilder.eq("payment_status", paymentStatus);
  if (orderStatus) queryBuilder = queryBuilder.eq("order_status", orderStatus);
  if (fromDate) queryBuilder = queryBuilder.gte("created_at", `${fromDate}T00:00:00.000Z`);
  if (toDate) queryBuilder = queryBuilder.lte("created_at", `${toDate}T23:59:59.999Z`);

  const { data, error } = await queryBuilder;
  if (error) {
    res.status(500);
    throw new Error(error.message);
  }

  const normalizedRows = await autoDeliverIfDue(data || []);
  let orders = normalizedRows.map((row) => mapOrder(row, { includeUser: true }));

  if (q) {
    const lowered = q.toLowerCase();
    orders = orders.filter(
      (order) =>
        order._id.toLowerCase().includes(lowered) ||
        order.userId?.name?.toLowerCase().includes(lowered) ||
        order.userId?.email?.toLowerCase().includes(lowered)
    );
  }

  res.json(orders);
});

export const getAdminOrderById = asyncHandler(async (req, res) => {
  const { data, error } = await supabase
    .from("orders")
    .select(orderSelect)
    .eq("id", req.params.id)
    .maybeSingle();

  if (error) {
    res.status(500);
    throw new Error(error.message);
  }

  if (!data) {
    res.status(404);
    throw new Error("Order not found");
  }

  const [normalized] = await autoDeliverIfDue([data]);
  return res.json(mapOrder(normalized, { includeUser: true }));
});

export const updateOrderStatusAdmin = asyncHandler(async (req, res) => {
  const {
    orderStatus,
    paymentStatus,
    trackingNumber,
    courierName,
    adminNote,
    statusNote,
  } = req.body;

  const payload = {};
  if (orderStatus) payload.order_status = orderStatus;
  if (paymentStatus) payload.payment_status = paymentStatus;
  if (trackingNumber !== undefined) payload.tracking_number = String(trackingNumber || "").trim() || null;
  if (courierName !== undefined) payload.courier_name = String(courierName || "").trim() || null;
  if (adminNote !== undefined) payload.admin_note = String(adminNote || "").trim() || null;

  const nowIso = new Date().toISOString();
  if (trackingNumber !== undefined && String(trackingNumber || "").trim()) {
    payload.tracking_added_at = nowIso;
  }

  if (orderStatus) {
    Object.assign(payload, buildOrderLifecycleTimestamps(orderStatus, nowIso));
  }

  if (paymentStatus === "paid") {
    const { data: totalRow } = await supabase
      .from("orders")
      .select("total_amount")
      .eq("id", req.params.id)
      .maybeSingle();
    payload.paid_amount = Number(totalRow?.total_amount || 0);
  }

  const { data: existing, error: existingError } = await supabase
    .from("orders")
    .select("id, order_status")
    .eq("id", req.params.id)
    .maybeSingle();

  if (existingError) {
    res.status(500);
    throw new Error(existingError.message);
  }

  if (!existing) {
    res.status(404);
    throw new Error("Order not found");
  }

  const { error: updateError } = await supabase
    .from("orders")
    .update(payload)
    .eq("id", req.params.id);

  if (updateError) {
    res.status(500);
    throw new Error(updateError.message);
  }

  if (orderStatus && existing.order_status !== orderStatus) {
    await addOrderStatusHistory({
      orderId: req.params.id,
      status: orderStatus,
      note: String(statusNote || "").trim() || `Status updated to ${orderStatus}`,
      changedBy: req.user?.id || req.user?._id || null,
    });
  }

  const { data: updatedOrder, error: loadError } = await supabase
    .from("orders")
    .select(orderSelect)
    .eq("id", req.params.id)
    .single();

  if (loadError || !updatedOrder) {
    res.status(500);
    throw new Error(loadError?.message || "Failed to load order");
  }

  res.json(mapOrder(updatedOrder, { includeUser: true }));
});

export const getAllUsersAdmin = asyncHandler(async (req, res) => {
  const { q } = req.query;
  const { data, error } = await supabase
    .from("users")
    .select("id, name, email, role, created_at, updated_at")
    .order("created_at", { ascending: false });

  if (error) {
    res.status(500);
    throw new Error(error.message);
  }

  const users = (data || []).map(mapUser);

  if (!q) {
    return res.json(users);
  }

  const lowered = q.toLowerCase();
  const filtered = users.filter(
    (user) =>
      user.name.toLowerCase().includes(lowered) || user.email.toLowerCase().includes(lowered)
  );

  return res.json(filtered);
});

export const updateUserRoleAdmin = asyncHandler(async (req, res) => {
  const newRole = String(req.body.newRole || req.body.role || "").trim();
  const adminPassword = String(req.body.adminPassword || "");

  if (!newRole) {
    res.status(400);
    throw new Error("Role is required");
  }

  if (!adminPassword.trim()) {
    res.status(400);
    throw new Error("Password is required");
  }

  const { data: existing, error: existingError } = await supabase
    .from("users")
    .select("id, role")
    .eq("id", req.params.id)
    .maybeSingle();

  if (existingError) {
    res.status(500);
    throw new Error(existingError.message);
  }

  if (!existing) {
    res.status(404);
    throw new Error("User not found");
  }

  const { data: currentAdmin, error: currentAdminError } = await supabase
    .from("users")
    .select("id, password_hash, role")
    .eq("id", req.user._id)
    .maybeSingle();

  if (currentAdminError) {
    res.status(500);
    throw new Error(currentAdminError.message);
  }

  if (!currentAdmin || currentAdmin.role !== "admin") {
    res.status(403);
    throw new Error("You are not authorized to perform this action");
  }

  if (!currentAdmin.password_hash || currentAdmin.password_hash === "SUPABASE_AUTH_MANAGED") {
    res.status(400);
    throw new Error("This account cannot verify password changes");
  }

  const passwordMatches = await bcrypt.compare(adminPassword, currentAdmin.password_hash);
  if (!passwordMatches) {
    res.status(401);
    throw new Error("Incorrect admin password");
  }

  const { data: updated, error: updateError } = await supabase
    .from("users")
    .update({ role: newRole })
    .eq("id", req.params.id)
    .select("id, name, email, role, created_at, updated_at")
    .single();

  if (updateError || !updated) {
    res.status(500);
    throw new Error(updateError?.message || "Failed to update role");
  }

  res.json(mapUser(updated));
});

export const deleteUserAdmin = asyncHandler(async (req, res) => {
  const { data: existing, error: existingError } = await supabase
    .from("users")
    .select("id")
    .eq("id", req.params.id)
    .maybeSingle();

  if (existingError) {
    res.status(500);
    throw new Error(existingError.message);
  }

  if (!existing) {
    res.status(404);
    throw new Error("User not found");
  }

  const { error } = await supabase.from("users").delete().eq("id", req.params.id);
  if (error) {
    res.status(500);
    throw new Error(error.message);
  }

  res.json({ message: "User deleted" });
});

export const getAdminCategories = asyncHandler(async (req, res) => {
  const { data: categories, error: categoriesError } = await supabase
    .from("categories")
    .select("id, name, created_at")
    .order("name", { ascending: true });

  if (!categoriesError) {
    return res.json(categories || []);
  }

  if (!isMissingRelationError(categoriesError.message)) {
    res.status(500);
    throw new Error(categoriesError.message);
  }

  const { data, error } = await supabase.from("products").select("category");
  if (error) {
    res.status(500);
    throw new Error(error.message);
  }

  const unique = [...new Set((data || []).map((row) => row.category).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b))
    .map((name) => ({ id: name, name, legacy: true }));

  return res.json(unique);
});

export const createAdminCategory = asyncHandler(async (req, res) => {
  const name = String(req.body.name || "").trim();

  if (!name) {
    res.status(400);
    throw new Error("Category name is required");
  }

  const { data, error } = await supabase
    .from("categories")
    .insert({ name })
    .select("id, name, created_at")
    .single();

  if (error) {
    if (error.code === "23505") {
      res.status(409);
      throw new Error("Category already exists");
    }

    if (isMissingRelationError(error.message)) {
      res.status(400);
      throw new Error("Run the latest schema SQL to enable category management");
    }

    res.status(500);
    throw new Error(error.message);
  }

  res.status(201).json(data);
});

export const deleteAdminCategory = asyncHandler(async (req, res) => {
  const categoryId = req.params.id;

  const { data: category, error: categoryError } = await supabase
    .from("categories")
    .select("id, name")
    .eq("id", categoryId)
    .maybeSingle();

  if (categoryError) {
    if (isMissingRelationError(categoryError.message)) {
      res.status(400);
      throw new Error("Run the latest schema SQL to enable category management");
    }

    res.status(500);
    throw new Error(categoryError.message);
  }

  if (!category) {
    res.status(404);
    throw new Error("Category not found");
  }

  const { count, error: productsError } = await supabase
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("category", category.name);

  if (productsError) {
    res.status(500);
    throw new Error(productsError.message);
  }

  if ((count || 0) > 0) {
    res.status(400);
    throw new Error("Cannot delete category while products are using it");
  }

  const { error: deleteError } = await supabase
    .from("categories")
    .delete()
    .eq("id", categoryId);

  if (deleteError) {
    res.status(500);
    throw new Error(deleteError.message);
  }

  res.json({ message: "Category deleted" });
});

export const getAdminReviews = asyncHandler(async (req, res) => {
  const { data, error } = await supabase
    .from("product_reviews")
    .select("id, product_id, name, rating, comment, created_at, products(name)")
    .order("created_at", { ascending: false });

  if (error) {
    res.status(500);
    throw new Error(error.message);
  }

  const reviews = (data || []).map((review) => ({
    _id: review.id,
    productId: review.product_id,
    productName: review.products?.name || "Unknown Product",
    name: review.name,
    rating: Number(review.rating || 0),
    comment: review.comment,
    createdAt: review.created_at,
  }));

  res.json(reviews);
});

export const getAdminProfitReport = asyncHandler(async (req, res) => {
  const period = String(req.query.period || "month").toLowerCase();
  const startDate = req.query.startDate;
  const endDate = req.query.endDate;

  let range;
  try {
    range = buildDateRange({ period, startDate, endDate });
  } catch (error) {
    res.status(400);
    throw new Error(error.message);
  }

  const { data, error } = await supabase
    .from("orders")
    .select(orderSelect)
    .gte("created_at", range.from.toISOString())
    .lte("created_at", range.to.toISOString())
    .order("created_at", { ascending: false });

  if (error) {
    res.status(500);
    throw new Error(error.message);
  }

  const orders = (data || []).map((row) => mapOrder(row, { includeUser: true }));

  const reportableOrders = orders.filter(
    (order) => order.orderStatus !== "cancelled" && order.paymentStatus !== "failed"
  );

  const normalizeItemMetrics = (item = {}) => {
    const quantity = Number(item.quantity || 0);
    const unitPrice = orderNumber(item.price);
    const discountAmount = orderNumber(item.discountAmount);
    const shippingPrice = orderNumber(item.shippingPrice);
    const productCost = orderNumber(item.productCost);

    const lineSubtotal = orderNumber(item.lineSubtotal) || unitPrice * quantity;
    const lineShippingTotal = orderNumber(item.lineShippingTotal) || shippingPrice * quantity;
    const lineDiscountTotal = orderNumber(item.lineDiscountTotal) || discountAmount * quantity;
    const lineProductCostTotal = orderNumber(item.lineProductCostTotal) || productCost * quantity;
    const lineTotal = orderNumber(item.lineTotal) || lineSubtotal + lineShippingTotal;
    const lineProfitTotal =
      orderNumber(item.lineProfitTotal) ||
      lineSubtotal - (lineProductCostTotal + lineShippingTotal + lineDiscountTotal);

    return {
      quantity,
      lineSubtotal,
      lineShippingTotal,
      lineDiscountTotal,
      lineProductCostTotal,
      lineTotal,
      lineProfitTotal,
    };
  };

  const normalizeOrderMetrics = (order = {}) => {
    const items = Array.isArray(order.items) ? order.items : [];
    const normalizedItems = items.map(normalizeItemMetrics);

    const itemsSubtotal = normalizedItems.reduce((sum, item) => sum + item.lineSubtotal, 0);
    const itemsShipping = normalizedItems.reduce((sum, item) => sum + item.lineShippingTotal, 0);
    const itemsDiscount = normalizedItems.reduce((sum, item) => sum + item.lineDiscountTotal, 0);
    const itemsProductCost = normalizedItems.reduce((sum, item) => sum + item.lineProductCostTotal, 0);
    const itemsProfit = normalizedItems.reduce((sum, item) => sum + item.lineProfitTotal, 0);

    const subtotal = orderNumber(order.subtotalAmount) || itemsSubtotal;
    const shipping = orderNumber(order.shippingTotal) || itemsShipping;
    const discount = orderNumber(order.discountTotal) || itemsDiscount;
    const productCost = orderNumber(order.productCostTotal) || itemsProductCost;
    const total = orderNumber(order.totalAmount) || subtotal + shipping;
    const profit = orderNumber(order.profitTotal) || subtotal - (productCost + shipping + discount);

    return {
      items,
      normalizedItems,
      subtotal,
      shipping,
      discount,
      productCost,
      total,
      profit,
    };
  };

  const summary = reportableOrders.reduce(
    (acc, order) => {
      const { items, subtotal, shipping, discount, productCost, profit, total } = normalizeOrderMetrics(order);

      acc.totalSales += total;
      acc.totalShippingCollected += shipping;
      acc.totalDiscountGiven += discount;
      acc.totalProductCost += productCost;
      acc.totalProfit += profit;
      acc.numberOfOrders += 1;
      acc.numberOfProductsSold += items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
      return acc;
    },
    {
      totalSales: 0,
      totalShippingCollected: 0,
      totalDiscountGiven: 0,
      totalProductCost: 0,
      totalProfit: 0,
      numberOfOrders: 0,
      numberOfProductsSold: 0,
    }
  );

  const soldProductsMap = new Map();
  const trendMap = new Map();
  const orderTrendMap = new Map();

  for (const order of reportableOrders) {
    const dayKey = String(order.createdAt || "").slice(0, 10);
    const { normalizedItems, total, profit } = normalizeOrderMetrics(order);

    if (!trendMap.has(dayKey)) {
      trendMap.set(dayKey, {
        date: dayKey,
        sales: 0,
        profit: 0,
        orders: 0,
      });
    }

    if (!orderTrendMap.has(dayKey)) {
      orderTrendMap.set(dayKey, {
        date: dayKey,
        orders: 0,
      });
    }

    const trendEntry = trendMap.get(dayKey);
    trendEntry.sales += total;
    trendEntry.profit += profit;
    trendEntry.orders += 1;

    const orderTrendEntry = orderTrendMap.get(dayKey);
    orderTrendEntry.orders += 1;

    for (let index = 0; index < (order.items || []).length; index += 1) {
      const item = order.items[index] || {};
      const normalizedItem = normalizedItems[index] || normalizeItemMetrics(item);
      const key = `${item.productId || "unknown"}:${item.name || "Unknown"}`;
      if (!soldProductsMap.has(key)) {
        soldProductsMap.set(key, {
          productId: item.productId,
          name: item.name,
          quantitySold: 0,
          sales: 0,
          shipping: 0,
          discount: 0,
          productCost: 0,
          profit: 0,
        });
      }
      const entry = soldProductsMap.get(key);
      entry.quantitySold += normalizedItem.quantity;
      entry.sales += normalizedItem.lineTotal;
      entry.shipping += normalizedItem.lineShippingTotal;
      entry.discount += normalizedItem.lineDiscountTotal;
      entry.productCost += normalizedItem.lineProductCostTotal;
      entry.profit += normalizedItem.lineProfitTotal;
    }
  }

  const soldProducts = [...soldProductsMap.values()].sort((a, b) => b.profit - a.profit);
  const trend = [...trendMap.values()].sort((a, b) => a.date.localeCompare(b.date));
  const orderTrend = [...orderTrendMap.values()].sort((a, b) => a.date.localeCompare(b.date));

  res.json({
    period,
    range: {
      from: range.from.toISOString(),
      to: range.to.toISOString(),
    },
    summary,
    orders: reportableOrders,
    soldProducts,
    trend,
    orderTrend,
  });
});
