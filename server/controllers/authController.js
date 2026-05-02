import asyncHandler from "express-async-handler";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import env from "../config/env.js";
import supabase from "../config/supabase.js";
import { mapProduct, mapUser } from "../utils/dbMappers.js";
import { sendPasswordResetEmail } from "../utils/email.js";
import { sendVerificationEmail } from "../services/brevoVerificationEmailService.js";

const signToken = (id) => jwt.sign({ id }, env.jwtSecret, { expiresIn: env.jwtExpiresIn });
const EMAIL_VERIFICATION_TTL_HOURS = Math.max(1, Number(env.emailVerificationTtlHours || 1));
const PASSWORD_RESET_TTL_HOURS = 1;
const RESEND_COOLDOWN_MS = 60 * 1000;
const resendGuard = new Map();
const recentVerifiedTokens = new Map();
const RECENT_VERIFIED_TOKEN_TTL_MS = 10 * 60 * 1000;

const getDefaultNameFromEmail = (email) => {
  const [namePart] = String(email || "").split("@");
  return namePart || "User";
};

const hashVerificationToken = (token) =>
  crypto.createHash("sha256").update(String(token)).digest("hex");

const authLog = (event, payload = {}) => {
  // eslint-disable-next-line no-console
  console.log(
    "[AUTH_VERIFICATION]",
    JSON.stringify({
      event,
      timestamp: new Date().toISOString(),
      ...payload,
    })
  );
};

const normalizeBaseUrl = (value) => String(value || "").trim().replace(/\/+$/, "");

const getClientBaseUrl = (req) => {
  const allowedOrigins = new Set([env.clientUrl, ...env.clientUrls].map(normalizeBaseUrl).filter(Boolean));
  const requestOrigin = normalizeBaseUrl(req?.headers?.origin || req?.get?.("origin") || "");

  if (requestOrigin && allowedOrigins.has(requestOrigin)) {
    return requestOrigin;
  }

  return normalizeBaseUrl(env.clientUrl);
};

const buildPasswordResetUrl = (req, token) =>
  `${getClientBaseUrl(req)}/reset-password?token=${encodeURIComponent(token)}`;

const buildVerificationUrl = (req, token) =>
  `${getClientBaseUrl(req)}/verify-email?token=${encodeURIComponent(token)}`;

const createVerificationToken = () => {
  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashVerificationToken(token);
  const expiresAt = new Date(Date.now() + EMAIL_VERIFICATION_TTL_HOURS * 60 * 60 * 1000).toISOString();

  return {
    token,
    tokenHash,
    expiresAt,
  };
};

const persistVerificationToken = async ({ userId, tokenHash, expiresAt }) => {
  await supabase.from("verification_tokens").delete().eq("user_id", userId);

  const { error } = await supabase.from("verification_tokens").insert({
    user_id: userId,
    token: tokenHash,
    expires_at: expiresAt,
  });

  if (error) {
    throw new Error(error.message || "Failed to persist verification token");
  }
};

const sendVerificationToUser = async ({ req, userId, email, name, awaitDelivery = false }) => {
  const { token, tokenHash, expiresAt } = createVerificationToken();
  authLog("verification_token_created", { userId, email, expiresAt });

  await persistVerificationToken({ userId, tokenHash, expiresAt });
  authLog("verification_token_saved", { userId, email, expiresAt });

  const verificationUrl = buildVerificationUrl(req, token);
  authLog("verification_email_send_started", { userId, email });

  const task = Promise.resolve().then(() =>
    sendVerificationEmail({
      toEmail: email,
      name,
      verificationUrl,
      expiresInHours: EMAIL_VERIFICATION_TTL_HOURS,
    })
  );

  if (awaitDelivery) {
    await task;
  } else {
    void task.catch((error) => {
      authLog("verification_email_send_failed", {
        userId,
        email,
        message: error?.message || "Unknown error",
        statusCode: error?.statusCode || null,
        providerStatus: error?.providerStatus || null,
      });
    });
  }

  return {
    expiresAt,
  };
};

const isStrongPassword = (password) => {
  const value = String(password || "");
  return (
    value.length >= 8 &&
    /[A-Z]/.test(value) &&
    /[a-z]/.test(value) &&
    /\d/.test(value) &&
    /[^A-Za-z0-9]/.test(value)
  );
};

