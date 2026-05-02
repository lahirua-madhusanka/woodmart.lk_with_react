import asyncHandler from "express-async-handler";
import Stripe from "stripe";
import env from "../config/env.js";
import supabase from "../config/supabase.js";
import { recordCouponUsageForOrder, validateCouponForCart } from "../services/couponEngine.js";
import { addOrderStatusHistory, autoDeliverIfDue } from "../services/orderWorkflow.js";
import { sendOrderConfirmationEmail } from "../services/orderConfirmationEmailService.js";
import { getActivePromotionMapForProductIds } from "../services/promotionPricingService.js";
import { mapOrder } from "../utils/dbMappers.js";

const stripe = env.stripeSecretKey ? new Stripe(env.stripeSecretKey) : null;

const orderSelect =
  "id, user_id, subtotal_amount, shipping_total, discount_total, product_cost_total, profit_total, total_amount, payment_status, order_status, payment_method, payment_intent_id, transaction_id, paid_amount, tracking_number, courier_name, admin_note, tracking_added_at, shipped_at, out_for_delivery_at, delivered_at, returned_at, cancelled_at, invoice_number, coupon_id, coupon_code, coupon_title, coupon_discount_type, coupon_discount_value, coupon_discount_amount, created_at, updated_at, users:user_id(id, name, email), order_items(product_id, name, image, sku, variation_id, variation_name, variation_sku, variation_image, variation_price, price, list_price, discount_amount, product_cost, shipping_price, quantity, line_subtotal, line_shipping_total, line_discount_total, line_product_cost_total, line_total, line_profit_total, promotion_id, promotion_title, promotion_slug, promotion_discount_percentage, promotion_original_price, promotion_discounted_price, promotion_active), order_shipping_addresses(full_name, line1, line2, city, state, postal_code, country, phone), order_status_history(id, order_status, note, changed_by, changed_at, users:changed_by(name, email))";

const orderSelectLegacy =
  "id, user_id, subtotal_amount, shipping_total, discount_total, product_cost_total, profit_total, total_amount, payment_status, order_status, payment_method, payment_intent_id, transaction_id, paid_amount, tracking_number, courier_name, admin_note, tracking_added_at, shipped_at, out_for_delivery_at, delivered_at, returned_at, cancelled_at, invoice_number, coupon_id, coupon_code, coupon_title, coupon_discount_type, coupon_discount_value, coupon_discount_amount, created_at, updated_at, users:user_id(id, name, email), order_items(product_id, name, image, sku, variation_id, variation_name, variation_sku, variation_image, variation_price, price, list_price, discount_amount, product_cost, shipping_price, quantity, line_subtotal, line_shipping_total, line_discount_total, line_product_cost_total, line_total, line_profit_total), order_shipping_addresses(full_name, line1, line2, city, state, postal_code, country, phone), order_status_history(id, order_status, note, changed_by, changed_at, users:changed_by(name, email))";

