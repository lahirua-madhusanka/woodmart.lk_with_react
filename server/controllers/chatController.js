import asyncHandler from "express-async-handler";
import supabase from "../config/supabase.js";

const conversationSelect =
  "id, customer_id, admin_id, last_message_text, last_message_at, created_at, updated_at, customer:customer_id(id, name, email), admin:admin_id(id, name, email)";

const messageSelect =
  "id, conversation_id, sender_id, receiver_id, message_text, is_read, read_at, created_at, sender:sender_id(id, name, email, role)";

const isMissingRelationError = (message = "") => {
  const normalized = String(message).toLowerCase();
  return normalized.includes("could not find") && (normalized.includes("relation") || normalized.includes("table"));
};

const mapMessage = (row) => ({
  id: row.id,
  conversationId: row.conversation_id,
  senderId: row.sender_id,
  receiverId: row.receiver_id,
  text: row.message_text,
  isRead: Boolean(row.is_read),
  readAt: row.read_at,
  createdAt: row.created_at,
  sender: row.sender
    ? {
        id: row.sender.id,
        name: row.sender.name,
        email: row.sender.email,
        role: row.sender.role,
      }
    : null,
});

const getIo = (req) => req.app?.locals?.io;

const getAdminUsers = async () => {
  const { data, error } = await supabase
    .from("users")
    .select("id, name, email, role")
    .eq("role", "admin");

  if (error) {
    throw new Error(error.message);
  }

  return data || [];
};

const getOrCreateConversationForCustomer = async (customerId) => {
  const { data: existing, error: existingError } = await supabase
    .from("chat_conversations")
    .select(conversationSelect)
    .eq("customer_id", customerId)
    .maybeSingle();

  if (existingError && !isMissingRelationError(existingError.message)) {
    throw new Error(existingError.message);
  }

  if (existing) {
    return existing;
  }

  const admins = await getAdminUsers();
  const assignedAdmin = admins[0] || null;

  const { data: created, error: createError } = await supabase
    .from("chat_conversations")
    .insert({
      customer_id: customerId,
      admin_id: assignedAdmin?.id || null,
      last_message_text: "",
      last_message_at: new Date().toISOString(),
    })
    .select(conversationSelect)
    .single();

  if (createError || !created) {
    throw new Error(createError?.message || "Failed to create conversation");
  }

  return created;
};

const notifyConversationUpdate = (req, payload) => {
  const io = getIo(req);
  if (!io) return;

  io.to("admins").emit("chat:conversation-updated", payload);
  if (payload.customerId) {
    io.to(`user:${payload.customerId}`).emit("chat:conversation-updated", payload);
  }
};

const notifyNewMessage = (req, payload) => {
  const io = getIo(req);
  if (!io) return;

  io.to(`conversation:${payload.conversationId}`).emit("chat:new-message", payload);
  io.to("admins").emit("chat:new-message", payload);
  io.to(`user:${payload.customerId}`).emit("chat:new-message", payload);
};

const mapConversation = (row, unreadByConversationId = new Map()) => ({
  id: row.id,
  customerId: row.customer_id,
  adminId: row.admin_id,
  lastMessageText: row.last_message_text || "",
  lastMessageAt: row.last_message_at || row.updated_at || row.created_at,
  unreadCount: unreadByConversationId.get(row.id) || 0,
  customer: row.customer
    ? {
        id: row.customer.id,
        name: row.customer.name,
        email: row.customer.email,
      }
    : null,
  admin: row.admin
    ? {
        id: row.admin.id,
        name: row.admin.name,
        email: row.admin.email,
      }
    : null,
});

