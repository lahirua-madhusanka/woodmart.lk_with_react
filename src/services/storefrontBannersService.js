import apiClient from "./apiClient";

export const getStorefrontBannersBySectionApi = async (section) => {
  const params = section ? { section } : {};
  const { data } = await apiClient.get("/store/banners", { params });
  return Array.isArray(data) ? data : [];
};