const mapAddressRow = (row) => ({
  id: row.id,
  fullName: row.full_name,
  email: row.email,
  phone: row.phone,
  line1: row.line1,
  line2: row.line2,
  city: row.city,
  state: row.state || "",
  postalCode: row.postal_code,
  country: row.country,
  isDefault: Boolean(row.is_default),
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const isMissingTableError = (error, tableName) => {
  const message = String(error?.message || "").toLowerCase();
  const details = String(error?.details || "").toLowerCase();
  const schemaRef = `'public.${String(tableName || "").toLowerCase()}'`;
  return (
    (message.includes("schema cache") && message.includes(schemaRef)) ||
    message.includes(`relation \"public.${String(tableName || "").toLowerCase()}\" does not exist`) ||
    details.includes(`relation \"public.${String(tableName || "").toLowerCase()}\" does not exist`)
  );
};

const isMissingColumnError = (error, columnName) => {
  const message = String(error?.message || "").toLowerCase();
  const details = String(error?.details || "").toLowerCase();
  const column = String(columnName || "").toLowerCase();
  return (
    message.includes("could not find the") && message.includes(column) && message.includes("schema cache")
  ) || details.includes(`column ${column} does not exist`) || message.includes(`column ${column} does not exist`);
};

const isMissingPromotionSnapshotColumnError = (error) => {
  const columns = [
    "promotion_id",
    "promotion_title",
    "promotion_slug",
    "promotion_discount_percentage",
    "promotion_original_price",
    "promotion_discounted_price",
    "promotion_active",
  ];

  return columns.some((column) => isMissingColumnError(error, column));
};

const loadOrderById = async (id, includeUser = true) => {
  let { data, error } = await supabase
    .from("orders")
    .select(orderSelect)
    .eq("id", id)
    .maybeSingle();

  if (error && isMissingPromotionSnapshotColumnError(error)) {
    ({ data, error } = await supabase
      .from("orders")
      .select(orderSelectLegacy)
      .eq("id", id)
      .maybeSingle());
  }

  if (error) throw new Error(error.message);
  if (!data) return null;
  [data] = await autoDeliverIfDue([data]);
  return mapOrder(data, { includeUser });
};

const loadCartWithProducts = async (userId) => {
  const { data: cart, error: cartError } = await supabase
    .from("carts")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  if (cartError) {
    throw new Error(cartError.message);
  }

  if (!cart) {
    return { cart: null, items: [] };
  }

  const isMissingVariationNameColumnError = (message = "") => {
    const lowered = String(message || "").toLowerCase();
    return lowered.includes("product_variations") && lowered.includes("column") && (lowered.includes(".name") || lowered.includes('"name"'));
  };

  const isMissingVariationSellingColumnError = (message = "") => {
    const lowered = String(message || "").toLowerCase();
    return lowered.includes("product_variations") && lowered.includes("column") && (lowered.includes("discounted_price") || lowered.includes("cost") || lowered.includes("stock"));
  };

  const runSelect = async (variationSelect) =>
    supabase
      .from("cart_items")
      .select(
        `product_id, variation_id, quantity, product_variations(${variationSelect}), products(id, name, category, shipping_price, product_images(image_url, sort_order))`
      )
      .eq("cart_id", cart.id);

  let result = await runSelect("id, name, sku, price, discounted_price, cost, stock, image_url");

  if (result.error && isMissingVariationSellingColumnError(result.error.message)) {
    result = await runSelect("id, name, sku, price, image_url");
  }

  if (result.error && isMissingVariationNameColumnError(result.error.message)) {
    result = await runSelect("id, variation_name, sku, price, discounted_price, cost, stock, image_url");
  }

  if (result.error && isMissingVariationSellingColumnError(result.error.message)) {
    result = await runSelect("id, variation_name, sku, price, image_url");
  }

  if (result.error) {
    throw new Error(result.error.message);
  }

  return { cart, items: result.data || [] };
};

export const createPaymentIntent = asyncHandler(async (req, res) => {
  if (!stripe) {
    res.status(500);
    throw new Error("Stripe is not configured");
  }

  const { amount } = req.body;
  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(Number(amount) * 100),
    currency: "lkr",
    automatic_payment_methods: { enabled: true },
    metadata: { userId: req.user._id },
  });

  res.json({ clientSecret: paymentIntent.client_secret, paymentIntentId: paymentIntent.id });
});

