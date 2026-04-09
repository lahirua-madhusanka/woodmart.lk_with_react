import apiClient from "./apiClient";

export const registerApi = async (payload) => {
  const { data } = await apiClient.post("/auth/register", payload);
  return data;
};

export const loginApi = async (payload) => {
  const { data } = await apiClient.post("/auth/login", payload);
  return data;
};

export const profileApi = async () => {
  const { data } = await apiClient.get("/auth/profile");
  return data;
};

export const updateProfileApi = async (payload) => {
  const { data } = await apiClient.put("/auth/profile", payload);
  return data;
};

export const changePasswordApi = async (payload) => {
  const { data } = await apiClient.put("/auth/change-password", payload);
  return data;
};

export const logoutApi = async () => {
  const { data } = await apiClient.post("/auth/logout");
  return data;
};

export const forgotPasswordApi = async (payload) => {
  const { data } = await apiClient.post("/auth/forgot-password", payload);
  return data;
};

export const validateResetPasswordTokenApi = async (token) => {
  const { data } = await apiClient.get("/auth/reset-password", {
    params: { token },
  });
  return data;
};

export const resetPasswordApi = async (payload) => {
  const { data } = await apiClient.post("/auth/reset-password", payload);
  return data;
};