const createPasswordResetToken = () => {
  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashVerificationToken(token);
  const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_HOURS * 60 * 60 * 1000).toISOString();

  return {
    token,
    tokenHash,
    expiresAt,
  };
};

const invalidOrExpiredResetError = (res) => {
  if (res && typeof res.status === "function") {
    res.status(400);
  }
  throw new Error("Reset link is invalid or expired");
};

const setAuthCookie = (res, token) => {
  res.cookie("token", token, {
    httpOnly: true,
    secure: env.nodeEnv === "production",
    sameSite: env.nodeEnv === "production" ? "none" : "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
};

export const registerUser = asyncHandler(async (req, res) => {
  const { name, username, email, password, confirmPassword } = req.body;
  authLog("register_start", { email: String(email || "").trim().toLowerCase() });

  if (!name || !email || !password) {
    res.status(400);
    throw new Error("Missing required fields");
  }

  if (confirmPassword != null && password !== confirmPassword) {
    res.status(400);
    throw new Error("Passwords do not match");
  }

  const normalizedEmail = String(email).trim().toLowerCase();

  const { data: existing, error: existingError } = await supabase
    .from("users")
    .select("id")
    .eq("email", normalizedEmail)
    .maybeSingle();

  if (existingError) {
    res.status(500);
    throw new Error(existingError.message);
  }

  if (existing) {
    res.status(409);
    throw new Error("Email already registered");
  }

  const userName = name || username;
  const passwordHash = await bcrypt.hash(password, 10);

  const { data: createdUser, error: createError } = await supabase
    .from("users")
    .insert({
      name: userName || getDefaultNameFromEmail(normalizedEmail),
      email: normalizedEmail,
      password_hash: passwordHash,
      role: "user",
      email_verified: false,
      email_verified_at: null,
    })
    .select("id, name, email, role, email_verified, email_verified_at, created_at, updated_at")
    .single();

  if (createError || !createdUser) {
    res.status(500);
    throw new Error(createError?.message || "Failed to register user");
  }

  authLog("register_user_created", {
    userId: createdUser.id,
    email: createdUser.email,
  });

  await sendVerificationToUser({
    req,
    userId: createdUser.id,
    email: createdUser.email,
    name: createdUser.name,
    awaitDelivery: false,
  });

  authLog("verification_email_queued", {
    userId: createdUser.id,
    email: createdUser.email,
  });

  res.status(201).json({
    message: "Registration successful. Please check your email to verify your account.",
    requiresVerification: true,
    email: normalizedEmail,
    user: mapUser(createdUser),
  });
});

export const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400);
    throw new Error("Missing required fields");
  }

  const normalizedEmail = String(email).trim().toLowerCase();

  const { data: localUser, error: localUserError } = await supabase
    .from("users")
    .select("id, name, email, role, password_hash, email_verified, email_verified_at, created_at, updated_at")
    .eq("email", normalizedEmail)
    .maybeSingle();

  if (localUserError) {
    res.status(500);
    throw new Error(localUserError.message);
  }

  if (!localUser) {
    res.status(401);
    throw new Error("Invalid email or password");
  }

  if (!localUser.password_hash || localUser.password_hash === "SUPABASE_AUTH_MANAGED") {
    res.status(400);
    throw new Error("This account is not eligible for password login. Please reset your password.");
  }

  const validPassword = await bcrypt.compare(password, localUser.password_hash);
  if (!validPassword) {
    res.status(401);
    throw new Error("Invalid email or password");
  }

  if (!localUser.email_verified) {
    res.status(403);
    throw new Error("Please verify your email before logging in.");
  }

  const token = signToken(localUser.id);
  setAuthCookie(res, token);

  res.json({
    token,
    user: mapUser(localUser),
  });
});

