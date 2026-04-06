import apiClient from "./apiClient";
import adminApiClient from "../admin/services/adminApiClient";

export const getMyConversationApi = async () => {
  const { data } = await apiClient.get("/chat/me");
  return data;
};

export const sendMyMessageApi = async (text) => {
  const { data } = await apiClient.post("/chat/me/messages", { text });
  return data;
};

export const getAdminUnreadCountApi = async () => {
  const { data } = await adminApiClient.get("/chat/admin/unread-count");
  return data;
};
