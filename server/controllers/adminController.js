import asyncHandler from "express-async-handler";
import supabase from "../config/supabase.js";
import { mapOrder, mapProduct, mapUser } from "../utils/dbMappers.js";

const orderSelect =
  "id, user_id, subtotal_amount, shipping_total, discount_total, product_cost_total, profit_total, total_amount, payment_status, order_status, payment_method, payment_intent_id, created_at, updated_at, users:user_id(id, name, email), order_items(product_id, name, image, price, list_price, discount_amount, product_cost, shipping_price, quantity, line_subtotal, line_shipping_total, line_discount_total, line_product_cost_total, line_total, line_profit_total), order_shipping_addresses(full_name, line1, line2, city, state, postal_code, country, phone)";

const productSelect =
  "id, name, description, price, discount_price, product_cost, shipping_price, category, stock, rating, created_at, updated_at, product_images(image_url, sort_order), product_reviews(id, user_id, name, rating, comment, created_at, updated_at)";

const settingsSelect = "*";

const defaultStoreSettings = {
  storeName: "Woodmart.lk",
  supportEmail: "",
  contactNumber: "",
  storeAddress: "",
  currency: "Rs.",
  freeShippingThreshold: 199,
  themeAccent: "#0959a4",
};

const isMissingRelationError = (message = "") => {
  const normalized = String(message).toLowerCase();
  return normalized.includes("could not find") && (normalized.includes("relation") || normalized.includes("table"));
};

const isMissingColumnError = (message = "") => {
  const normalized = String(message).toLowerCase();
  return normalized.includes("column") && normalized.includes("does not exist");
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
  currency: row.currency ?? defaultStoreSettings.currency,
  freeShippingThreshold: Number(
    row.free_shipping_threshold ?? defaultStoreSettings.freeShippingThreshold
  ),
  themeAccent: row.theme_accent ?? defaultStoreSettings.themeAccent,
});

const normalizeNumericSetting = (value, fallback) => {
  const normalized = Number(value);
  return Number.isFinite(normalized) ? normalized : fallback;
};

const buildStoreSettingsPayload = (body = {}) => ({
  id: true,
  store_name: String(body.storeName ?? defaultStoreSettings.storeName).trim() || defaultStoreSettings.storeName,
  support_email: String(body.supportEmail ?? "").trim() || null,
  contact_number: String(body.contactNumber ?? "").trim() || null,
  store_address: String(body.storeAddress ?? "").trim() || null,
  currency: String(body.currency ?? defaultStoreSettings.currency).trim() || defaultStoreSettings.currency,
  free_shipping_threshold: Math.max(
    0,
    normalizeNumericSetting(body.freeShippingThreshold, defaultStoreSettings.freeShippingThreshold)
  ),
  theme_accent: String(body.themeAccent ?? defaultStoreSettings.themeAccent).trim() || defaultStoreSettings.themeAccent,
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
      throw new Error("Run the latest schema SQL to add support email and store address settings");
    }

    res.status(500);
    throw new Error(error.message);
  }

  return res.json(mapStoreSettings(data));
});

export const getAdminDashboardStats = asyncHandler(async (req, res) => {
  const [productsCount, ordersCount, usersCount, recentOrdersRes, lowStockRes, revenueOrdersRes] =
    await Promise.all([
      supabase.from("products").select("id", { count: "exact", head: true }),
      supabase.from("orders").select("id", { count: "exact", head: true }),
      supabase.from("users").select("id", { count: "exact", head: true }),
      supabase.from("orders").select(orderSelect).order("created_at", { ascending: false }).limit(5),
      supabase.from("products").select(productSelect).lte("stock", 10).order("stock", { ascending: true }).limit(8),
      supabase.from("orders").select("total_amount, payment_status, order_status"),
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

  res.json({
    totals: {
      products: productsCount.count || 0,
      orders: ordersCount.count || 0,
      users: usersCount.count || 0,
      revenue: totalRevenue,
    },
    recentOrders: (recentOrdersRes.data || []).map((row) => mapOrder(row, { includeUser: true })),
    lowStockProducts: (lowStockRes.data || []).map(mapProduct),
  });
});

export const getAllOrdersAdmin = asyncHandler(async (req, res) => {
  const { paymentStatus, orderStatus, q } = req.query;
  let queryBuilder = supabase.from("orders").select(orderSelect).order("created_at", { ascending: false });

  if (paymentStatus) queryBuilder = queryBuilder.eq("payment_status", paymentStatus);
  if (orderStatus) queryBuilder = queryBuilder.eq("order_status", orderStatus);

  const { data, error } = await queryBuilder;
  if (error) {
    res.status(500);
    throw new Error(error.message);
  }

  let orders = (data || []).map((row) => mapOrder(row, { includeUser: true }));

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

export const updateOrderStatusAdmin = asyncHandler(async (req, res) => {
  const { orderStatus, paymentStatus } = req.body;

  const payload = {};
  if (orderStatus) payload.order_status = orderStatus;
  if (paymentStatus) payload.payment_status = paymentStatus;

  const { data: existing, error: existingError } = await supabase
    .from("orders")
    .select("id")
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
  const { role } = req.body;

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

  const { data: updated, error: updateError } = await supabase
    .from("users")
    .update({ role })
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

  const summary = orders.reduce(
    (acc, order) => {
      const items = Array.isArray(order.items) ? order.items : [];
      const subtotal = orderNumber(order.subtotalAmount) || items.reduce((sum, item) => sum + orderNumber(item.lineSubtotal), 0);
      const shipping = orderNumber(order.shippingTotal) || items.reduce((sum, item) => sum + orderNumber(item.lineShippingTotal), 0);
      const discount = orderNumber(order.discountTotal) || items.reduce((sum, item) => sum + orderNumber(item.lineDiscountTotal), 0);
      const productCost = orderNumber(order.productCostTotal) || items.reduce((sum, item) => sum + orderNumber(item.lineProductCostTotal), 0);
      const profit = orderNumber(order.profitTotal) || items.reduce((sum, item) => sum + orderNumber(item.lineProfitTotal), 0);
      const total = orderNumber(order.totalAmount) || subtotal + shipping;

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

  for (const order of orders) {
    const dayKey = String(order.createdAt || "").slice(0, 10);
    if (!trendMap.has(dayKey)) {
      trendMap.set(dayKey, {
        date: dayKey,
        sales: 0,
        profit: 0,
        orders: 0,
      });
    }
    const trendEntry = trendMap.get(dayKey);
    trendEntry.sales += orderNumber(order.totalAmount);
    trendEntry.profit += orderNumber(order.profitTotal);
    trendEntry.orders += 1;

    for (const item of order.items || []) {
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
      entry.quantitySold += Number(item.quantity || 0);
      entry.sales += orderNumber(item.lineTotal);
      entry.shipping += orderNumber(item.lineShippingTotal);
      entry.discount += orderNumber(item.lineDiscountTotal);
      entry.productCost += orderNumber(item.lineProductCostTotal);
      entry.profit += orderNumber(item.lineProfitTotal);
    }
  }

  const soldProducts = [...soldProductsMap.values()].sort((a, b) => b.profit - a.profit);
  const trend = [...trendMap.values()].sort((a, b) => a.date.localeCompare(b.date));

  res.json({
    period,
    range: {
      from: range.from.toISOString(),
      to: range.to.toISOString(),
    },
    summary,
    orders,
    soldProducts,
    trend,
  });
});