export const getMyConversation = asyncHandler(async (req, res) => {
  let conversation;

  try {
    conversation = await getOrCreateConversationForCustomer(req.user.id);
  } catch (error) {
    if (isMissingRelationError(error.message)) {
      res.status(400);
      throw new Error("Run the latest schema SQL to enable support chat");
    }
    res.status(500);
    throw error;
  }

  const { data: messages, error: messageError } = await supabase
    .from("chat_messages")
    .select(messageSelect)
    .eq("conversation_id", conversation.id)
    .order("created_at", { ascending: true })
    .limit(200);

  if (messageError) {
    if (isMissingRelationError(messageError.message)) {
      res.status(400);
      throw new Error("Run the latest schema SQL to enable support chat");
    }
    res.status(500);
    throw new Error(messageError.message);
  }

  // Mark admin messages as read when customer opens chat.
  await supabase
    .from("chat_messages")
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq("conversation_id", conversation.id)
    .neq("sender_id", req.user.id)
    .eq("is_read", false);

  res.json({
    conversation: mapConversation(conversation),
    messages: (messages || []).map(mapMessage),
  });
});

export const sendMyMessage = asyncHandler(async (req, res) => {
  const text = String(req.body.text || "").trim();
  if (!text) {
    res.status(400);
    throw new Error("Message text is required");
  }

  let conversation;
  try {
    conversation = await getOrCreateConversationForCustomer(req.user.id);
  } catch (error) {
    if (isMissingRelationError(error.message)) {
      res.status(400);
      throw new Error("Run the latest schema SQL to enable support chat");
    }
    res.status(500);
    throw error;
  }

  const receiverId = conversation.admin_id || null;
  const timestamp = new Date().toISOString();

  const { data: message, error: messageError } = await supabase
    .from("chat_messages")
    .insert({
      conversation_id: conversation.id,
      sender_id: req.user.id,
      receiver_id: receiverId,
      message_text: text,
      is_read: false,
    })
    .select(messageSelect)
    .single();

  if (messageError || !message) {
    if (isMissingRelationError(messageError?.message)) {
      res.status(400);
      throw new Error("Run the latest schema SQL to enable support chat");
    }
    res.status(500);
    throw new Error(messageError?.message || "Failed to send message");
  }

  await supabase
    .from("chat_conversations")
    .update({ last_message_text: text, last_message_at: timestamp })
    .eq("id", conversation.id);

  const mappedMessage = mapMessage(message);

  notifyConversationUpdate(req, {
    conversationId: conversation.id,
    customerId: conversation.customer_id,
  });

  notifyNewMessage(req, {
    conversationId: conversation.id,
    customerId: conversation.customer_id,
    message: mappedMessage,
    senderRole: "user",
  });

  res.status(201).json({ message: mappedMessage });
});

export const getAdminConversations = asyncHandler(async (req, res) => {
  const { data: conversations, error } = await supabase
    .from("chat_conversations")
    .select(conversationSelect)
    .order("last_message_at", { ascending: false })
    .limit(300);

  if (error) {
    if (isMissingRelationError(error.message)) {
      res.status(400);
      throw new Error("Run the latest schema SQL to enable support chat");
    }
    res.status(500);
    throw new Error(error.message);
  }

  const adminIds = (await getAdminUsers()).map((entry) => entry.id);

  const { data: unreadRows, error: unreadError } = await supabase
    .from("chat_messages")
    .select("conversation_id, sender_id")
    .eq("is_read", false);

  if (unreadError) {
    res.status(500);
    throw new Error(unreadError.message);
  }

  const unreadByConversationId = new Map();
  for (const row of unreadRows || []) {
    if (adminIds.includes(row.sender_id)) continue;
    unreadByConversationId.set(
      row.conversation_id,
      Number(unreadByConversationId.get(row.conversation_id) || 0) + 1
    );
  }

  res.json((conversations || []).map((row) => mapConversation(row, unreadByConversationId)));
});

export const getAdminConversationMessages = asyncHandler(async (req, res) => {
  const conversationId = req.params.id;

  const { data: conversation, error: conversationError } = await supabase
    .from("chat_conversations")
    .select(conversationSelect)
    .eq("id", conversationId)
    .maybeSingle();

  if (conversationError) {
    if (isMissingRelationError(conversationError.message)) {
      res.status(400);
      throw new Error("Run the latest schema SQL to enable support chat");
    }
    res.status(500);
    throw new Error(conversationError.message);
  }

  if (!conversation) {
    res.status(404);
    throw new Error("Conversation not found");
  }

  const { data: messages, error: messageError } = await supabase
    .from("chat_messages")
    .select(messageSelect)
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(300);

  if (messageError) {
    res.status(500);
    throw new Error(messageError.message);
  }

  res.json({
    conversation: mapConversation(conversation),
    messages: (messages || []).map(mapMessage),
  });
});

