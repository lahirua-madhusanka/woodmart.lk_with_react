import apiClient from "../apiClient";

export const getAdminUsersApi = async (params = {}) => {
  const { data } = await apiClient.get("/admin/users", { params });
  return data;
};

export const updateAdminUserRoleApi = async (id, newRole, adminPassword) => {
  const { data } = await apiClient.patch(`/admin/users/${id}/role`, { newRole, adminPassword });
  return data;
};

export const deleteAdminUserApi = async (id) => {
  const { data } = await apiClient.delete(`/admin/users/${id}`);
  return data;
};
