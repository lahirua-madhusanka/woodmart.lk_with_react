import asyncHandler from "express-async-handler";
import supabase from "../config/supabase.js";
import { mapProduct } from "../utils/dbMappers.js";

const productSelect =
  "id, name, description, shipping_price, category, rating, brand, featured, status, created_at, updated_at, product_images(image_url, sort_order), product_variations(id, name, price, discounted_price, cost, stock, sku, image_url, sort_order), product_reviews(id, user_id, name, rating, comment, created_at, updated_at)";

const loadWishlistProducts = async (userId) => {
  const { data, error } = await supabase
    .from("user_wishlist")
    .select(`product_id, products(${productSelect})`)
    .eq("user_id", userId);

  if (error) {
    throw new Error(error.message);
  }

  return (data || [])
    .map((entry) => entry.products)
    .filter(Boolean)
    .map(mapProduct);
};

export const getWishlist = asyncHandler(async (req, res) => {
  const wishlist = await loadWishlistProducts(req.user._id);
  res.json(wishlist);
});

export const addToWishlist = asyncHandler(async (req, res) => {
  const { productId } = req.body;
  const { data: product, error: productError } = await supabase
    .from("products")
    .select("id")
    .eq("id", productId)
    .maybeSingle();

  if (productError) {
    res.status(500);
    throw new Error(productError.message);
  }

  if (!product) {
    res.status(404);
    throw new Error("Product not found");
  }

  const { error: insertError } = await supabase.from("user_wishlist").upsert(
    {
      user_id: req.user._id,
      product_id: productId,
    },
    { onConflict: "user_id,product_id", ignoreDuplicates: true }
  );

  if (insertError) {
    res.status(500);
    throw new Error(insertError.message);
  }

  const wishlist = await loadWishlistProducts(req.user._id);
  res.json(wishlist);
});

export const removeFromWishlist = asyncHandler(async (req, res) => {
  const { productId } = req.body;
  const { error } = await supabase
    .from("user_wishlist")
    .delete()
    .eq("user_id", req.user._id)
    .eq("product_id", productId);

  if (error) {
    res.status(500);
    throw new Error(error.message);
  }

  const wishlist = await loadWishlistProducts(req.user._id);
  res.json(wishlist);
});
