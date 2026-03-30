import apiClient from "./apiClient";

export const getMyConversationApi = async () => {
  const { data } = await apiClient.get("/chat/me");
  return data;
};

export const sendMyMessageApi = async (text) => {
  const { data } = await apiClient.post("/chat/me/messages", { text });
  return data;
};

export const getAdminUnreadCountApi = async () => {
  const { data } = await apiClient.get("/chat/admin/unread-count");
  return data;
};
