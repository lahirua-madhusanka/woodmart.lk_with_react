import jwt from "jsonwebtoken";
import asyncHandler from "express-async-handler";
import env from "../config/env.js";
import supabase from "../config/supabase.js";

const extractToken = (req) => {
  const authHeader = req.headers.authorization || "";
  if (authHeader.startsWith("Bearer ")) {
    return authHeader.split(" ")[1];
  }

  // Fallback to cookie auth only when no explicit bearer token is provided.
  if (req.cookies?.token) {
    return req.cookies.token;
  }

  return null;
};

export const protect = asyncHandler(async (req, res, next) => {
  const token = extractToken(req);

  if (!token) {
    res.status(401);
    throw new Error("Not authorized, token missing");
  }

  try {
    const decoded = jwt.verify(token, env.jwtSecret);
    const { data: user, error } = await supabase
      .from("users")
      .select("id, name, email, role, created_at, updated_at")
      .eq("id", decoded.id)
      .single();

    if (error || !user) {
      res.status(401);
      throw new Error("User not found");
    }

    req.user = {
      _id: user.id,
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
    };
    next();
  } catch {
    res.status(401);
    throw new Error("Not authorized, token invalid");
  }
});

export const optionalProtect = asyncHandler(async (req, res, next) => {
  const token = extractToken(req);

  if (!token) {
    return next();
  }

  try {
    const decoded = jwt.verify(token, env.jwtSecret);
    const { data: user, error } = await supabase
      .from("users")
      .select("id, name, email, role, created_at, updated_at")
      .eq("id", decoded.id)
      .single();

    if (!error && user) {
      req.user = {
        _id: user.id,
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
      };
    }
  } catch {
    // Ignore invalid optional tokens and continue as guest.
  }

  return next();
});

export const adminOnly = (req, res, next) => {
  if (req.user?.role !== "admin") {
    res.status(403);
    throw new Error("You are not authorized to perform this action");
  }
  next();
};
