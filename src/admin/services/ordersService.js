import { get, put } from "./adminApi";

export const getOrders = async (params = {}) =>
  (await get("/admin/orders", { params })).data;

export const getOrderById = async (id) =>
  (await get(`/admin/orders/${id}`)).data;

export const updateOrderStatus = async (id, payload) =>
  (await put(`/admin/orders/${id}/status`, payload)).data;

export const updateOrderDetails = async (id, payload) =>
  (await put(`/admin/orders/${id}/status`, payload)).data;
