import { get, post, put } from "./adminApi";

export const getAdminConversations = async () => {
  const response = await get("/chat/admin/conversations");
  return response?.data || [];
};

export const getAdminConversationMessages = async (conversationId) => {
  const response = await get(`/chat/admin/conversations/${conversationId}/messages`);
  return response?.data || { conversation: null, messages: [] };
};

export const sendAdminMessage = async (conversationId, text) => {
  const response = await post(`/chat/admin/conversations/${conversationId}/messages`, {
    text,
  });
  return response?.data;
};

export const markAdminConversationRead = async (conversationId) => {
  const response = await put(`/chat/admin/conversations/${conversationId}/read`, {});
  return response?.data;
};
