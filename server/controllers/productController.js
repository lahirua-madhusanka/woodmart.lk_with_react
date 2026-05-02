import asyncHandler from "express-async-handler";
import crypto from "node:crypto";
import supabase from "../config/supabase.js";
import { mapProduct } from "../utils/dbMappers.js";
import { getActivePromotionMapForProductIds } from "../services/promotionPricingService.js";

const attachPromotionToProduct = (product, entry) => {
  if (!product) return product;
  if (!entry || !Number.isFinite(Number(entry.discountPercentage)) || Number(entry.discountPercentage) <= 0) {
    return { ...product, promotion: null, promotionActive: false, promotionDiscountPercentage: 0 };
  }
  return {
    ...product,
    promotion: {
      id: entry.promotionId,
      title: entry.title,
      slug: entry.slug,
      discountPercentage: Number(entry.discountPercentage),
      startDate: entry.startDate || null,
      endDate: entry.endDate || null,
    },
    promotionActive: true,
    promotionDiscountPercentage: Number(entry.discountPercentage),
  };
};

const enrichProductsWithPromotions = async (products) => {
  if (!Array.isArray(products) || !products.length) return products || [];
  try {
    const ids = products.map((p) => p.id || p._id).filter(Boolean);
    const map = await getActivePromotionMapForProductIds(ids);
    return products.map((p) => attachPromotionToProduct(p, map.get(String(p.id || p._id))));
  } catch {
    return products;
  }
};

const MAX_PRODUCT_IMAGES = 6;
const PRODUCT_IMAGES_BUCKET = process.env.PRODUCT_IMAGES_BUCKET || "product-images";
const isMissingColumnError = (message = "") =>
  message.includes("Could not find") && message.includes("column");

const calculateRating = (reviews = []) => {
  if (!reviews.length) return 0;
  const sum = reviews.reduce((acc, review) => acc + review.rating, 0);
  return Number((sum / reviews.length).toFixed(1));
};

