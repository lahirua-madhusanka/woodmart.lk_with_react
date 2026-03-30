import asyncHandler from "express-async-handler";
import Stripe from "stripe";
import env from "../config/env.js";
import supabase from "../config/supabase.js";
import { mapOrder } from "../utils/dbMappers.js";

const stripe = env.stripeSecretKey ? new Stripe(env.stripeSecretKey) : null;

const orderSelect =
  "id, user_id, subtotal_amount, shipping_total, discount_total, product_cost_total, profit_total, total_amount, payment_status, order_status, payment_method, payment_intent_id, created_at, updated_at, users:user_id(id, name, email), order_items(product_id, name, image, price, list_price, discount_amount, product_cost, shipping_price, quantity, line_subtotal, line_shipping_total, line_discount_total, line_product_cost_total, line_total, line_profit_total), order_shipping_addresses(full_name, line1, line2, city, state, postal_code, country, phone)";

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

const loadOrderById = async (id, includeUser = true) => {
  let query = supabase.from("orders").select(orderSelect).eq("id", id).maybeSingle();
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  if (!data) return null;
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

  let { data: items, error: itemsError } = await supabase
    .from("cart_items")
    .select("product_id, quantity, products(id, name, stock, price, discount_price, product_cost, shipping_price, product_images(image_url, sort_order))")
    .eq("cart_id", cart.id);

  if (
    itemsError &&
    (isMissingColumnError(itemsError, "product_cost") ||
      isMissingColumnError(itemsError, "shipping_price"))
  ) {
    const fallback = await supabase
      .from("cart_items")
      .select("product_id, quantity, products(id, name, stock, price, discount_price, product_images(image_url, sort_order))")
      .eq("cart_id", cart.id);

    items = (fallback.data || []).map((entry) => ({
      ...entry,
      products: entry.products
        ? { ...entry.products, product_cost: 0, shipping_price: 0 }
        : entry.products,
    }));
    itemsError = fallback.error;
  }

  if (itemsError) {
    throw new Error(itemsError.message);
  }

  return { cart, items: items || [] };
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
  } = req.body;

  const { cart, items } = await loadCartWithProducts(req.user._id);

  if (!cart || !items.length) {
    res.status(400);
    throw new Error("Cart is empty");
  }

  for (const item of items) {
    if (!item.products) {
      res.status(400);
      throw new Error("One or more products in cart no longer exist");
    }
    if (item.quantity > item.products.stock) {
      res.status(400);
      throw new Error(`Insufficient stock for ${item.products.name}`);
    }
  }

  const orderItems = items.map((item) => {
    const listPrice = Number(item.products.price ?? 0);
    const unitSellingPrice = Number(item.products.discount_price ?? item.products.price ?? 0);
    const unitDiscountAmount = Math.max(0, listPrice - unitSellingPrice);
    const unitProductCost = Number(item.products.product_cost ?? 0);
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
        item.products.product_images
          ?.slice()
          .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))[0]?.image_url || "",
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
    };
  });

  const subtotalAmount = orderItems.reduce((sum, item) => sum + Number(item.line_subtotal || 0), 0);
  const shippingTotal = orderItems.reduce((sum, item) => sum + Number(item.line_shipping_total || 0), 0);
  const discountTotal = orderItems.reduce((sum, item) => sum + Number(item.line_discount_total || 0), 0);
  const productCostTotal = orderItems.reduce((sum, item) => sum + Number(item.line_product_cost_total || 0), 0);
  const totalAmount = subtotalAmount + shippingTotal;
  const profitTotal = subtotalAmount - (productCostTotal + shippingTotal + discountTotal);

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
      order_status: "created",
      payment_method: paymentMethod,
      payment_intent_id: paymentIntentId,
    })
    .select("id")
    .single();

  if (createOrderError || !createdOrder) {
    res.status(500);
    throw new Error(createOrderError?.message || "Failed to create order");
  }

  const { error: orderItemsError } = await supabase
    .from("order_items")
    .insert(orderItems.map((item) => ({ ...item, order_id: createdOrder.id })));

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
    const nextStock = item.products.stock - item.quantity;
    const { error: stockError } = await supabase
      .from("products")
      .update({ stock: nextStock })
      .eq("id", item.products.id);

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

  const order = await loadOrderById(createdOrder.id, true);
  res.status(201).json(order);
});

export const getUserOrders = asyncHandler(async (req, res) => {
  const { data, error } = await supabase
    .from("orders")
    .select(orderSelect)
    .eq("user_id", req.user._id)
    .order("created_at", { ascending: false });

  if (error) {
    res.status(500);
    throw new Error(error.message);
  }

  res.json((data || []).map((row) => mapOrder(row, { includeUser: true })));
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