export const getProfile = asyncHandler(async (req, res) => {
  const { data: user, error: userError } = await supabase
    .from("users")
    .select("id, name, email, role, email_verified, email_verified_at, created_at, updated_at")
    .eq("id", req.user._id)
    .single();

  if (userError || !user) {
    res.status(404);
    throw new Error("User not found");
  }

  const wishlistSelectV2 =
    "product_id, products(id, name, description, shipping_price, category, rating, brand, featured, status, created_at, updated_at, product_images(image_url, sort_order), product_variations(id, name, price, discounted_price, cost, stock, sku, image_url, sort_order))";
  const wishlistSelectV2NoSelling =
    "product_id, products(id, name, description, shipping_price, category, rating, brand, featured, status, created_at, updated_at, product_images(image_url, sort_order), product_variations(id, name, price, sku, image_url, sort_order))";
  const wishlistSelectV1 =
    "product_id, products(id, name, description, shipping_price, category, rating, brand, featured, status, created_at, updated_at, product_images(image_url, sort_order), product_variations(id, variation_name, price, discounted_price, cost, stock, sku, image_url, sort_order))";
  const wishlistSelectV1NoSelling =
    "product_id, products(id, name, description, shipping_price, category, rating, brand, featured, status, created_at, updated_at, product_images(image_url, sort_order), product_variations(id, variation_name, price, sku, image_url, sort_order))";
  const wishlistSelectMinimal =
    "product_id, products(id, name, description, category, rating, created_at, updated_at, product_images(image_url, sort_order))";

  const isMissingVariationName = (msg = "") => {
    const m = String(msg).toLowerCase();
    return m.includes("product_variations") && m.includes("column") && (m.includes(".name") || m.includes('"name"'));
  };
  const isMissingVariationSelling = (msg = "") => {
    const m = String(msg).toLowerCase();
    return m.includes("product_variations") && m.includes("column") && (m.includes("discounted_price") || m.includes("cost") || m.includes("stock"));
  };
  const isMissingProductCol = (msg = "") => {
    const m = String(msg).toLowerCase();
    return m.includes("column") && (m.includes("brand") || m.includes("featured") || m.includes("status") || m.includes("shipping_price"));
  };

  const runWishlist = (selectClause) =>
    supabase.from("user_wishlist").select(selectClause).eq("user_id", req.user._id);

  let wishlistResult = await runWishlist(wishlistSelectV2);
  if (wishlistResult.error && isMissingVariationSelling(wishlistResult.error.message)) {
    wishlistResult = await runWishlist(wishlistSelectV2NoSelling);
  }
  if (wishlistResult.error && isMissingVariationName(wishlistResult.error.message)) {
    wishlistResult = await runWishlist(wishlistSelectV1);
  }
  if (wishlistResult.error && isMissingVariationSelling(wishlistResult.error.message)) {
    wishlistResult = await runWishlist(wishlistSelectV1NoSelling);
  }
  if (wishlistResult.error && isMissingProductCol(wishlistResult.error.message)) {
    wishlistResult = await runWishlist(wishlistSelectMinimal);
  }

  const { data: wishlistRows, error: wishlistError } = wishlistResult;

  if (wishlistError) {
    res.status(500);
    throw new Error(wishlistError.message);
  }

  const wishlist = (wishlistRows || [])
    .map((entry) => entry.products)
    .filter(Boolean)
    .map((product) => mapProduct({ ...product, product_reviews: [] }));

  res.json({ user: mapUser(user), wishlist });
});

export const logoutUser = asyncHandler(async (req, res) => {
  res.cookie("token", "", {
    httpOnly: true,
    expires: new Date(0),
    secure: env.nodeEnv === "production",
    sameSite: env.nodeEnv === "production" ? "none" : "lax",
  });
  res.json({ message: "Logged out" });
});

/**
 * Register a new admin user
 * In production, this should be protected by a secret key or require existing admin approval
 */
