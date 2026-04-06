import supabase from "../config/supabase.js";

export const normalizeCouponCode = (value = "") => String(value || "").trim().toUpperCase();

const buildCouponError = (message, code = "INVALID_COUPON", status = 400) => {
  const error = new Error(message);
  error.code = code;
  error.status = status;
  return error;
};

const toDateOnly = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
};

const isWithinDateWindow = (coupon, nowDateOnly) => {
  const startOk = !coupon.start_date || coupon.start_date <= nowDateOnly;
  const endOk = !coupon.end_date || coupon.end_date >= nowDateOnly;
  return startOk && endOk;
};

const calculateEligibleSubtotal = (coupon, itemSnapshots = [], subtotalAmount = 0) => {
  const scopeType = coupon.scope_type || "all";

  if (scopeType === "all") {
    return Number(subtotalAmount || 0);
  }

  if (scopeType === "products") {
    const productIds = new Set((coupon.applicable_product_ids || []).map((id) => String(id)));
    return itemSnapshots.reduce((sum, item) => {
      if (!productIds.has(String(item.productId))) return sum;
      return sum + Number(item.subtotal || 0);
    }, 0);
  }

  if (scopeType === "categories") {
    const categories = new Set(
      (coupon.applicable_categories || [])
        .map((entry) => String(entry || "").trim().toLowerCase())
        .filter(Boolean)
    );

    return itemSnapshots.reduce((sum, item) => {
      const category = String(item.category || "").trim().toLowerCase();
      if (!categories.has(category)) return sum;
      return sum + Number(item.subtotal || 0);
    }, 0);
  }

  return Number(subtotalAmount || 0);
};

const calculateDiscountAmount = (coupon, eligibleSubtotal = 0) => {
  const discountType = String(coupon.discount_type || "").toLowerCase();
  const discountValue = Number(coupon.discount_value || 0);
  const subtotal = Number(eligibleSubtotal || 0);

  if (subtotal <= 0 || discountValue <= 0) {
    return 0;
  }

  if (discountType === "fixed") {
    return Number(Math.min(discountValue, subtotal).toFixed(2));
  }

  const rawPercentageDiscount = (subtotal * discountValue) / 100;
  const maxDiscount = coupon.maximum_discount_amount == null ? null : Number(coupon.maximum_discount_amount || 0);
  const capped = maxDiscount == null ? rawPercentageDiscount : Math.min(rawPercentageDiscount, maxDiscount);
  return Number(Math.min(capped, subtotal).toFixed(2));
};

export const validateCouponForCart = async ({
  couponCode,
  userId,
  itemSnapshots,
  subtotalAmount,
}) => {
  const normalizedCode = normalizeCouponCode(couponCode);
  if (!normalizedCode) {
    throw buildCouponError("Please enter a coupon code", "COUPON_CODE_REQUIRED", 400);
  }

  const { data: coupon, error: couponError } = await supabase
    .from("coupons")
    .select("*")
    .eq("code", normalizedCode)
    .maybeSingle();

  if (couponError) {
    throw buildCouponError(couponError.message, "COUPON_QUERY_FAILED", 500);
  }

  if (!coupon) {
    throw buildCouponError("Invalid coupon code", "COUPON_NOT_FOUND", 404);
  }

  if (coupon.status !== "active") {
    throw buildCouponError("This coupon is inactive", "COUPON_INACTIVE", 400);
  }

  const nowDateOnly = toDateOnly(new Date());
  if (!isWithinDateWindow(coupon, nowDateOnly)) {
    throw buildCouponError("This coupon has expired or is not yet valid", "COUPON_EXPIRED", 400);
  }

  const orderSubtotal = Number(subtotalAmount || 0);
  if (orderSubtotal < Number(coupon.minimum_order_amount || 0)) {
    throw buildCouponError(
      `Minimum order amount for this coupon is Rs. ${Number(coupon.minimum_order_amount || 0).toFixed(2)}`,
      "MIN_ORDER_NOT_MET",
      400
    );
  }

  const [{ count: totalUsed = 0, error: totalUsedError }, { count: userUsed = 0, error: userUsedError }] =
    await Promise.all([
      supabase
        .from("coupon_usages")
        .select("id", { count: "exact", head: true })
        .eq("coupon_id", coupon.id),
      supabase
        .from("coupon_usages")
        .select("id", { count: "exact", head: true })
        .eq("coupon_id", coupon.id)
        .eq("user_id", userId),
    ]);

  if (totalUsedError || userUsedError) {
    throw buildCouponError(totalUsedError?.message || userUsedError?.message || "Failed to validate coupon usage", "USAGE_QUERY_FAILED", 500);
  }

  if (coupon.total_usage_limit != null && Number(totalUsed) >= Number(coupon.total_usage_limit)) {
    throw buildCouponError("Coupon usage limit has been reached", "TOTAL_LIMIT_REACHED", 400);
  }

  if (coupon.per_user_usage_limit != null && Number(userUsed) >= Number(coupon.per_user_usage_limit)) {
    throw buildCouponError("You have already used this coupon the maximum number of times", "PER_USER_LIMIT_REACHED", 400);
  }

  const eligibleSubtotal = calculateEligibleSubtotal(coupon, itemSnapshots, orderSubtotal);
  if (eligibleSubtotal <= 0) {
    throw buildCouponError("This coupon is not applicable to items in your cart", "SCOPE_NOT_APPLICABLE", 400);
  }

  const discountAmount = calculateDiscountAmount(coupon, eligibleSubtotal);
  if (discountAmount <= 0) {
    throw buildCouponError("This coupon does not produce a valid discount", "DISCOUNT_INVALID", 400);
  }

  return {
    coupon,
    code: normalizedCode,
    discountAmount,
    eligibleSubtotal: Number(eligibleSubtotal.toFixed(2)),
    totalUsed: Number(totalUsed || 0),
    userUsed: Number(userUsed || 0),
  };
};

export const recordCouponUsageForOrder = async ({
  coupon,
  userId,
  orderId,
  discountAmount,
}) => {
  const normalizedCode = normalizeCouponCode(coupon?.code || "");

  const { error: usageError } = await supabase.from("coupon_usages").insert({
    coupon_id: coupon.id,
    user_id: userId,
    order_id: orderId,
    coupon_code: normalizedCode,
    discount_amount: Number(discountAmount || 0),
  });

  if (usageError) {
    throw new Error(usageError.message);
  }

  const nextUsageCount = Number(coupon.usage_count || 0) + 1;
  await supabase
    .from("coupons")
    .update({ usage_count: nextUsageCount })
    .eq("id", coupon.id);
};
