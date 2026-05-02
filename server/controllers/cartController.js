import asyncHandler from "express-async-handler";
import supabase from "../config/supabase.js";
import { mapCart } from "../utils/dbMappers.js";

const productSelect =
  "id, name, description, shipping_price, category, rating, brand, featured, status, created_at, updated_at, product_images(image_url, sort_order), product_variations(id, name, price, discounted_price, cost, stock, sku, image_url, sort_order), product_reviews(id, user_id, name, rating, comment, created_at, updated_at)";

const productSelectLegacyVariations =
  "id, name, description, shipping_price, category, rating, brand, featured, status, created_at, updated_at, product_images(image_url, sort_order), product_variations(id, variation_name, price, discounted_price, cost, stock, sku, image_url, sort_order), product_reviews(id, user_id, name, rating, comment, created_at, updated_at)";

const productSelectLegacyVariationSelling =
  "id, name, description, shipping_price, category, rating, brand, featured, status, created_at, updated_at, product_images(image_url, sort_order), product_variations(id, name, price, sku, image_url, sort_order), product_reviews(id, user_id, name, rating, comment, created_at, updated_at)";

const productSelectLegacyVariationSellingV1 =
  "id, name, description, shipping_price, category, rating, brand, featured, status, created_at, updated_at, product_images(image_url, sort_order), product_variations(id, variation_name, price, sku, image_url, sort_order), product_reviews(id, user_id, name, rating, comment, created_at, updated_at)";

const isMissingVariationNameColumnError = (message = "") => {
  const lowered = String(message || "").toLowerCase();
  return lowered.includes("product_variations") && lowered.includes("column") && (lowered.includes(".name") || lowered.includes('"name"'));
};

const isMissingVariationSellingColumnError = (message = "") => {
  const lowered = String(message || "").toLowerCase();
  return (
    lowered.includes("product_variations") &&
    lowered.includes("column") &&
    (lowered.includes("discounted_price") || lowered.includes("cost") || lowered.includes("stock"))
  );
};

const isMissingColumnError = (message = "") => {
  const lowered = String(message || "").toLowerCase();
  return lowered.includes("could not find") && lowered.includes("column");
};

const getOrCreateCart = async (userId) => {
  const { data: existing, error: existingError } = await supabase
    .from("carts")
    .select("id, user_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (existingError) {
    throw new Error(existingError.message);
  }

  let cart = existing;
  if (!cart) {
    const { data: created, error: createError } = await supabase
      .from("carts")
      .insert({ user_id: userId })
      .select("id, user_id")
      .single();

    if (createError || !created) {
      throw new Error(createError?.message || "Failed to create cart");
    }
    cart = created;
  }

  return cart;
};

const loadCartItems = async (cartId) => {
  const runSelect = async (variationSelect) =>
    supabase
      .from("cart_items")
      .select(
        `id, cart_id, product_id, variation_id, quantity, product_variations(${variationSelect})`
      )
      .eq("cart_id", cartId);

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

  return result.data || [];
};