export const registerAdmin = asyncHandler(async (req, res) => {
  const { name, email, password, confirmPassword, adminSecret } = req.body;

  // Verify admin secret (development only - set in .env as ADMIN_REGISTER_SECRET)
  if (adminSecret !== process.env.ADMIN_REGISTER_SECRET) {
    res.status(403);
    throw new Error("Invalid admin registration secret");
  }

  if (!name || !email || !password) {
    res.status(400);
    throw new Error("Missing required fields");
  }

  if (confirmPassword != null && password !== confirmPassword) {
    res.status(400);
    throw new Error("Passwords do not match");
  }

  const normalizedEmail = String(email).trim().toLowerCase();

  const { data: existing, error: existingError } = await supabase
    .from("users")
    .select("id")
    .eq("email", normalizedEmail)
    .maybeSingle();

  if (existingError) {
    res.status(500);
    throw new Error(existingError.message);
  }

  if (existing) {
    res.status(409);
    throw new Error("Email already registered");
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const { data: created, error: createError } = await supabase
    .from("users")
    .insert({
      name: name,
      email: normalizedEmail,
      password_hash: passwordHash,
      role: "admin",
      email_verified: true,
      email_verified_at: new Date().toISOString(),
    })
    .select("id, name, email, role, email_verified, email_verified_at, created_at, updated_at")
    .single();

  if (createError || !created) {
    res.status(500);
    throw new Error(createError?.message || "Failed to create admin user");
  }

  const token = signToken(created.id);
  setAuthCookie(res, token);

  res.status(201).json({ token, user: mapUser(created) });
});

export const updateProfile = asyncHandler(async (req, res) => {
  const name = String(req.body.name || "").trim();
  const email = String(req.body.email || "").trim().toLowerCase();

  if (!name || !email) {
    res.status(400);
    throw new Error("Name and email are required");
  }

  const { data: conflict, error: conflictError } = await supabase
    .from("users")
    .select("id")
    .eq("email", email)
    .neq("id", req.user._id)
    .maybeSingle();

  if (conflictError) {
    res.status(500);
    throw new Error(conflictError.message);
  }

  if (conflict) {
    res.status(409);
    throw new Error("Email already in use");
  }

  const { data: updated, error: updateError } = await supabase
    .from("users")
    .update({ name, email })
    .eq("id", req.user._id)
    .select("id, name, email, role, created_at, updated_at")
    .single();

  if (updateError || !updated) {
    res.status(500);
    throw new Error(updateError?.message || "Failed to update profile");
  }

  res.json({ user: mapUser(updated) });
});

export const changePassword = asyncHandler(async (req, res) => {
  const currentPassword = String(req.body.currentPassword || "");
  const newPassword = String(req.body.newPassword || "");

  if (!currentPassword || !newPassword) {
    res.status(400);
    throw new Error("Current password and new password are required");
  }

  if (newPassword.length < 6) {
    res.status(400);
    throw new Error("New password must be at least 6 characters");
  }

  const { data: user, error: userError } = await supabase
    .from("users")
    .select("id, password_hash")
    .eq("id", req.user._id)
    .single();

  if (userError || !user) {
    res.status(404);
    throw new Error("User not found");
  }

  if (!user.password_hash || user.password_hash === "SUPABASE_AUTH_MANAGED") {
    res.status(400);
    throw new Error("Password change is not available for this account");
  }

  const validPassword = await bcrypt.compare(currentPassword, user.password_hash);
  if (!validPassword) {
    res.status(400);
    throw new Error("Current password is incorrect");
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  const { error: updateError } = await supabase
    .from("users")
    .update({ password_hash: passwordHash })
    .eq("id", req.user._id);

  if (updateError) {
    res.status(500);
    throw new Error(updateError.message);
  }

  res.json({ message: "Password updated successfully" });
});

export const forgotPassword = asyncHandler(async (req, res) => {
  const normalizedEmail = String(req.body.email || "").trim().toLowerCase();
  const genericMessage = "If an account exists for this email, a password reset link has been sent.";

  if (!normalizedEmail) {
    return res.json({ message: genericMessage });
  }

  const { data: user, error: userError } = await supabase
    .from("users")
    .select("id, name, email, password_hash")
    .eq("email", normalizedEmail)
    .maybeSingle();

  if (userError) {
    return res.json({ message: genericMessage });
  }

  if (!user || !user.password_hash || user.password_hash === "SUPABASE_AUTH_MANAGED") {
    return res.json({ message: genericMessage });
  }

  try {
    const { token, tokenHash, expiresAt } = createPasswordResetToken();

    await supabase.from("password_reset_tokens").delete().eq("user_id", user.id);

    const { error: tokenError } = await supabase.from("password_reset_tokens").insert({
      user_id: user.id,
      token: tokenHash,
      expires_at: expiresAt,
    });

    if (tokenError) {
      return res.json({ message: genericMessage });
    }

    await sendPasswordResetEmail({
      toEmail: user.email,
      name: user.name,
      resetUrl: buildPasswordResetUrl(req, token),
    });
  } catch {
    // Intentionally return a generic response to avoid account enumeration.
  }

  return res.json({ message: genericMessage });
});

export const validateResetPasswordToken = asyncHandler(async (req, res) => {
  const token = String(req.query.token || "").trim();

  if (!token) {
    res.status(400);
    throw new Error("Reset link is invalid or expired");
  }

  const tokenHash = hashVerificationToken(token);
  const { data: tokenRow, error } = await supabase
    .from("password_reset_tokens")
    .select("id, user_id, expires_at")
    .eq("token", tokenHash)
    .maybeSingle();

  if (error) {
    res.status(500);
    throw new Error(error.message);
  }

  if (!tokenRow) {
    res.status(400);
    throw new Error("Reset link is invalid or expired");
  }

  const expiresAt = tokenRow.expires_at ? new Date(tokenRow.expires_at) : null;
  if (!expiresAt || Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() < Date.now()) {
    await supabase.from("password_reset_tokens").delete().eq("id", tokenRow.id);
    res.status(400);
    throw new Error("Reset link is invalid or expired");
  }

  const { data: user, error: userError } = await supabase
    .from("users")
    .select("id")
    .eq("id", tokenRow.user_id)
    .maybeSingle();

  if (userError) {
    res.status(500);
    throw new Error(userError.message);
  }

  if (!user) {
    await supabase.from("password_reset_tokens").delete().eq("id", tokenRow.id);
    res.status(400);
    throw new Error("Reset link is invalid or expired");
  }

  return res.json({
    success: true,
    status: "valid",
    message: "Reset link is valid",
  });
});

export const resetPasswordWithToken = asyncHandler(async (req, res) => {
  const token = String(req.body.token || "").trim();
  const newPassword = String(req.body.newPassword || "");

  if (!token) {
    res.status(400);
    throw new Error("Reset link is invalid or expired");
  }

  if (!isStrongPassword(newPassword)) {
    res.status(400);
    throw new Error("Password must be at least 8 characters and include uppercase, lowercase, number, and special character");
  }

  const tokenHash = hashVerificationToken(token);
  const { data: tokenRow, error } = await supabase
    .from("password_reset_tokens")
    .select("id, user_id, expires_at")
    .eq("token", tokenHash)
    .maybeSingle();

  if (error) {
    res.status(500);
    throw new Error(error.message);
  }

  if (!tokenRow) {
    invalidOrExpiredResetError(res);
  }

  const expiresAt = tokenRow.expires_at ? new Date(tokenRow.expires_at) : null;
  if (!expiresAt || Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() < Date.now()) {
    await supabase.from("password_reset_tokens").delete().eq("id", tokenRow.id);
    invalidOrExpiredResetError(res);
  }

  const { data: user, error: userError } = await supabase
    .from("users")
    .select("id")
    .eq("id", tokenRow.user_id)
    .maybeSingle();

  if (userError) {
    res.status(500);
    throw new Error(userError.message);
  }

  if (!user) {
    await supabase.from("password_reset_tokens").delete().eq("id", tokenRow.id);
    invalidOrExpiredResetError(res);
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  const { error: updateError } = await supabase
    .from("users")
    .update({ password_hash: passwordHash })
    .eq("id", user.id);

  if (updateError) {
    res.status(500);
    throw new Error(updateError.message);
  }

  await supabase.from("password_reset_tokens").delete().eq("user_id", user.id);

  return res.json({
    success: true,
    message: "Password reset successful. You can now log in with your new password.",
  });
});

export const verifyEmail = asyncHandler(async (req, res) => {
  const token = String(req.query.token || req.body?.token || "").trim();
  authLog("verify_email_attempt", { hasToken: Boolean(token) });

  if (!token) {
    res.status(400);
    throw new Error("Invalid verification link");
  }

  const tokenHash = hashVerificationToken(token);

  for (const [cachedTokenHash, verifiedAt] of recentVerifiedTokens.entries()) {
    if (Date.now() - verifiedAt > RECENT_VERIFIED_TOKEN_TTL_MS) {
      recentVerifiedTokens.delete(cachedTokenHash);
    }
  }

  if (recentVerifiedTokens.has(tokenHash)) {
    authLog("verify_email_already_verified", { tokenHash: tokenHash.slice(0, 10) });
    return res.json({
      success: true,
      status: "already_verified",
      message: "Email already verified",
    });
  }

  const { data: tokenRow, error: tokenError } = await supabase
    .from("verification_tokens")
    .select("id, user_id, expires_at")
    .eq("token", tokenHash)
    .maybeSingle();

  if (tokenError) {
    authLog("verify_email_failed", { reason: "token_lookup_error", message: tokenError.message });
    res.status(500);
    throw new Error(tokenError.message);
  }

  if (!tokenRow) {
    authLog("verify_email_failed", { reason: "token_not_found" });
    res.status(400);
    throw new Error("Invalid verification link");
  }

  const expiresAt = tokenRow.expires_at ? new Date(tokenRow.expires_at) : null;
  if (!expiresAt || Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() < Date.now()) {
    await supabase.from("verification_tokens").delete().eq("id", tokenRow.id);
    authLog("verify_email_failed", { reason: "token_expired", tokenId: tokenRow.id });
    res.status(400);
    throw new Error("Verification link has expired. Please request a new one.");
  }

  const { data: user, error: userError } = await supabase
    .from("users")
    .select("id, email_verified")
    .eq("id", tokenRow.user_id)
    .maybeSingle();

  if (userError) {
    authLog("verify_email_failed", { reason: "user_lookup_error", message: userError.message });
    res.status(500);
    throw new Error(userError.message);
  }

  if (!user) {
    await supabase.from("verification_tokens").delete().eq("id", tokenRow.id);
    authLog("verify_email_failed", { reason: "user_not_found", tokenId: tokenRow.id });
    res.status(400);
    throw new Error("Invalid verification link");
  }

  if (user.email_verified) {
    await supabase.from("verification_tokens").delete().eq("id", tokenRow.id);
    authLog("verify_email_already_verified", { userId: user.id, tokenId: tokenRow.id });
    return res.json({
      success: true,
      status: "already_verified",
      message: "Email already verified",
    });
  }

  const { error: updateError } = await supabase
    .from("users")
    .update({
      email_verified: true,
      email_verified_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (updateError) {
    authLog("verify_email_failed", { reason: "user_update_error", message: updateError.message });
    res.status(500);
    throw new Error(updateError.message);
  }

  await supabase.from("verification_tokens").delete().eq("id", tokenRow.id);
  recentVerifiedTokens.set(tokenHash, Date.now());
  authLog("verify_email_success", { userId: user.id, tokenId: tokenRow.id });

  return res.json({
    success: true,
    status: "verified",
    message: "Email verified successfully",
  });
});

export const resendVerificationEmail = asyncHandler(async (req, res) => {
  const normalizedEmail = String(req.body.email || "").trim().toLowerCase();
  authLog("resend_verification_attempt", { email: normalizedEmail });

  if (!normalizedEmail) {
    res.status(400);
    throw new Error("Email is required");
  }

  const lastSentAt = resendGuard.get(normalizedEmail);
  if (lastSentAt && Date.now() - lastSentAt < RESEND_COOLDOWN_MS) {
    res.status(429);
    throw new Error("Please wait before requesting another verification email");
  }

  const { data: user, error: userError } = await supabase
    .from("users")
    .select("id, name, email, email_verified")
    .eq("email", normalizedEmail)
    .maybeSingle();

  if (userError) {
    authLog("resend_verification_failed", { reason: "user_lookup_error", message: userError.message });
    res.status(500);
    throw new Error(userError.message);
  }

  if (!user) {
    return res.json({ message: "If this email is registered, a verification link has been sent." });
  }

  if (user.email_verified) {
    return res.json({ message: "Email already verified" });
  }

  try {
    await sendVerificationToUser({
      req,
      userId: user.id,
      email: user.email,
      name: user.name,
      awaitDelivery: true,
    });
  } catch (error) {
    authLog("resend_verification_failed", {
      reason: "send_failed",
      userId: user.id,
      message: error?.message || "Unknown error",
      statusCode: error?.statusCode || null,
      providerStatus: error?.providerStatus || null,
    });

    res.status(502);
    throw new Error("Unable to send verification email right now. Please try again.");
  }

  resendGuard.set(normalizedEmail, Date.now());
  authLog("resend_verification_success", { userId: user.id, email: user.email });

  return res.json({ message: "Verification email sent. Please check your inbox." });
});

