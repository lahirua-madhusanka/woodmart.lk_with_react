import { del, get, post, put } from "./adminApi";

export const getProducts = async (params = {}) =>
  (await get("/products", { params })).data;

export const getProductById = async (id) =>
  (await get(`/products/${id}`)).data;

export const createProduct = async (payload) =>
  (await post("/products", payload)).data;

export const updateProduct = async (id, payload) =>
  (await put(`/products/${id}`, payload)).data;

export const uploadProductImages = async (files) => {
  const formData = new FormData();
  files.forEach((file) => formData.append("images", file));
  const response = await post("/products/upload-images", formData);
  return response?.data?.images || [];
};

export const deleteProduct = async (id) =>
  (await del(`/products/${id}`)).data;

export const getCategories = async () =>
  (await get("/admin/categories")).data;
