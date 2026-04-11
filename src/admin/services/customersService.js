import { del, get, patch } from "./adminApi";

export const getCustomers = async (params = {}) =>
  (await get("/admin/users", { params })).data;

export const updateCustomerRole = async (id, newRole, adminPassword) => {
  const response = await patch(`/admin/users/${id}/role`, { newRole, adminPassword });
  return response.data;
};

export const deleteCustomer = async (id) =>
  (await del(`/admin/users/${id}`)).data;
