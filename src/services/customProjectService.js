import apiClient from "./apiClient";

export const createCustomProjectRequestApi = async (payload) => {
  const { data } = await apiClient.post("/custom-projects", payload);
  return data;
};

export const getMyCustomProjectRequestsApi = async () => {
  const { data } = await apiClient.get("/custom-projects/my");
  return data;
};

export const acceptCustomProjectQuoteApi = async (requestId) => {
  const { data } = await apiClient.post(`/custom-projects/${requestId}/accept`);
  return data;
};

export const declineCustomProjectQuoteApi = async (requestId) => {
  const { data } = await apiClient.post(`/custom-projects/${requestId}/decline`);
  return data;
};

export const deleteCustomProjectRequestApi = async (requestId) => {
  const { data } = await apiClient.delete(`/custom-projects/${requestId}`);
  return data;
};