const migrateCartItemsWithoutVariation = async (items = []) => {
  const targets = (items || []).filter((item) => !item.variation_id);
  if (!targets.length) return;

  const productIds = [...new Set(targets.map((item) => item.product_id))];
  const { data: variations, error } = await supabase
    .from("product_variations")
    .select("id, product_id, sort_order")
    .in("product_id", productIds)
    .order("sort_order", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  const firstByProduct = new Map();
  for (const row of variations || []) {
    if (!firstByProduct.has(row.product_id)) {
      firstByProduct.set(row.product_id, row.id);
    }
  }

  for (const item of targets) {
    const replacement = firstByProduct.get(item.product_id);
    if (!replacement) {
      continue;
    }

    const { error: updateError } = await supabase
      .from("cart_items")
      .update({ variation_id: replacement })
      .eq("id", item.id);

    if (updateError) {
      throw new Error(updateError.message);
    }
  }
};

const loadCart = async (userId) => {
  const cart = await getOrCreateCart(userId);

  let items = await loadCartItems(cart.id);
  await migrateCartItemsWithoutVariation(items);
  items = await loadCartItems(cart.id);

  const productIds = (items || []).map((item) => item.product_id);
  let products = [];

  if (productIds.length) {
    let productResult = await supabase.from("products").select(productSelect).in("id", productIds);

    if (productResult.error && isMissingVariationSellingColumnError(productResult.error.message)) {
      productResult = await supabase.from("products").select(productSelectLegacyVariationSelling).in("id", productIds);
    }

    if (productResult.error && isMissingVariationNameColumnError(productResult.error.message)) {
      productResult = await supabase.from("products").select(productSelectLegacyVariations).in("id", productIds);
    }

    if (productResult.error && isMissingVariationSellingColumnError(productResult.error.message)) {
      productResult = await supabase.from("products").select(productSelectLegacyVariationSellingV1).in("id", productIds);
    }

    const { data: productRows, error: productsError } = productResult;

    if (productsError) {
      throw new Error(productsError.message);
    }

    products = productRows || [];
  }

  return mapCart(cart, items || [], products);
};

export const getCart = asyncHandler(async (req, res) => {
  const cart = await loadCart(req.user._id);
  res.json(cart);
});

export const addToCart = asyncHandler(async (req, res) => {
  const { productId, quantity = 1, variationId } = req.body;

  const resolvedVariationId = variationId || null;

  if (!resolvedVariationId) {
    res.status(400);
    throw new Error("Please select a variation before adding to cart");
  }

  const { data: variation, error: variationError } = await supabase
    .from("product_variations")
    .select("id, product_id, stock")
    .eq("id", resolvedVariationId)
    .maybeSingle();

  if (variationError) {
    res.status(500);
    throw new Error(variationError.message);
  }

  if (!variation || String(variation.product_id) !== String(productId)) {
    res.status(400);
    throw new Error("Selected variation is invalid");
  }

  const cart = await getOrCreateCart(req.user._id);
  let existingQuery = supabase
    .from("cart_items")
    .select("id, cart_id, product_id, variation_id, quantity")
    .eq("cart_id", cart.id)
    .eq("product_id", productId);

  if (resolvedVariationId) {
    existingQuery = existingQuery.eq("variation_id", resolvedVariationId);
  } else {
    existingQuery = existingQuery.is("variation_id", null);
  }

  const { data: existingItem, error: existingError } = await existingQuery.maybeSingle();

  if (existingError) {
    res.status(500);
    throw new Error(existingError.message);
  }

  if (existingItem) {
    const nextQty = existingItem.quantity + Number(quantity);
    if (nextQty > Number(variation.stock || 0)) {
      res.status(400);
      throw new Error("Requested quantity exceeds stock");
    }

    const { error: updateError } = await supabase
      .from("cart_items")
      .update({ quantity: nextQty })
      .eq("id", existingItem.id);

    if (updateError) {
      res.status(500);
      throw new Error(updateError.message);
    }
  } else {
    if (Number(quantity) > Number(variation.stock || 0)) {
      res.status(400);
      throw new Error("Requested quantity exceeds stock");
    }

    const { error: insertError } = await supabase.from("cart_items").insert({
      cart_id: cart.id,
      product_id: productId,
      variation_id: resolvedVariationId || null,
      quantity: Number(quantity),
    });

    if (insertError) {
      res.status(500);
      throw new Error(insertError.message);
    }
  }

  const formatted = await loadCart(req.user._id);
  res.json(formatted);
});

export const updateCartItem = asyncHandler(async (req, res) => {
  const { productId, quantity, variationId } = req.body;

  const cart = await getOrCreateCart(req.user._id);
  let itemQuery = supabase
    .from("cart_items")
    .select("id, cart_id, product_id, variation_id, quantity")
    .eq("cart_id", cart.id)
    .eq("product_id", productId);

  if (variationId) {
    itemQuery = itemQuery.eq("variation_id", variationId);
  } else {
    itemQuery = itemQuery.is("variation_id", null);
  }

  const { data: item, error: itemError } = await itemQuery.maybeSingle();

  if (itemError) {
    res.status(500);
    throw new Error(itemError.message);
  }

  if (!item) {
    res.status(404);
    throw new Error("Cart item not found");
  }

  if (quantity <= 0) {
    const { error: deleteError } = await supabase
      .from("cart_items")
      .delete()
      .eq("id", item.id);

    if (deleteError) {
      res.status(500);
      throw new Error(deleteError.message);
    }
  } else {
    if (!variationId) {
      res.status(400);
      throw new Error("Variation id is required");
    }

    const { data: variation, error: variationError } = await supabase
      .from("product_variations")
      .select("id, product_id, stock")
      .eq("id", variationId)
      .maybeSingle();

    if (variationError) {
      res.status(500);
      throw new Error(variationError.message);
    }

    if (!variation || String(variation.product_id) !== String(productId)) {
      res.status(400);
      throw new Error("Selected variation is invalid");
    }

    if (Number(quantity) > Number(variation.stock || 0)) {
      res.status(400);
      throw new Error("Requested quantity exceeds stock");
    }

    const { error: updateError } = await supabase
      .from("cart_items")
      .update({ quantity: Number(quantity) })
      .eq("id", item.id);

    if (updateError) {
      res.status(500);
      throw new Error(updateError.message);
    }
  }

  const formatted = await loadCart(req.user._id);
  res.json(formatted);
});

export const removeCartItem = asyncHandler(async (req, res) => {
  const { productId, variationId } = req.body;

  const cart = await getOrCreateCart(req.user._id);
  let itemQuery = supabase
    .from("cart_items")
    .select("id")
    .eq("cart_id", cart.id)
    .eq("product_id", productId);

  if (variationId) {
    itemQuery = itemQuery.eq("variation_id", variationId);
  } else {
    itemQuery = itemQuery.is("variation_id", null);
  }

  const { data: target, error: targetError } = await itemQuery.maybeSingle();
  if (targetError) {
    res.status(500);
    throw new Error(targetError.message);
  }

  if (!target) {
    res.status(404);
    throw new Error("Cart item not found");
  }

  const { error } = await supabase
    .from("cart_items")
    .delete()
    .eq("id", target.id);

  if (error) {
    res.status(500);
    throw new Error(error.message);
  }

  const formatted = await loadCart(req.user._id);
  res.json(formatted);
});
