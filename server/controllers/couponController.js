import asyncHandler from "express-async-handler";
import supabase from "../config/supabase.js";
import { normalizeCouponCode, validateCouponForCart } from "../services/couponEngine.js";

const allowedDiscountTypes = ["percentage", "fixed"];
const allowedStatus = ["active", "inactive"];
const allowedScopeTypes = ["all", "products", "categories"];

const mapCoupon = (row = {}, stats = {}) => {
  const nowDateOnly = new Date().toISOString().slice(0, 10);
  const isExpired = Boolean(row.end_date) && row.end_date < nowDateOnly;
  const totalUsed = Number(stats.totalUsed ?? row.usage_count ?? 0);
  const uniqueUsers = Number(stats.uniqueUsers || 0);
  const totalLimit = row.total_usage_limit == null ? null : Number(row.total_usage_limit || 0);

  return {
    id: row.id,
    code: row.code || "",
    title: row.title || "",
    discountType: row.discount_type || "percentage",
    discountValue: Number(row.discount_value || 0),
    minimumOrderAmount: Number(row.minimum_order_amount || 0),
    maximumDiscountAmount: row.maximum_discount_amount == null ? null : Number(row.maximum_discount_amount || 0),
    scopeType: row.scope_type || "all",
    applicableProductIds: Array.isArray(row.applicable_product_ids) ? row.applicable_product_ids : [],
    applicableCategories: Array.isArray(row.applicable_categories) ? row.applicable_categories : [],
    startDate: row.start_date || null,
    endDate: row.end_date || null,
    status: row.status || "inactive",
    totalUsageLimit: row.total_usage_limit == null ? null : Number(row.total_usage_limit || 0),
    perUserUsageLimit: row.per_user_usage_limit == null ? null : Number(row.per_user_usage_limit || 0),
    usageCount: totalUsed,
    uniqueUsersUsed: uniqueUsers,
    isExpired,
    usageProgressPercent:
      totalLimit && totalLimit > 0 ? Number(Math.min(100, (totalUsed / totalLimit) * 100).toFixed(2)) : null,
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || null,
  };
};

const parseCouponPayload = (body = {}) => {
  const code = normalizeCouponCode(body.code);
  const title = String(body.title || "").trim();
  const discountType = String(body.discountType || "").trim().toLowerCase();
  const discountValue = Number(body.discountValue || 0);
  const minimumOrderAmount = Number(body.minimumOrderAmount || 0);
  const maximumDiscountAmount =
    body.maximumDiscountAmount == null || String(body.maximumDiscountAmount).trim() === ""
      ? null
      : Number(body.maximumDiscountAmount);
  const scopeType = String(body.scopeType || "all").trim().toLowerCase();
  const applicableProductIds = Array.isArray(body.applicableProductIds)
    ? body.applicableProductIds.map((entry) => String(entry || "").trim()).filter(Boolean)
    : [];
  const applicableCategories = Array.isArray(body.applicableCategories)
    ? body.applicableCategories.map((entry) => String(entry || "").trim()).filter(Boolean)
    : [];
  const status = String(body.status || "inactive").trim().toLowerCase();
  const totalUsageLimit =
    body.totalUsageLimit == null || String(body.totalUsageLimit).trim() === "" ? null : Number(body.totalUsageLimit);
  const perUserUsageLimit =
    body.perUserUsageLimit == null || String(body.perUserUsageLimit).trim() === "" ? null : Number(body.perUserUsageLimit);
  const startDate = String(body.startDate || "").trim() || null;
  const endDate = String(body.endDate || "").trim() || null;

  if (!code) {
    throw new Error("Coupon code is required");
  }

  if (!title) {
    throw new Error("Coupon title is required");
  }

  if (!allowedDiscountTypes.includes(discountType)) {
    throw new Error("Invalid discount type");
  }

  if (!Number.isFinite(discountValue) || discountValue <= 0) {
    throw new Error("Discount value must be greater than zero");
  }

  if (discountType === "percentage" && discountValue > 100) {
    throw new Error("Percentage discount cannot exceed 100");
  }

  if (!Number.isFinite(minimumOrderAmount) || minimumOrderAmount < 0) {
    throw new Error("Minimum order amount must be a non-negative number");
  }

  if (maximumDiscountAmount != null && (!Number.isFinite(maximumDiscountAmount) || maximumDiscountAmount < 0)) {
    throw new Error("Maximum discount amount must be a non-negative number");
  }

  if (!allowedScopeTypes.includes(scopeType)) {
    throw new Error("Invalid coupon scope");
  }

  if (!allowedStatus.includes(status)) {
    throw new Error("Invalid coupon status");
  }

  if (totalUsageLimit != null && (!Number.isFinite(totalUsageLimit) || totalUsageLimit <= 0)) {
    throw new Error("Total usage limit must be greater than zero");
  }

  if (perUserUsageLimit != null && (!Number.isFinite(perUserUsageLimit) || perUserUsageLimit <= 0)) {
    throw new Error("Per-user usage limit must be greater than zero");
  }

  if (startDate && Number.isNaN(new Date(startDate).getTime())) {
    throw new Error("Start date must be valid");
  }

  if (endDate && Number.isNaN(new Date(endDate).getTime())) {
    throw new Error("End date must be valid");
  }

  if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
    throw new Error("Start date cannot be after end date");
  }

  return {
    code,
    title,
    discount_type: discountType,
    discount_value: discountValue,
    minimum_order_amount: minimumOrderAmount,
    maximum_discount_amount: maximumDiscountAmount,
    scope_type: scopeType,
    applicable_product_ids: scopeType === "products" ? applicableProductIds : [],
    applicable_categories: scopeType === "categories" ? applicableCategories : [],
    status,
    total_usage_limit: totalUsageLimit,
    per_user_usage_limit: perUserUsageLimit,
    start_date: startDate,
    end_date: endDate,
    updated_at: new Date().toISOString(),
  };
};

