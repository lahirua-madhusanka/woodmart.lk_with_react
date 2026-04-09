import asyncHandler from "express-async-handler";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import env from "../config/env.js";
import supabase from "../config/supabase.js";
import { mapProduct, mapUser } from "../utils/dbMappers.js";
import { sendPasswordResetEmail } from "../utils/email.js";

const signToken = (id) => jwt.sign({ id }, env.jwtSecret, { expiresIn: env.jwtExpiresIn });
const PASSWORD_RESET_TTL_HOURS = 1;

const getDefaultNameFromEmail = (email) => {
  const [namePart] = String(email || "").split("@");
  return namePart || "User";
};

const hashVerificationToken = (token) =>
  crypto.createHash("sha256").update(String(token)).digest("hex");

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
      email_verified: true,
      email_verified_at: new Date().toISOString(),
    })
    .select("id, name, email, role, email_verified, email_verified_at, created_at, updated_at")
    .single();

  if (createError || !createdUser) {
    res.status(500);
    throw new Error(createError?.message || "Failed to register user");
  }

  res.status(201).json({
    message: "Account created successfully. You can now log in.",
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

  const { data: wishlistRows, error: wishlistError } = await supabase
    .from("user_wishlist")
    .select("product_id, products(id, name, description, price, discount_price, category, stock, rating, created_at, updated_at, product_images(image_url, sort_order))")
    .eq("user_id", req.user._id);

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