export const sendAdminMessage = asyncHandler(async (req, res) => {
  const conversationId = req.params.id;
  const text = String(req.body.text || "").trim();

  if (!text) {
    res.status(400);
    throw new Error("Message text is required");
  }

  const { data: conversation, error: conversationError } = await supabase
    .from("chat_conversations")
    .select(conversationSelect)
    .eq("id", conversationId)
    .maybeSingle();

  if (conversationError) {
    res.status(500);
    throw new Error(conversationError.message);
  }

  if (!conversation) {
    res.status(404);
    throw new Error("Conversation not found");
  }

  const timestamp = new Date().toISOString();

  const { data: message, error: messageError } = await supabase
    .from("chat_messages")
    .insert({
      conversation_id: conversation.id,
      sender_id: req.user.id,
      receiver_id: conversation.customer_id,
      message_text: text,
      is_read: false,
    })
    .select(messageSelect)
    .single();

  if (messageError || !message) {
    res.status(500);
    throw new Error(messageError?.message || "Failed to send message");
  }

  await supabase
    .from("chat_conversations")
    .update({
      admin_id: conversation.admin_id || req.user.id,
      last_message_text: text,
      last_message_at: timestamp,
    })
    .eq("id", conversation.id);

  const mappedMessage = mapMessage(message);

  notifyConversationUpdate(req, {
    conversationId: conversation.id,
    customerId: conversation.customer_id,
  });

  notifyNewMessage(req, {
    conversationId: conversation.id,
    customerId: conversation.customer_id,
    message: mappedMessage,
    senderRole: "admin",
  });

  res.status(201).json({ message: mappedMessage });
});

export const markAdminConversationRead = asyncHandler(async (req, res) => {
  const conversationId = req.params.id;
  const adminIds = (await getAdminUsers()).map((entry) => entry.id);

  const { data: unreadRows, error: unreadError } = await supabase
    .from("chat_messages")
    .select("id, sender_id")
    .eq("conversation_id", conversationId)
    .eq("is_read", false);

  if (unreadError) {
    res.status(500);
    throw new Error(unreadError.message);
  }

  const unreadMessageIds = (unreadRows || [])
    .filter((row) => !adminIds.includes(row.sender_id))
    .map((row) => row.id);

  if (unreadMessageIds.length) {
    const { error } = await supabase
    .from("chat_messages")
    .update({ is_read: true, read_at: new Date().toISOString() })
      .in("id", unreadMessageIds);

    if (error) {
      res.status(500);
      throw new Error(error.message);
    }
  }

  const { data: conversation } = await supabase
    .from("chat_conversations")
    .select("id, customer_id")
    .eq("id", conversationId)
    .maybeSingle();

  notifyConversationUpdate(req, {
    conversationId,
    customerId: conversation?.customer_id,
  });

  const io = getIo(req);
  if (io) {
    io.to("admins").emit("chat:read-updated", { conversationId });
  }

  res.json({ message: "Marked as read" });
});

export const getAdminUnreadCount = asyncHandler(async (req, res) => {
  const adminIds = (await getAdminUsers()).map((entry) => entry.id);

  const { data, error } = await supabase
    .from("chat_messages")
    .select("id, sender_id")
    .eq("is_read", false);

  if (error) {
    if (isMissingRelationError(error.message)) {
      return res.json({ unreadCount: 0 });
    }
    res.status(500);
    throw new Error(error.message);
  }

  const unreadCount = (data || []).filter((row) => !adminIds.includes(row.sender_id)).length;

  res.json({ unreadCount });
});
