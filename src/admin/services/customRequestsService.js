import { get, put, del } from "./adminApi";

export const getAdminCustomRequests = async ({ status, q } = {}) => {
  const response = await get("/custom-projects/admin", {
    params: {
      ...(status && status !== "all" ? { status } : {}),
      ...(q ? { q } : {}),
    },
  });
  return response?.data || [];
};

export const getAdminCustomRequestById = async (id) => {
  const response = await get(`/custom-projects/admin/${id}`);
  return response?.data || null;
};

export const updateAdminCustomRequest = async (id, payload) => {
  const response = await put(`/custom-projects/admin/${id}`, payload);
  return response?.data || null;
};

export const sendAdminCustomRequestPurchaseLink = async (id, payload) => {
  const response = await put(`/custom-projects/admin/${id}/purchase-link`, payload);
  return response?.data || null;
};

export const deleteAdminCustomRequestApi = async (id) => {
  const response = await del(`/custom-projects/admin/${id}`);
  return response?.data || null;
};