const normalizeReview = (row) => ({
  _id: row.id,
  user: row.user_id,
  name: row.name,
  title: row.title || "",
  rating: Number(row.rating || 0),
  comment: row.comment,
  orderId: row.order_id || null,
  verifiedPurchase: Boolean(row.order_id),
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const ensureReviewProductExists = async (productId) => {
  const { data: product, error: productError } = await supabase
    .from("products")
    .select("id")
    .eq("id", productId)
    .maybeSingle();

  if (productError) {
    throw new Error(productError.message);
  }

  if (!product) {
    return null;
  }

  return product;
};

const getEligibleDeliveredOrder = async ({ userId, productId }) => {
  const { data, error } = await supabase
    .from("orders")
    .select("id, created_at, order_items!inner(product_id)")
    .eq("user_id", userId)
    .eq("order_status", "delivered")
    .eq("order_items.product_id", productId)
    .order("created_at", { ascending: false })
    .limit(1);

  if (error) {
    throw new Error(error.message);
  }

  return data?.[0] || null;
};

const refreshProductRating = async (productId) => {
  const { data: reviews, error: reviewsError } = await supabase
    .from("product_reviews")
    .select("rating")
    .eq("product_id", productId);

  if (reviewsError) {
    throw new Error(reviewsError.message);
  }

  const nextRating = calculateRating(reviews || []);

  const { error: ratingError } = await supabase
    .from("products")
    .update({ rating: nextRating })
    .eq("id", productId);

  if (ratingError) {
    throw new Error(ratingError.message);
  }
};

const isMissingVariationNameColumnError = (message = "") => {
  const lowered = String(message || "").toLowerCase();
  return (
    lowered.includes("product_variations") &&
    lowered.includes("column") &&
    (lowered.includes(".name") || lowered.includes('"name"'))
  );
};

const isMissingVariationSellingColumnError = (message = "") => {
  const lowered = String(message || "").toLowerCase();
  return (
    lowered.includes("product_variations") &&
    lowered.includes("column") &&
    (lowered.includes("discounted_price") || lowered.includes("cost") || lowered.includes("stock"))
  );
};

// Production may still have NOT NULL on legacy `variation_name` column.
const isLegacyVariationNameNotNullError = (message = "") => {
  const lowered = String(message || "").toLowerCase();
  return lowered.includes("variation_name") && lowered.includes("null");
};

// Production may still have NOT NULL on legacy `products.price` / stock / cost / discount_price / sku.
const isLegacyProductColumnNotNullError = (message = "") => {
  const lowered = String(message || "").toLowerCase();
  if (!lowered.includes("null")) return false;
  return ["\"price\"", "\"stock\"", "\"product_cost\""].some((token) => lowered.includes(token));
};

// Derive legacy product columns from variations so older schemas accept inserts.
const summarizeVariationsForLegacyProduct = (variations = []) => {
  if (!variations.length) {
    return { price: 0, discount_price: null, product_cost: 0, stock: 0, sku: null };
  }
  const minPrice = variations.reduce((acc, v) => Math.min(acc, Number(v?.price ?? 0)), Infinity);
  const minCost = variations.reduce((acc, v) => Math.min(acc, Number(v?.cost ?? 0)), Infinity);
  const totalStock = variations.reduce((acc, v) => acc + Number(v?.stock ?? 0), 0);
  const minDiscount = variations.reduce((acc, v) => {
    const dp = v?.discountedPrice;
    if (dp == null) return acc;
    const num = Number(dp);
    if (!Number.isFinite(num)) return acc;
    return acc == null ? num : Math.min(acc, num);
  }, null);
  return {
    price: Number.isFinite(minPrice) ? minPrice : 0,
    discount_price: minDiscount,
    product_cost: Number.isFinite(minCost) ? minCost : 0,
    stock: totalStock,
    sku: variations.find((v) => v?.sku)?.sku || null,
  };
};

const productSelectV2 =
  "id, name, description, shipping_price, category, rating, brand, featured, status, created_at, updated_at, product_images(image_url, sort_order), product_variations(id, name, price, discounted_price, cost, stock, sku, image_url, sort_order), product_reviews(id, user_id, name, title, rating, comment, order_id, created_at, updated_at)";

const productSelectV2LegacyVariations =
  "id, name, description, shipping_price, category, rating, brand, featured, status, created_at, updated_at, product_images(image_url, sort_order), product_variations(id, name, price, sku, image_url, sort_order), product_reviews(id, user_id, name, title, rating, comment, order_id, created_at, updated_at)";

// Legacy compatibility: some databases used `variation_name` instead of `name`.
const productSelectV1 =
  "id, name, description, shipping_price, category, rating, brand, featured, status, created_at, updated_at, product_images(image_url, sort_order), product_variations(id, variation_name, price, discounted_price, cost, stock, sku, image_url, sort_order), product_reviews(id, user_id, name, title, rating, comment, order_id, created_at, updated_at)";

const productSelectV1LegacyVariations =
  "id, name, description, shipping_price, category, rating, brand, featured, status, created_at, updated_at, product_images(image_url, sort_order), product_variations(id, variation_name, price, sku, image_url, sort_order), product_reviews(id, user_id, name, title, rating, comment, order_id, created_at, updated_at)";

const loadProductRowById = async (id) => {
  const runSelect = async (selectClause) =>
    supabase.from("products").select(selectClause).eq("id", id).maybeSingle();

  let result = await runSelect(productSelectV2);

  if (result.error && isMissingVariationSellingColumnError(result.error.message)) {
    result = await runSelect(productSelectV2LegacyVariations);
  }

  if (result.error && isMissingVariationNameColumnError(result.error.message)) {
    result = await runSelect(productSelectV1);
  }

  if (result.error && isMissingVariationSellingColumnError(result.error.message)) {
    result = await runSelect(productSelectV1LegacyVariations);
  }

  const { data, error } = result;

  if (error) {
    throw new Error(error.message);
  }

  return data;
};

const insertProductVariations = async ({ productId, variations }) => {
  if (!variations.length) return;

  // eslint-disable-next-line no-console
  console.log("[insertProductVariations] saving", variations.length, "variations for product", productId);

  const variationRowsV2 = variations.map((variation) => ({
    product_id: productId,
    name: variation.name,
    price: variation.price,
    discounted_price: variation.discountedPrice ?? null,
    cost: variation.cost,
    stock: variation.stock,
    sku: variation.sku || null,
    image_url: variation.imageUrl || null,
    sort_order: Number.isFinite(variation.sortOrder) ? variation.sortOrder : 0,
  }));

  let { error } = await supabase.from("product_variations").insert(variationRowsV2);

  // Legacy NOT NULL on variation_name -> retry with both columns populated.
  if (error && isLegacyVariationNameNotNullError(error.message)) {
    const dualRows = variationRowsV2.map((row) => ({ ...row, variation_name: row.name }));
    ({ error } = await supabase.from("product_variations").insert(dualRows));
  }

  if (error && isMissingVariationSellingColumnError(error.message)) {
    const legacyRows = variations.map((variation) => ({
      product_id: productId,
      name: variation.name,
      price: variation.price,
      sku: variation.sku || null,
      image_url: variation.imageUrl || null,
      sort_order: Number.isFinite(variation.sortOrder) ? variation.sortOrder : 0,
    }));

    ({ error } = await supabase.from("product_variations").insert(legacyRows));
  }

  if (error && isMissingVariationNameColumnError(error.message)) {
    const variationRowsV1 = variations.map((variation) => ({
      product_id: productId,
      variation_name: variation.name,
      price: variation.price,
      discounted_price: variation.discountedPrice ?? null,
      cost: variation.cost,
      stock: variation.stock,
      sku: variation.sku || null,
      image_url: variation.imageUrl || null,
      sort_order: Number.isFinite(variation.sortOrder) ? variation.sortOrder : 0,
    }));

    ({ error } = await supabase.from("product_variations").insert(variationRowsV1));
  }

  if (error && isMissingVariationNameColumnError(error.message) && isMissingVariationSellingColumnError(error.message)) {
    const legacyRows = variations.map((variation) => ({
      product_id: productId,
      variation_name: variation.name,
      price: variation.price,
      sku: variation.sku || null,
      image_url: variation.imageUrl || null,
      sort_order: Number.isFinite(variation.sortOrder) ? variation.sortOrder : 0,
    }));

    ({ error } = await supabase.from("product_variations").insert(legacyRows));
  }

  if (error) {
    // eslint-disable-next-line no-console
    console.error("[insertProductVariations] FAILED:", error.message, { productId });
    throw new Error(error.message);
  }

  // eslint-disable-next-line no-console
  console.log("[insertProductVariations] inserted", variations.length, "rows OK");
};

export const getReviewEligibility = asyncHandler(async (req, res) => {
  const product = await ensureReviewProductExists(req.params.id);
  if (!product) {
    res.status(404);
    throw new Error("Product not found");
  }

  const deliveredOrder = await getEligibleDeliveredOrder({ userId: req.user._id, productId: req.params.id });

  let existingReview = null;
  if (deliveredOrder?.id) {
    const { data: existingRows, error: existingError } = await supabase
      .from("product_reviews")
      .select("id, user_id, name, title, rating, comment, order_id, created_at, updated_at")
      .eq("product_id", req.params.id)
      .eq("user_id", req.user._id)
      .eq("order_id", deliveredOrder.id)
      .order("created_at", { ascending: false })
      .limit(1);

    if (existingError) {
      res.status(500);
      throw new Error(existingError.message);
    }

    existingReview = Array.isArray(existingRows) ? existingRows[0] || null : null;
  }

  const hasDeliveredPurchase = Boolean(deliveredOrder);
  const hasExistingReview = Boolean(existingReview);

  let message = "Only verified buyers can review this product";
  if (!hasDeliveredPurchase) {
    message = "You can only review products you have purchased and received.";
  } else if (hasExistingReview) {
    message = "You already reviewed this product. You can edit your review.";
  }

  res.json({
    eligible: hasDeliveredPurchase,
    canReview: hasDeliveredPurchase && !hasExistingReview,
    canEdit: hasDeliveredPurchase && hasExistingReview,
    message,
    existingReview: existingReview ? normalizeReview(existingReview) : null,
  });
});

export const getProducts = asyncHandler(async (req, res) => {
  const { category, q, sort } = req.query;
  const sortMap = {
    newest: { column: "created_at", ascending: false },
    rating: { column: "rating", ascending: false },
  };

  const getVariationUnitPrice = (variation = {}) => {
    const price = Number(variation.price || 0);
    const discounted = variation.discountedPrice == null ? null : Number(variation.discountedPrice);
    if (Number.isFinite(discounted) && discounted > 0 && discounted < price) {
      return discounted;
    }
    return price;
  };

  const getProductMinPrice = (product = {}) => {
    const variations = Array.isArray(product.variations) ? product.variations : [];
    if (!variations.length) return 0;
    return variations.reduce((min, v) => Math.min(min, getVariationUnitPrice(v)), Infinity);
  };

  const buildQuery = (selectClause) => {
    let query = supabase.from("products").select(selectClause);

    if (category) {
      query = query.eq("category", category);
    }

    if (q) {
      query = query.or(`name.ilike.%${q}%,description.ilike.%${q}%`);
    }

    const sortConfig = sortMap[sort] || { column: "created_at", ascending: false };
    query = query.order(sortConfig.column, { ascending: sortConfig.ascending });
    return query;
  };

  let { data, error } = await buildQuery(productSelectV2);

    if (error) {
    if (isMissingVariationSellingColumnError(error.message)) {
      ({ data, error } = await buildQuery(productSelectV2LegacyVariations));
    }
  }

  if (error && isMissingVariationNameColumnError(error.message)) {
    ({ data, error } = await buildQuery(productSelectV1));
    }

  if (error && isMissingVariationSellingColumnError(error.message)) {
      ({ data, error } = await buildQuery(productSelectV1LegacyVariations));
    }

  if (error) {
    res.status(500);
    throw new Error(error.message);
  }

  // PostgREST embed-fallback: if the nested `product_variations(...)` array came back
  // empty for ALL products (typically due to a stale schema cache or missing FK detection),
  // fetch variations in a separate query and stitch them onto the rows. This guarantees
  // production behaves the same as local even if PostgREST embedding misbehaves.
  const rawRows = Array.isArray(data) ? data : [];
  const totalEmbedded = rawRows.reduce(
    (acc, row) => acc + (Array.isArray(row?.product_variations) ? row.product_variations.length : 0),
    0
  );
  if (rawRows.length > 0 && totalEmbedded === 0) {
    const productIds = rawRows.map((row) => row.id).filter(Boolean);
    if (productIds.length) {
      // eslint-disable-next-line no-console
      console.warn(
        "[getProducts] embedded product_variations was EMPTY for",
        productIds.length,
        "products; falling back to separate query"
      );
      const tryFetchVariations = async (cols) =>
        supabase.from("product_variations").select(cols).in("product_id", productIds);

      let varRes = await tryFetchVariations(
        "id, product_id, name, price, discounted_price, cost, stock, sku, image_url, sort_order"
      );
      if (varRes.error && isMissingVariationSellingColumnError(varRes.error.message)) {
        varRes = await tryFetchVariations("id, product_id, name, price, sku, image_url, sort_order");
      }
      if (varRes.error && isMissingVariationNameColumnError(varRes.error.message)) {
        varRes = await tryFetchVariations(
          "id, product_id, variation_name, price, discounted_price, cost, stock, sku, image_url, sort_order"
        );
      }
      if (varRes.error) {
        // eslint-disable-next-line no-console
        console.error("[getProducts] variation fallback query failed:", varRes.error.message);
      } else {
        const variationsByProduct = new Map();
        for (const row of varRes.data || []) {
          const key = row.product_id;
          if (!variationsByProduct.has(key)) variationsByProduct.set(key, []);
          variationsByProduct.get(key).push(row);
        }
        for (const row of rawRows) {
          row.product_variations = variationsByProduct.get(row.id) || [];
        }
        // eslint-disable-next-line no-console
        console.log(
          "[getProducts] fallback attached",
          varRes.data?.length || 0,
          "variations across",
          variationsByProduct.size,
          "products"
        );
      }
    }
  }

  let products = rawRows.map(mapProduct);
  products = await enrichProductsWithPromotions(products);

  if (sort === "priceAsc") {
    products = products.slice().sort((a, b) => getProductMinPrice(a) - getProductMinPrice(b));
  } else if (sort === "priceDesc") {
    products = products.slice().sort((a, b) => getProductMinPrice(b) - getProductMinPrice(a));
  }

  // eslint-disable-next-line no-console
  console.log(
    "[getProducts] returning",
    products.length,
    "products; with-variations:",
    products.filter((p) => Array.isArray(p.variations) && p.variations.length).length,
    "; sample variation count:",
    products[0]?.variations?.length || 0
  );

  res.json(products);
});

export const getProductById = asyncHandler(async (req, res) => {
  let data;
  try {
    data = await loadProductRowById(req.params.id);
  } catch (err) {
    res.status(500);
    throw err;
  }

  if (!data) {
    res.status(404);
    throw new Error("Product not found");
  }

  // PostgREST embed-fallback: if nested variations is empty, fetch them separately.
  if (!Array.isArray(data.product_variations) || data.product_variations.length === 0) {
    const tryFetch = async (cols) =>
      supabase.from("product_variations").select(cols).eq("product_id", data.id);

    let varRes = await tryFetch(
      "id, product_id, name, price, discounted_price, cost, stock, sku, image_url, sort_order"
    );
    if (varRes.error && isMissingVariationSellingColumnError(varRes.error.message)) {
      varRes = await tryFetch("id, product_id, name, price, sku, image_url, sort_order");
    }
    if (varRes.error && isMissingVariationNameColumnError(varRes.error.message)) {
      varRes = await tryFetch(
        "id, product_id, variation_name, price, discounted_price, cost, stock, sku, image_url, sort_order"
      );
    }
    if (!varRes.error && Array.isArray(varRes.data) && varRes.data.length) {
      // eslint-disable-next-line no-console
      console.log("[getProductById] fallback attached", varRes.data.length, "variations for", data.id);
      data.product_variations = varRes.data;
    }
  }

  const product = mapProduct(data);
  const [enriched] = await enrichProductsWithPromotions([product]);
  res.json(enriched);
});

export const createProduct = asyncHandler(async (req, res) => {
  // eslint-disable-next-line no-console
  console.log("[createProduct] Incoming product data:", {
    name: req.body?.name,
    category: req.body?.category,
    images: Array.isArray(req.body?.images) ? req.body.images.length : 0,
    variations: Array.isArray(req.body?.variations) ? req.body.variations.length : 0,
    variationsPreview: Array.isArray(req.body?.variations) ? req.body.variations : null,
  });

  const {
    name,
    description,
    category,
    shippingPrice = 0,
    images = [],
    rating = 0,
    brand = "",
    featured = false,
    status = "active",
    variations = [],
  } = req.body;

  if (!Array.isArray(images) || images.length < 1) {
    res.status(400);
    throw new Error("At least one image is required");
  }

  if (images.length > MAX_PRODUCT_IMAGES) {
    res.status(400);
    throw new Error(`A product can have at most ${MAX_PRODUCT_IMAGES} images`);
  }

  if (!Array.isArray(variations)) {
    res.status(400);
    throw new Error("Variations must be an array");
  }

  if (!variations.length) {
    res.status(400);
    throw new Error("At least one variation is required");
  }

  const normalizedVariations = variations.map((variation, index) => ({
    name: String(variation?.name || "").trim(),
    price: Number(variation?.price),
    discountedPrice:
      variation?.discountedPrice == null || variation.discountedPrice === ""
        ? null
        : Number(variation.discountedPrice),
    cost: Number(variation?.cost),
    stock: Number.parseInt(variation?.stock, 10),
    sku: variation?.sku ? String(variation.sku).trim() : "",
    imageUrl: variation?.imageUrl ? String(variation.imageUrl).trim() : "",
    sortOrder: Number.isFinite(Number(variation?.sortOrder)) ? Number(variation.sortOrder) : index,
  }));

  if (normalizedVariations.some((variation) => !variation.name)) {
    res.status(400);
    throw new Error("Variation name is required");
  }

  if (normalizedVariations.some((variation) => !Number.isFinite(variation.price) || variation.price < 0)) {
    res.status(400);
    throw new Error("Variation price is required");
  }

  if (normalizedVariations.some((variation) => !Number.isFinite(variation.cost) || variation.cost < 0)) {
    res.status(400);
    throw new Error("Variation cost is required");
  }

  if (normalizedVariations.some((variation) => !Number.isFinite(variation.stock) || variation.stock < 0)) {
    res.status(400);
    throw new Error("Variation stock is required");
  }

  if (
    normalizedVariations.some((variation) => {
      if (variation.discountedPrice == null) return false;
      if (!Number.isFinite(variation.discountedPrice) || variation.discountedPrice < 0) return true;
      return variation.discountedPrice > variation.price;
    })
  ) {
    res.status(400);
    throw new Error("Variation discounted price cannot be greater than variation price");
  }

  const variationSkus = normalizedVariations
    .map((variation) => variation.sku)
    .filter(Boolean);
  const uniqueVariationSkus = new Set(variationSkus);
  if (uniqueVariationSkus.size !== variationSkus.length) {
    res.status(400);
    throw new Error("Variation SKU values must be unique");
  }

  const legacyMirror = summarizeVariationsForLegacyProduct(normalizedVariations);
  const insertPayload = {
    name,
    description,
    category,
    shipping_price: Number(shippingPrice || 0),
    rating,
    brand: brand || "",
    featured: Boolean(featured),
    status: status || "active",
    // Mirror legacy NOT NULL columns from variations so older production schemas accept the row.
    price: legacyMirror.price,
    discount_price: legacyMirror.discount_price,
    product_cost: legacyMirror.product_cost,
    stock: legacyMirror.stock,
    sku: legacyMirror.sku,
  };

  let { data: created, error: createError } = await supabase
    .from("products")
    .insert(insertPayload)
    .select("id")
    .single();

  // Modern schemas may not have these legacy columns -> drop them and retry.
  if (createError && isMissingColumnError(createError.message)) {
    const fallback = { ...insertPayload };
    delete fallback.price;
    delete fallback.discount_price;
    delete fallback.product_cost;
    delete fallback.stock;
    delete fallback.sku;
    ({ data: created, error: createError } = await supabase
      .from("products")
      .insert(fallback)
      .select("id")
      .single());
  }

  // Very old schemas may also reject brand/featured/status/shipping_price.
  if (createError && isMissingColumnError(createError.message)) {
    ({ data: created, error: createError } = await supabase
      .from("products")
      .insert({
        name,
        description,
        category,
        rating,
        price: legacyMirror.price,
        product_cost: legacyMirror.product_cost,
        stock: legacyMirror.stock,
      })
      .select("id")
      .single());
  }

  if (createError || !created) {
    res.status(500);
    throw new Error(createError?.message || "Failed to create product");
  }

  if (images.length) {
    const rows = images.map((imageUrl, index) => ({
      product_id: created.id,
      image_url: imageUrl,
      sort_order: index,
    }));

    const { error: imagesError } = await supabase.from("product_images").insert(rows);
    if (imagesError) {
      res.status(500);
      throw new Error(imagesError.message);
    }
  }

  try {
    await insertProductVariations({ productId: created.id, variations: normalizedVariations });
  } catch (err) {
    res.status(500);
    throw err;
  }

  let fullProduct;
  try {
    fullProduct = await loadProductRowById(created.id);
  } catch (err) {
    res.status(500);
    throw err;
  }

  if (!fullProduct) {
    res.status(500);
    throw new Error("Failed to load created product");
  }

  res.status(201).json(mapProduct(fullProduct));
});

export const updateProduct = asyncHandler(async (req, res) => {
  const { data: existing, error: existingError } = await supabase
    .from("products")
    .select("id")
    .eq("id", req.params.id)
    .maybeSingle();

  if (existingError) {
    res.status(500);
    throw new Error(existingError.message);
  }

  if (!existing) {
    res.status(404);
    throw new Error("Product not found");
  }

  const payload = {};
  if (req.body.name !== undefined) payload.name = req.body.name;
  if (req.body.description !== undefined) payload.description = req.body.description;
  if (req.body.category !== undefined) payload.category = req.body.category;
  if (req.body.shippingPrice !== undefined) payload.shipping_price = Number(req.body.shippingPrice || 0);
  if (req.body.rating !== undefined) payload.rating = req.body.rating;
  if (req.body.brand !== undefined) payload.brand = req.body.brand || "";
  if (req.body.featured !== undefined) payload.featured = Boolean(req.body.featured);
  if (req.body.status !== undefined) payload.status = req.body.status;

  let normalizedVariations = null;
  if (Array.isArray(req.body.variations)) {
    if (!req.body.variations.length) {
      res.status(400);
      throw new Error("At least one variation is required");
    }

    normalizedVariations = req.body.variations.map((variation, index) => ({
      name: String(variation?.name || "").trim(),
      price: Number(variation?.price),
      discountedPrice:
        variation?.discountedPrice == null || variation.discountedPrice === ""
          ? null
          : Number(variation.discountedPrice),
      cost: Number(variation?.cost),
      stock: Number.parseInt(variation?.stock, 10),
      sku: variation?.sku ? String(variation.sku).trim() : "",
      imageUrl: variation?.imageUrl ? String(variation.imageUrl).trim() : "",
      sortOrder: Number.isFinite(Number(variation?.sortOrder)) ? Number(variation.sortOrder) : index,
    }));

    if (normalizedVariations.some((variation) => !variation.name)) {
      res.status(400);
      throw new Error("Variation name is required");
    }

    if (normalizedVariations.some((variation) => !Number.isFinite(variation.price) || variation.price < 0)) {
      res.status(400);
      throw new Error("Variation price is required");
    }

    if (normalizedVariations.some((variation) => !Number.isFinite(variation.cost) || variation.cost < 0)) {
      res.status(400);
      throw new Error("Variation cost is required");
    }

    if (normalizedVariations.some((variation) => !Number.isFinite(variation.stock) || variation.stock < 0)) {
      res.status(400);
      throw new Error("Variation stock is required");
    }

    if (
      normalizedVariations.some((variation) => {
        if (variation.discountedPrice == null) return false;
        if (!Number.isFinite(variation.discountedPrice) || variation.discountedPrice < 0) return true;
        return variation.discountedPrice > variation.price;
      })
    ) {
      res.status(400);
      throw new Error("Variation discounted price cannot be greater than variation price");
    }

    const variationSkus = normalizedVariations
      .map((variation) => variation.sku)
      .filter(Boolean);
    const uniqueVariationSkus = new Set(variationSkus);
    if (uniqueVariationSkus.size !== variationSkus.length) {
      res.status(400);
      throw new Error("Variation SKU values must be unique");
    }
  }

  // Mirror legacy NOT NULL product columns from incoming variations (when provided).
  const legacyMirrorUpdate = normalizedVariations
    ? summarizeVariationsForLegacyProduct(normalizedVariations)
    : null;

  let { error: updateError } = await supabase
    .from("products")
    .update({
      ...payload,
      ...(legacyMirrorUpdate
        ? {
            price: legacyMirrorUpdate.price,
            discount_price: legacyMirrorUpdate.discount_price,
            product_cost: legacyMirrorUpdate.product_cost,
            stock: legacyMirrorUpdate.stock,
            sku: legacyMirrorUpdate.sku,
          }
        : {}),
    })
    .eq("id", req.params.id);

  // Modern schema doesn't have these legacy columns -> retry without them.
  if (updateError && isMissingColumnError(updateError.message)) {
    const fallbackPayload = { ...payload };
    delete fallbackPayload.brand;
    delete fallbackPayload.featured;
    delete fallbackPayload.status;
    delete fallbackPayload.shipping_price;

    ({ error: updateError } = await supabase
      .from("products")
      .update(fallbackPayload)
      .eq("id", req.params.id));
  }

  if (updateError) {
    res.status(500);
    throw new Error(updateError.message);
  }

  if (Array.isArray(req.body.images)) {
    if (req.body.images.length < 1) {
      res.status(400);
      throw new Error("At least one image is required");
    }

    if (req.body.images.length > MAX_PRODUCT_IMAGES) {
      res.status(400);
      throw new Error(`A product can have at most ${MAX_PRODUCT_IMAGES} images`);
    }

    const { error: deleteImagesError } = await supabase
      .from("product_images")
      .delete()
      .eq("product_id", req.params.id);

    if (deleteImagesError) {
      res.status(500);
      throw new Error(deleteImagesError.message);
    }

    if (req.body.images.length) {
      const rows = req.body.images.map((imageUrl, index) => ({
        product_id: req.params.id,
        image_url: imageUrl,
        sort_order: index,
      }));
      const { error: insertImagesError } = await supabase.from("product_images").insert(rows);
      if (insertImagesError) {
        res.status(500);
        throw new Error(insertImagesError.message);
      }
    }
  }

  if (normalizedVariations) {
    const { error: deleteVariationsError } = await supabase
      .from("product_variations")
      .delete()
      .eq("product_id", req.params.id);

    if (deleteVariationsError) {
      res.status(500);
      throw new Error(deleteVariationsError.message);
    }

    try {
      await insertProductVariations({ productId: req.params.id, variations: normalizedVariations });
    } catch (err) {
      res.status(500);
      throw err;
    }
  }

  let updated;
  try {
    updated = await loadProductRowById(req.params.id);
  } catch (err) {
    res.status(500);
    throw err;
  }

  if (!updated) {
    res.status(500);
    throw new Error("Failed to load updated product");
  }

  res.json(mapProduct(updated));
});

export const deleteProduct = asyncHandler(async (req, res) => {
  const { data: existing, error: existingError } = await supabase
    .from("products")
    .select("id")
    .eq("id", req.params.id)
    .maybeSingle();

  if (existingError) {
    res.status(500);
    throw new Error(existingError.message);
  }

  if (!existing) {
    res.status(404);
    throw new Error("Product not found");
  }

  const { error } = await supabase.from("products").delete().eq("id", req.params.id);
  if (error) {
    res.status(500);
    throw new Error(error.message);
  }

  res.json({ message: "Product removed" });
});

export const addReview = asyncHandler(async (req, res) => {
  const { rating, comment, title } = req.body;
  const product = await ensureReviewProductExists(req.params.id);
  if (!product) {
    res.status(404);
    throw new Error("Product not found");
  }

  const deliveredOrder = await getEligibleDeliveredOrder({
    userId: req.user._id,
    productId: req.params.id,
  });

  if (!deliveredOrder) {
    res.status(403);
    throw new Error("You can only review products you have purchased and received.");
  }

  const { data: existingReviews, error: existingError } = await supabase
    .from("product_reviews")
    .select("id")
    .eq("product_id", req.params.id)
    .eq("user_id", req.user._id)
    .eq("order_id", deliveredOrder.id)
    .limit(1);

  if (existingError) {
    res.status(500);
    throw new Error(existingError.message);
  }

  if (Array.isArray(existingReviews) && existingReviews.length > 0) {
    res.status(409);
    throw new Error("You already reviewed this product for this order. Please edit your existing review.");
  }

  const { data: insertedReview, error: insertError } = await supabase
    .from("product_reviews")
    .insert({
      product_id: req.params.id,
      user_id: req.user._id,
      order_id: deliveredOrder.id,
      name: req.user.name,
      title: String(title || "").trim(),
      rating: Number(rating),
      comment,
    })
    .select("id, user_id, name, title, rating, comment, order_id, created_at, updated_at")
    .single();

  if (insertError) {
    res.status(500);
    throw new Error(insertError.message);
  }

  await refreshProductRating(req.params.id);

  res.status(201).json({
    message: "Review added",
    review: normalizeReview(insertedReview),
  });
});

export const updateOwnReview = asyncHandler(async (req, res) => {
  const { rating, comment, title } = req.body;

  const product = await ensureReviewProductExists(req.params.id);
  if (!product) {
    res.status(404);
    throw new Error("Product not found");
  }

  const deliveredOrder = await getEligibleDeliveredOrder({
    userId: req.user._id,
    productId: req.params.id,
  });

  if (!deliveredOrder) {
    res.status(403);
    throw new Error("You can only review products you have purchased and received.");
  }

  const { data: existingReviews, error: existingError } = await supabase
    .from("product_reviews")
    .select("id")
    .eq("product_id", req.params.id)
    .eq("user_id", req.user._id)
    .eq("order_id", deliveredOrder.id)
    .order("created_at", { ascending: false })
    .limit(1);

  if (existingError) {
    res.status(500);
    throw new Error(existingError.message);
  }

  const targetReview = Array.isArray(existingReviews) ? existingReviews[0] || null : null;

  if (!targetReview) {
    res.status(404);
    throw new Error("Review not found for this product and order");
  }

  const { data: updatedReview, error: updateError } = await supabase
    .from("product_reviews")
    .update({
      rating: Number(rating),
      comment,
      title: String(title || "").trim(),
      order_id: deliveredOrder.id,
      name: req.user.name,
    })
    .eq("id", targetReview.id)
    .select("id, user_id, name, title, rating, comment, order_id, created_at, updated_at")
    .single();

  if (updateError) {
    res.status(500);
    throw new Error(updateError.message);
  }

  await refreshProductRating(req.params.id);

  res.json({
    message: "Review updated",
    review: normalizeReview(updatedReview),
  });
});

export const uploadProductImages = asyncHandler(async (req, res) => {
  const files = req.files || [];

  if (!files.length) {
    res.status(400);
    throw new Error("Please select at least one image");
  }

  if (files.length > MAX_PRODUCT_IMAGES) {
    res.status(400);
    throw new Error(`You can upload up to ${MAX_PRODUCT_IMAGES} images only`);
  }

  const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
  if (!bucketsError) {
    const exists = (buckets || []).some((bucket) => bucket.name === PRODUCT_IMAGES_BUCKET);
    if (!exists) {
      const { error: createBucketError } = await supabase.storage.createBucket(PRODUCT_IMAGES_BUCKET, {
        public: true,
      });
      if (createBucketError) {
        res.status(500);
        throw new Error(createBucketError.message);
      }
    }
  }

  const uploadedPaths = [];
  const imageUrls = [];

  for (const file of files) {
    const extension = file.originalname.includes(".")
      ? file.originalname.slice(file.originalname.lastIndexOf(".")).toLowerCase()
      : "";
    const path = `products/${Date.now()}-${crypto.randomUUID()}${extension}`;

    const { error: uploadError } = await supabase.storage
      .from(PRODUCT_IMAGES_BUCKET)
      .upload(path, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      });

    if (uploadError) {
      if (uploadedPaths.length) {
        await supabase.storage.from(PRODUCT_IMAGES_BUCKET).remove(uploadedPaths);
      }
      res.status(500);
      throw new Error(uploadError.message);
    }

    uploadedPaths.push(path);

    const {
      data: { publicUrl },
    } = supabase.storage.from(PRODUCT_IMAGES_BUCKET).getPublicUrl(path);
    imageUrls.push(publicUrl);
  }

  res.status(201).json({ images: imageUrls });
});
