import apiClient from "./apiClient";

export const createPaymentIntentApi = async (payload) => {
  const { data } = await apiClient.post("/orders/create-payment-intent", payload);
  return data;
};

export const createOrderApi = async (payload) => {
  const { data } = await apiClient.post("/orders/create", payload);
  return data;
};

export const applyCouponApi = async (code) => {
  const { data } = await apiClient.post("/coupons/apply", { code });
  return data;
};

export const getUserOrdersApi = async () => {
  const { data } = await apiClient.get("/orders/user");
  return data;
};

export const getOrderByIdApi = async (id) => {
  const { data } = await apiClient.get(`/orders/${id}`);
  return data;
};

export const getCheckoutProfileApi = async () => {
  const { data } = await apiClient.get("/orders/checkout-profile");
  return data;
};

export const saveCheckoutAddressApi = async (payload) => {
  const { data } = await apiClient.post("/orders/address-book", payload);
  return data;
};

export const deleteCheckoutAddressApi = async (id) => {
  const { data } = await apiClient.delete(`/orders/address-book/${id}`);
  return data;
};
