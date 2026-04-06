import { get, put, safeRequest } from "./adminApi";

export const getOrders = async (params = {}) =>
  safeRequest(() => get("/admin/orders", { params }), []);

export const getOrderById = async (id) =>
  safeRequest(() => get(`/admin/orders/${id}`), null);

export const updateOrderStatus = async (id, payload) =>
  safeRequest(() => put(`/admin/orders/${id}/status`, payload), null);

export const updateOrderDetails = async (id, payload) =>
  safeRequest(() => put(`/admin/orders/${id}/status`, payload), null);
