import { del, get, patch, safeRequest } from "./adminApi";

export const getCustomers = async (params = {}) =>
  safeRequest(() => get("/admin/users", { params }), []);

export const updateCustomerRole = async (id, newRole, adminPassword) => {
  const response = await patch(`/admin/users/${id}/role`, { newRole, adminPassword });
  return response.data;
};

export const deleteCustomer = async (id) =>
  safeRequest(() => del(`/admin/users/${id}`), { message: "Deleted" });
