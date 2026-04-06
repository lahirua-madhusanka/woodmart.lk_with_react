import { del, get, post, put } from "./adminApi";

export const getBanners = async () => {
  const response = await get("/admin/banners");
  return response?.data || [];
};

export const createBanner = async (payload) => {
  const response = await post("/admin/banners", payload);
  return response?.data || null;
};

export const updateBanner = async (id, payload) => {
  const response = await put(`/admin/banners/${id}`, payload);
  return response?.data || null;
};

export const deleteBanner = async (id) => {
  const response = await del(`/admin/banners/${id}`);
  return response?.data || { message: "Banner deleted" };
};

export const uploadBannerImage = async (file) => {
  const formData = new FormData();
  formData.append("image", file);
  const response = await post("/admin/banners/upload-image", formData);
  return response?.data || null;
};
