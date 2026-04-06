import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import http from "http";
import jwt from "jsonwebtoken";
import morgan from "morgan";
import { Server as SocketIOServer } from "socket.io";
import env from "./config/env.js";
import supabase from "./config/supabase.js";
import { errorHandler, notFound } from "./middleware/errorMiddleware.js";
import chatRoutes from "./routes/chatRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import cartRoutes from "./routes/cartRoutes.js";
import couponRoutes from "./routes/couponRoutes.js";
import contactRoutes from "./routes/contactRoutes.js";
import customProjectRoutes from "./routes/customProjectRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import productRoutes from "./routes/productRoutes.js";
import newsletterRoutes from "./routes/newsletterRoutes.js";
import seedRoutes from "./routes/seedRoutes.js";
import storefrontRoutes from "./routes/storefrontRoutes.js";
import wishlistRoutes from "./routes/wishlistRoutes.js";

const app = express();
const server = http.createServer(app);
const allowedOrigins = [env.clientUrl, ...env.clientUrls].filter(Boolean);

const corsOptions = {
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error("CORS origin denied"));
  },
  credentials: true,
};

const io = new SocketIOServer(server, {
  cors: corsOptions,
});

app.locals.io = io;

app.use(helmet());
app.use(cors(corsOptions));
app.use(morgan(env.nodeEnv === "production" ? "combined" : "dev"));
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", env: env.nodeEnv });
});

app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/products", productRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/coupons", couponRoutes);
app.use("/api/contact", contactRoutes);
app.use("/api/wishlist", wishlistRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/custom-projects", customProjectRoutes);
app.use("/api/newsletter", newsletterRoutes);
app.use("/api/seed", seedRoutes);
app.use("/api/store", storefrontRoutes);

app.use(notFound);
app.use(errorHandler);

io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) {
      return next(new Error("Socket auth token missing"));
    }

    const decoded = jwt.verify(token, env.jwtSecret);
    const { data: user, error } = await supabase
      .from("users")
      .select("id, role")
      .eq("id", decoded.id)
      .single();

    if (error || !user) {
      return next(new Error("Socket user not found"));
    }

    socket.data.userId = user.id;
    socket.data.role = user.role;
    return next();
  } catch {
    return next(new Error("Socket auth failed"));
  }
});

io.on("connection", (socket) => {
  const userId = socket.data.userId;
  const role = socket.data.role;

  socket.join(`user:${userId}`);
  if (role === "admin") {
    socket.join("admins");
  }

  socket.on("chat:join-conversation", (conversationId) => {
    if (!conversationId) return;
    socket.join(`conversation:${conversationId}`);
  });

  socket.on("chat:leave-conversation", (conversationId) => {
    if (!conversationId) return;
    socket.leave(`conversation:${conversationId}`);
  });
});

server.listen(env.port, () => {
  // eslint-disable-next-line no-console
  console.log(`API server running on port ${env.port}`);
});