const loadCouponStatsMap = async (couponIds = []) => {
  if (!couponIds.length) {
    return new Map();
  }

  const { data: usages, error } = await supabase
    .from("coupon_usages")
    .select("coupon_id, user_id")
    .in("coupon_id", couponIds);

  if (error) {
    throw new Error(error.message);
  }

  const statsMap = new Map();
  for (const couponId of couponIds) {
    statsMap.set(couponId, { totalUsed: 0, uniqueUsers: 0 });
  }

  const uniqueByCoupon = new Map();
  for (const usage of usages || []) {
    const couponId = usage.coupon_id;
    const existing = statsMap.get(couponId) || { totalUsed: 0, uniqueUsers: 0 };
    existing.totalUsed += 1;
    statsMap.set(couponId, existing);

    const uniqueSet = uniqueByCoupon.get(couponId) || new Set();
    if (usage.user_id) {
      uniqueSet.add(String(usage.user_id));
    }
    uniqueByCoupon.set(couponId, uniqueSet);
  }

  for (const [couponId, set] of uniqueByCoupon.entries()) {
    const existing = statsMap.get(couponId) || { totalUsed: 0, uniqueUsers: 0 };
    existing.uniqueUsers = set.size;
    statsMap.set(couponId, existing);
  }

  return statsMap;
};

export const getAdminCoupons = asyncHandler(async (req, res) => {
  const { data, error } = await supabase
    .from("coupons")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    res.status(500);
    throw new Error(error.message);
  }

  const rows = data || [];
  const statsMap = await loadCouponStatsMap(rows.map((row) => row.id));
  return res.json(rows.map((row) => mapCoupon(row, statsMap.get(row.id) || {})));
});

export const createAdminCoupon = asyncHandler(async (req, res) => {
  let payload;
  try {
    payload = parseCouponPayload(req.body);
  } catch (error) {
    res.status(400);
    throw new Error(error.message);
  }

  const { data, error } = await supabase
    .from("coupons")
    .insert({ ...payload, created_at: new Date().toISOString() })
    .select("*")
    .single();

  if (error) {
    res.status(500);
    throw new Error(error.message);
  }

  return res.status(201).json(mapCoupon(data));
});

export const updateAdminCoupon = asyncHandler(async (req, res) => {
  let payload;
  try {
    payload = parseCouponPayload(req.body);
  } catch (error) {
    res.status(400);
    throw new Error(error.message);
  }

  const { data, error } = await supabase
    .from("coupons")
    .update(payload)
    .eq("id", req.params.id)
    .select("*")
    .maybeSingle();

  if (error) {
    res.status(500);
    throw new Error(error.message);
  }

  if (!data) {
    res.status(404);
    throw new Error("Coupon not found");
  }

  const statsMap = await loadCouponStatsMap([data.id]);
  return res.json(mapCoupon(data, statsMap.get(data.id) || {}));
});

