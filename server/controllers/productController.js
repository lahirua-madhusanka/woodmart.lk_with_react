import asyncHandler from "express-async-handler";
import crypto from "node:crypto";
import supabase from "../config/supabase.js";
import { mapProduct } from "../utils/dbMappers.js";

const MAX_PRODUCT_IMAGES = 6;
const PRODUCT_IMAGES_BUCKET = process.env.PRODUCT_IMAGES_BUCKET || "product-images";
const isMissingColumnError = (message = "") =>
  message.includes("Could not find") && message.includes("column");

const calculateRating = (reviews = []) => {
  if (!reviews.length) return 0;
  const sum = reviews.reduce((acc, review) => acc + review.rating, 0);
  return Number((sum / reviews.length).toFixed(1));
};

const productSelect =
  "id, name, description, price, discount_price, product_cost, shipping_price, category, stock, rating, created_at, updated_at, product_images(image_url, sort_order), product_reviews(id, user_id, name, rating, comment, created_at, updated_at)";

export const getProducts = asyncHandler(async (req, res) => {
  const { category, q, sort } = req.query;
  const sortMap = {
    newest: { column: "created_at", ascending: false },
    priceAsc: { column: "price", ascending: true },
    priceDesc: { column: "price", ascending: false },
    rating: { column: "rating", ascending: false },
  };

  let query = supabase.from("products").select(productSelect);

  if (category) {
    query = query.eq("category", category);
  }

  if (q) {
    query = query.or(`name.ilike.%${q}%,description.ilike.%${q}%`);
  }

  const sortConfig = sortMap[sort] || { column: "created_at", ascending: false };
  query = query.order(sortConfig.column, { ascending: sortConfig.ascending });

  const { data, error } = await query;
  if (error) {
    res.status(500);
    throw new Error(error.message);
  }

  res.json((data || []).map(mapProduct));
});

export const getProductById = asyncHandler(async (req, res) => {
  const { data, error } = await supabase
    .from("products")
    .select(productSelect)
    .eq("id", req.params.id)
    .maybeSingle();

  if (error) {
    res.status(500);
    throw new Error(error.message);
  }

  if (!data) {
    res.status(404);
    throw new Error("Product not found");
  }

  res.json(mapProduct(data));
});

export const createProduct = asyncHandler(async (req, res) => {
  const {
    name,
    description,
    price,
    discountPrice,
    category,
    productCost = 0,
    shippingPrice = 0,
    images = [],
    stock = 0,
    rating = 0,
    sku = null,
    brand = "",
    featured = false,
    status = "active",
  } = req.body;

  if (!Array.isArray(images) || images.length < 1) {
    res.status(400);
    throw new Error("At least one image is required");
  }

  if (images.length > MAX_PRODUCT_IMAGES) {
    res.status(400);
    throw new Error(`A product can have at most ${MAX_PRODUCT_IMAGES} images`);
  }

  if (discountPrice != null && Number(discountPrice) > Number(price)) {
    res.status(400);
    throw new Error("Discount price cannot be greater than price");
  }

  const insertPayload = {
    name,
    description,
    price,
    discount_price: discountPrice ?? null,
    category,
    product_cost: Number(productCost || 0),
    shipping_price: Number(shippingPrice || 0),
    stock,
    rating,
    sku: sku || null,
    brand: brand || "",
    featured: Boolean(featured),
    status: status || "active",
  };

  let { data: created, error: createError } = await supabase
    .from("products")
    .insert(insertPayload)
    .select("id")
    .single();

  if (createError && isMissingColumnError(createError.message)) {
    ({ data: created, error: createError } = await supabase
      .from("products")
      .insert({
        name,
        description,
        price,
        discount_price: discountPrice ?? null,
        category,
        product_cost: Number(productCost || 0),
        shipping_price: Number(shippingPrice || 0),
        stock,
        rating,
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

  const { data: fullProduct, error: loadError } = await supabase
    .from("products")
    .select(productSelect)
    .eq("id", created.id)
    .single();

  if (loadError || !fullProduct) {
    res.status(500);
    throw new Error(loadError?.message || "Failed to load created product");
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
  if (req.body.price !== undefined) payload.price = req.body.price;
  if (req.body.discountPrice !== undefined) payload.discount_price = req.body.discountPrice;
  if (req.body.category !== undefined) payload.category = req.body.category;
  if (req.body.productCost !== undefined) payload.product_cost = Number(req.body.productCost || 0);
  if (req.body.shippingPrice !== undefined) payload.shipping_price = Number(req.body.shippingPrice || 0);
  if (req.body.stock !== undefined) payload.stock = req.body.stock;
  if (req.body.rating !== undefined) payload.rating = req.body.rating;
  if (req.body.sku !== undefined) payload.sku = req.body.sku || null;
  if (req.body.brand !== undefined) payload.brand = req.body.brand || "";
  if (req.body.featured !== undefined) payload.featured = Boolean(req.body.featured);
  if (req.body.status !== undefined) payload.status = req.body.status;

  if (
    req.body.discountPrice !== undefined &&
    req.body.price !== undefined &&
    req.body.discountPrice != null &&
    Number(req.body.discountPrice) > Number(req.body.price)
  ) {
    res.status(400);
    throw new Error("Discount price cannot be greater than price");
  }

  let { error: updateError } = await supabase
    .from("products")
    .update(payload)
    .eq("id", req.params.id);

  if (updateError && isMissingColumnError(updateError.message)) {
    const fallbackPayload = { ...payload };
    delete fallbackPayload.sku;
    delete fallbackPayload.brand;
    delete fallbackPayload.featured;
    delete fallbackPayload.status;
    delete fallbackPayload.product_cost;
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

  const { data: updated, error: loadError } = await supabase
    .from("products")
    .select(productSelect)
    .eq("id", req.params.id)
    .single();

  if (loadError || !updated) {
    res.status(500);
    throw new Error(loadError?.message || "Failed to load updated product");
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
  const { rating, comment } = req.body;
  const { data: product, error: productError } = await supabase
    .from("products")
    .select("id")
    .eq("id", req.params.id)
    .maybeSingle();

  if (productError) {
    res.status(500);
    throw new Error(productError.message);
  }

  if (!product) {
    res.status(404);
    throw new Error("Product not found");
  }

  const { data: existingReview, error: existingError } = await supabase
    .from("product_reviews")
    .select("id")
    .eq("product_id", req.params.id)
    .eq("user_id", req.user._id)
    .maybeSingle();

  if (existingError) {
    res.status(500);
    throw new Error(existingError.message);
  }

  if (existingReview) {
    res.status(400);
    throw new Error("Product already reviewed by this user");
  }

  const { error: insertError } = await supabase.from("product_reviews").insert({
    product_id: req.params.id,
    user_id: req.user._id,
    name: req.user.name,
    rating: Number(rating),
    comment,
  });

  if (insertError) {
    res.status(500);
    throw new Error(insertError.message);
  }

  const { data: reviews, error: reviewsError } = await supabase
    .from("product_reviews")
    .select("rating")
    .eq("product_id", req.params.id);

  if (reviewsError) {
    res.status(500);
    throw new Error(reviewsError.message);
  }

  const nextRating = calculateRating(reviews || []);

  const { error: ratingError } = await supabase
    .from("products")
    .update({ rating: nextRating })
    .eq("id", req.params.id);

  if (ratingError) {
    res.status(500);
    throw new Error(ratingError.message);
  }

  res.status(201).json({ message: "Review added" });
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
