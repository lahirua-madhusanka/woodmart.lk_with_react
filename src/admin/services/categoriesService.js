import { del, get, post } from "./adminApi";

export const getCategories = async () =>
  (await get("/admin/categories")).data;

export const createCategory = async (payload) =>
  (await post("/admin/categories", payload)).data;

export const deleteCategory = async (id) =>
  (await del(`/admin/categories/${id}`)).data;