export const createOrder = asyncHandler(async (req, res) => {
  const {
    shippingAddress,
    paymentStatus = "pending",
    paymentIntentId = "",
    paymentMethod = "cod",
    couponCode = "",
  } = req.body;

  const { cart, items } = await loadCartWithProducts(req.user._id);

  if (!cart || !items.length) {
    res.status(400);
    throw new Error("Cart is empty");
  }

  const resolveVariationName = (variation = {}) =>
    variation.name ?? variation.variation_name ?? "";

  const resolveVariationUnitPrice = (variation = {}) => {
    const price = Number(variation.price || 0);
    const discounted = variation.discounted_price == null ? null : Number(variation.discounted_price);
    if (Number.isFinite(discounted) && discounted > 0 && discounted < price) {
      return discounted;
    }
    return price;
  };

  for (const item of items) {
    if (!item.products) {
      res.status(400);
      throw new Error("One or more products in cart no longer exist");
    }
    if (!item.variation_id || !item.product_variations) {
      res.status(400);
      throw new Error(`Cart item for ${item.products.name} is missing a variation selection`);
    }

    if (Number(item.quantity || 0) > Number(item.product_variations.stock || 0)) {
      res.status(400);
      throw new Error(`Insufficient stock for ${item.products.name}`);
    }
  }

  const productIds = [...new Set(items.map((item) => item.products?.id).filter(Boolean))];
  const promotionMap = await getActivePromotionMapForProductIds(productIds);

  const orderItems = items.map((item) => {
    const variation = item.product_variations || null;
    const listPrice = Number(variation?.price || 0);
    const variationSelling = resolveVariationUnitPrice(variation || {});
    const promo = promotionMap.get(String(item.products?.id || ""));
    const promoPct = promo ? Math.max(0, Math.min(100, Number(promo.discountPercentage || 0))) : 0;
    const unitSellingPrice = promoPct > 0
      ? Number(Math.max(0, listPrice - (listPrice * promoPct) / 100).toFixed(2))
      : variationSelling;
    const unitDiscountAmount = Math.max(0, listPrice - unitSellingPrice);
    const unitProductCost = Number(variation?.cost || 0);
    const unitShippingPrice = Number(item.products.shipping_price ?? 0);
    const quantity = Number(item.quantity || 0);
    const lineSubtotal = unitSellingPrice * quantity;
    const lineShippingTotal = unitShippingPrice * quantity;
    const lineDiscountTotal = unitDiscountAmount * quantity;
    const lineProductCostTotal = unitProductCost * quantity;
    const lineTotal = lineSubtotal + lineShippingTotal;
    const lineProfitTotal = lineSubtotal - (lineProductCostTotal + lineShippingTotal + lineDiscountTotal);

    return {
      product_id: item.products.id,
      name: item.products.name,
      image:
        variation?.image_url ||
        item.products.product_images
          ?.slice()
          .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))[0]?.image_url || "",
      sku: variation?.sku || "",
      variation_id: variation?.id || null,
      variation_name: resolveVariationName(variation || {}) || null,
      variation_sku: variation?.sku || null,
      variation_image: variation?.image_url || null,
      variation_price: variation ? Number(variation.price || 0) : null,
      price: unitSellingPrice,
      list_price: listPrice,
      discount_amount: unitDiscountAmount,
      product_cost: unitProductCost,
      shipping_price: unitShippingPrice,
      quantity,
      line_subtotal: lineSubtotal,
      line_shipping_total: lineShippingTotal,
      line_discount_total: lineDiscountTotal,
      line_product_cost_total: lineProductCostTotal,
      line_total: lineTotal,
      line_profit_total: lineProfitTotal,
      promotion_id: promo?.promotionId || null,
      promotion_title: promo?.title || null,
      promotion_slug: promo?.slug || null,
      promotion_discount_percentage: promoPct,
      promotion_original_price: promoPct > 0 ? listPrice : null,
      promotion_discounted_price: promoPct > 0 ? unitSellingPrice : null,
      promotion_active: promoPct > 0,
    };
  });

  const subtotalAmount = orderItems.reduce((sum, item) => sum + Number(item.line_subtotal || 0), 0);
  const shippingTotal = orderItems.reduce((sum, item) => sum + Number(item.line_shipping_total || 0), 0);
  const productDiscountTotal = orderItems.reduce((sum, item) => sum + Number(item.line_discount_total || 0), 0);
  const productCostTotal = orderItems.reduce((sum, item) => sum + Number(item.line_product_cost_total || 0), 0);

  const itemSnapshots = orderItems.map((item) => ({
    productId: item.product_id,
    category: items.find((entry) => entry.product_id === item.product_id)?.products?.category || "",
    quantity: Number(item.quantity || 0),
    unitPrice: Number(item.price || 0),
    subtotal: Number(item.line_subtotal || 0),
  }));

  let couponValidation = null;
  if (String(couponCode || "").trim()) {
    try {
      couponValidation = await validateCouponForCart({
        couponCode,
        userId: req.user._id,
        itemSnapshots,
        subtotalAmount,
      });
    } catch (error) {
      res.status(error.status || 400);
      throw new Error(error.message);
    }
  }

  const couponDiscountAmount = Number(couponValidation?.discountAmount || 0);
  const discountTotal = productDiscountTotal + couponDiscountAmount;
  const totalAmount = Math.max(0, subtotalAmount + shippingTotal - couponDiscountAmount);
  const profitTotal = subtotalAmount - (productCostTotal + shippingTotal + productDiscountTotal + couponDiscountAmount);

  const { data: createdOrder, error: createOrderError } = await supabase
    .from("orders")
    .insert({
      user_id: req.user._id,
      subtotal_amount: subtotalAmount,
      shipping_total: shippingTotal,
      discount_total: discountTotal,
      product_cost_total: productCostTotal,
      profit_total: profitTotal,
      total_amount: totalAmount,
      payment_status: paymentStatus,
      order_status: "pending",
      payment_method: paymentMethod,
      payment_intent_id: paymentIntentId,
      transaction_id: paymentIntentId || null,
      paid_amount: paymentStatus === "paid" ? totalAmount : 0,
      coupon_id: couponValidation?.coupon?.id || null,
      coupon_code: couponValidation?.code || null,
      coupon_title: couponValidation?.coupon?.title || null,
      coupon_discount_type: couponValidation?.coupon?.discount_type || null,
      coupon_discount_value: couponValidation?.coupon?.discount_value ?? null,
      coupon_discount_amount: couponDiscountAmount,
    })
    .select("id")
    .single();

  if (createOrderError || !createdOrder) {
    res.status(500);
    throw new Error(createOrderError?.message || "Failed to create order");
  }

  // eslint-disable-next-line no-console
  console.log(
    "[ORDER]",
    JSON.stringify({
      event: "created",
      orderId: createdOrder.id,
      userId: req.user._id,
      paymentMethod,
      paymentStatus,
      totalAmount,
      timestamp: new Date().toISOString(),
    })
  );

  let { error: orderItemsError } = await supabase
    .from("order_items")
    .insert(orderItems.map((item) => ({ ...item, order_id: createdOrder.id })));

  if (orderItemsError && isMissingPromotionSnapshotColumnError(orderItemsError)) {
    const legacyItems = orderItems.map((item) => {
      const nextItem = { ...item };
      delete nextItem.promotion_id;
      delete nextItem.promotion_title;
      delete nextItem.promotion_slug;
      delete nextItem.promotion_discount_percentage;
      delete nextItem.promotion_original_price;
      delete nextItem.promotion_discounted_price;
      delete nextItem.promotion_active;
      return nextItem;
    });

    ({ error: orderItemsError } = await supabase
      .from("order_items")
      .insert(legacyItems.map((item) => ({ ...item, order_id: createdOrder.id }))));
  }

  if (orderItemsError) {
    res.status(500);
    throw new Error(orderItemsError.message);
  }

  const { error: addressError } = await supabase.from("order_shipping_addresses").insert({
    order_id: createdOrder.id,
    full_name: shippingAddress.fullName,
    line1: shippingAddress.line1,
    line2: shippingAddress.line2 || "",
    city: shippingAddress.city,
    state: shippingAddress.state || "",
    postal_code: shippingAddress.postalCode,
    country: shippingAddress.country,
    phone: shippingAddress.phone,
  });

  if (addressError) {
    res.status(500);
    throw new Error(addressError.message);
  }

  for (const item of items) {
    const variation = item.product_variations;
    const currentStock = Number(variation?.stock || 0);
    const nextStock = currentStock - Number(item.quantity || 0);

    if (nextStock < 0) {
      res.status(400);
      throw new Error(`Insufficient stock for ${item.products?.name || "product"}`);
    }

    const { error: stockError } = await supabase
      .from("product_variations")
      .update({ stock: nextStock })
      .eq("id", variation.id);

    if (stockError) {
      res.status(500);
      throw new Error(stockError.message);
    }
  }

  const { error: clearCartError } = await supabase
    .from("cart_items")
    .delete()
    .eq("cart_id", cart.id);

  if (clearCartError) {
    res.status(500);
    throw new Error(clearCartError.message);
  }

  if (couponValidation?.coupon) {
    try {
      await recordCouponUsageForOrder({
        coupon: couponValidation.coupon,
        userId: req.user._id,
        orderId: createdOrder.id,
        discountAmount: couponDiscountAmount,
      });
    } catch (error) {
      res.status(500);
      throw new Error(error.message || "Failed to track coupon usage");
    }
  }

  try {
    await addOrderStatusHistory({
      orderId: createdOrder.id,
      status: "pending",
      note: "Order placed by customer",
      changedBy: req.user._id,
    });
  } catch {
    // Non-blocking: order is already created.
  }

  const order = await loadOrderById(createdOrder.id, true);
  res.status(201).json(order);

  setImmediate(() => {
    sendOrderConfirmationEmail({
      ...order,
      customerEmail: order?.userId?.email || shippingAddress?.email || "",
      customerName: order?.userId?.name || shippingAddress?.fullName || "",
    }).catch((error) => {
      // eslint-disable-next-line no-console
      console.error(
        "[ORDER_CONFIRMATION_EMAIL]",
        JSON.stringify({
          event: "send_failed",
          orderId: createdOrder.id,
          userId: req.user._id,
          message: error?.message || "Unknown error",
          statusCode: error?.statusCode || null,
          providerStatus: error?.providerStatus || null,
          providerPayload: error?.providerPayload || null,
          timestamp: new Date().toISOString(),
        })
      );
    });
  });
});