export const deleteAdminCoupon = asyncHandler(async (req, res) => {
  const { count, error: usageError } = await supabase
    .from("coupon_usages")
    .select("id", { count: "exact", head: true })
    .eq("coupon_id", req.params.id);

  if (usageError) {
    res.status(500);
    throw new Error(usageError.message);
  }

  if (Number(count || 0) > 0) {
    res.status(400);
    throw new Error("Cannot delete a coupon that has usage history. Disable it instead.");
  }

  const { error } = await supabase.from("coupons").delete().eq("id", req.params.id);

  if (error) {
    res.status(500);
    throw new Error(error.message);
  }

  return res.json({ message: "Coupon deleted" });
});

export const applyCouponForCheckout = asyncHandler(async (req, res) => {
  const code = normalizeCouponCode(req.body.code);
  if (!code) {
    res.status(400);
    throw new Error("Coupon code is required");
  }

  const { data: cart, error: cartError } = await supabase
    .from("carts")
    .select("id")
    .eq("user_id", req.user._id)
    .maybeSingle();

  if (cartError) {
    res.status(500);
    throw new Error(cartError.message);
  }

  if (!cart) {
    res.status(400);
    throw new Error("Cart is empty");
  }

  const { data: cartItems, error: itemsError } = await supabase
    .from("cart_items")
    .select("quantity, variation_id, products(id, category, shipping_price), product_variations(id, product_id, price, discounted_price)")
    .eq("cart_id", cart.id);

  if (itemsError) {
    res.status(500);
    throw new Error(itemsError.message);
  }

  const rows = cartItems || [];
  if (!rows.length) {
    res.status(400);
    throw new Error("Cart is empty");
  }

  const resolveUnitPrice = (variation = {}) => {
    const price = Number(variation.price || 0);
    const discounted = variation.discounted_price == null ? null : Number(variation.discounted_price);
    if (Number.isFinite(discounted) && discounted > 0 && discounted < price) {
      return discounted;
    }
    return price;
  };

  const itemSnapshots = rows.map((row) => {
    if (!row.variation_id || !row.product_variations) {
      res.status(400);
      throw new Error("Cart items must include a selected variation");
    }

    const unitPrice = resolveUnitPrice(row.product_variations);
    const quantity = Number(row.quantity || 0);
    return {
      productId: row.products?.id,
      category: row.products?.category || "",
      quantity,
      unitPrice,
      subtotal: Number((unitPrice * quantity).toFixed(2)),
    };
  });

  const subtotalAmount = itemSnapshots.reduce((sum, item) => sum + Number(item.subtotal || 0), 0);
  const shippingAmount = rows.reduce(
    (sum, row) => sum + Number(row.quantity || 0) * Number(row.products?.shipping_price || 0),
    0
  );

  let result;
  try {
    result = await validateCouponForCart({
      couponCode: code,
      userId: req.user._id,
      itemSnapshots,
      subtotalAmount,
    });
  } catch (error) {
    res.status(error.status || 400);
    throw new Error(error.message);
  }

  const totalBeforeDiscount = Number(subtotalAmount) + Number(shippingAmount);
  const totalAfterDiscount = Math.max(0, totalBeforeDiscount - Number(result.discountAmount || 0));

  return res.json({
    message: "Coupon applied successfully",
    couponCode: result.code,
    discountAmount: Number(result.discountAmount || 0),
    totalAfterDiscount: Number(totalAfterDiscount.toFixed(2)),
    coupon: {
      id: result.coupon.id,
      code: result.code,
      title: result.coupon.title,
      discountType: result.coupon.discount_type,
      discountValue: Number(result.coupon.discount_value || 0),
      discountAmount: Number(result.discountAmount || 0),
      eligibleSubtotal: Number(result.eligibleSubtotal || 0),
    },
    summary: {
      subtotal: Number(subtotalAmount.toFixed(2)),
      shipping: Number(shippingAmount.toFixed(2)),
      totalBeforeDiscount: Number(totalBeforeDiscount.toFixed(2)),
      totalAfterDiscount: Number(totalAfterDiscount.toFixed(2)),
    },
  });
});