export const getUserOrders = asyncHandler(async (req, res) => {
  let { data, error } = await supabase
    .from("orders")
    .select(orderSelect)
    .eq("user_id", req.user._id)
    .order("created_at", { ascending: false });

  if (error && isMissingPromotionSnapshotColumnError(error)) {
    ({ data, error } = await supabase
      .from("orders")
      .select(orderSelectLegacy)
      .eq("user_id", req.user._id)
      .order("created_at", { ascending: false }));
  }

  if (error) {
    res.status(500);
    throw new Error(error.message);
  }

  const rows = await autoDeliverIfDue(data || []);
  res.json(rows.map((row) => mapOrder(row, { includeUser: true })));
});

export const getOrderById = asyncHandler(async (req, res) => {
  const order = await loadOrderById(req.params.id, true);
  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }

  if (order.userId?._id !== req.user._id && req.user.role !== "admin") {
    res.status(403);
    throw new Error("Not authorized to view this order");
  }

  res.json(order);
});

export const getCheckoutProfile = asyncHandler(async (req, res) => {
  const { data: user, error: userError } = await supabase
    .from("users")
    .select("id, name, email")
    .eq("id", req.user._id)
    .single();

  if (userError || !user) {
    res.status(404);
    throw new Error("User not found");
  }

  const { data: addresses, error: addressError } = await supabase
    .from("user_addresses")
    .select("id, full_name, email, phone, line1, line2, city, state, postal_code, country, is_default, created_at, updated_at")
    .eq("user_id", req.user._id)
    .order("is_default", { ascending: false })
    .order("updated_at", { ascending: false });

  if (addressError && !isMissingTableError(addressError, "user_addresses")) {
    res.status(500);
    throw new Error(addressError.message);
  }

  const { data: latestOrder, error: latestOrderError } = await supabase
    .from("orders")
    .select("id, created_at")
    .eq("user_id", req.user._id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latestOrderError) {
    res.status(500);
    throw new Error(latestOrderError.message);
  }

  let latestShippingAddress = null;
  if (latestOrder?.id) {
    let shippingQuery = await supabase
      .from("order_shipping_addresses")
      .select("full_name, line1, line2, city, state, postal_code, country, phone")
      .eq("order_id", latestOrder.id)
      .limit(1)
      .maybeSingle();

    if (shippingQuery.error && isMissingColumnError(shippingQuery.error, "state")) {
      shippingQuery = await supabase
        .from("order_shipping_addresses")
        .select("full_name, line1, line2, city, postal_code, country, phone")
        .eq("order_id", latestOrder.id)
        .limit(1)
        .maybeSingle();
    }

    if (shippingQuery.error) {
      res.status(500);
      throw new Error(shippingQuery.error.message);
    }

    latestShippingAddress = shippingQuery.data || null;
  }

  res.json({
    customer: {
      fullName: user.name || "",
      email: user.email || "",
    },
    savedAddresses: (addresses || []).map(mapAddressRow),
    addressBookReady: !addressError,
    suggestedAddress: latestShippingAddress
      ? {
          fullName: latestShippingAddress.full_name || user.name || "",
          email: user.email || "",
          phone: latestShippingAddress.phone || "",
          line1: latestShippingAddress.line1 || "",
          line2: latestShippingAddress.line2 || "",
          city: latestShippingAddress.city || "",
          state: latestShippingAddress.state || "",
          postalCode: latestShippingAddress.postal_code || "",
          country: latestShippingAddress.country || "",
        }
      : null,
  });
});

export const saveCheckoutAddress = asyncHandler(async (req, res) => {
  const {
    id,
    fullName,
    email,
    phone,
    line1,
    line2 = "",
    city,
    state,
    postalCode,
    country,
    isDefault = false,
  } = req.body;

  const { error: addressBookProbeError } = await supabase
    .from("user_addresses")
    .select("id")
    .limit(1);

  if (addressBookProbeError && isMissingTableError(addressBookProbeError, "user_addresses")) {
    return res.json({
      savedAddresses: [],
      addressBookReady: false,
      message: "Address book table is not available yet. Apply the latest database migration.",
    });
  }

  if (isDefault) {
    const { error: clearDefaultError } = await supabase
      .from("user_addresses")
      .update({ is_default: false })
      .eq("user_id", req.user._id);

    if (clearDefaultError) {
      res.status(500);
      throw new Error(clearDefaultError.message);
    }
  }

  if (id) {
    const { error: updateError } = await supabase
      .from("user_addresses")
      .update({
        full_name: fullName,
        email,
        phone,
        line1,
        line2,
        city,
        state,
        postal_code: postalCode,
        country,
        is_default: Boolean(isDefault),
      })
      .eq("id", id)
      .eq("user_id", req.user._id);

    if (updateError) {
      res.status(500);
      throw new Error(updateError.message);
    }
  } else {
    const { error: createError } = await supabase.from("user_addresses").insert({
      user_id: req.user._id,
      full_name: fullName,
      email,
      phone,
      line1,
      line2,
      city,
      state,
      postal_code: postalCode,
      country,
      is_default: Boolean(isDefault),
    });

    if (createError) {
      res.status(500);
      throw new Error(createError.message);
    }
  }

  const { data: addresses, error: listError } = await supabase
    .from("user_addresses")
    .select("id, full_name, email, phone, line1, line2, city, state, postal_code, country, is_default, created_at, updated_at")
    .eq("user_id", req.user._id)
    .order("is_default", { ascending: false })
    .order("updated_at", { ascending: false });

  if (listError) {
    res.status(500);
    throw new Error(listError.message);
  }

  res.json({ savedAddresses: (addresses || []).map(mapAddressRow) });
});

export const deleteCheckoutAddress = asyncHandler(async (req, res) => {
  const addressId = String(req.params.id || "").trim();

  if (!addressId) {
    res.status(400);
    throw new Error("Address id is required");
  }

  const { error: deleteError } = await supabase
    .from("user_addresses")
    .delete()
    .eq("id", addressId)
    .eq("user_id", req.user._id);

  if (deleteError && !isMissingTableError(deleteError, "user_addresses")) {
    res.status(500);
    throw new Error(deleteError.message);
  }

  const { data: addresses, error: listError } = await supabase
    .from("user_addresses")
    .select("id, full_name, email, phone, line1, line2, city, state, postal_code, country, is_default, created_at, updated_at")
    .eq("user_id", req.user._id)
    .order("is_default", { ascending: false })
    .order("updated_at", { ascending: false });

  if (listError && !isMissingTableError(listError, "user_addresses")) {
    res.status(500);
    throw new Error(listError.message);
  }

  res.json({
    savedAddresses: (addresses || []).map(mapAddressRow),
    addressBookReady: !listError,
  });
});
