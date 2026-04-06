import { del, get, post, put } from "./adminApi";

export const getCoupons = async () => {
  const response = await get("/admin/coupons");
  return response?.data || [];
};

export const createCoupon = async (payload) => {
  const response = await post("/admin/coupons", payload);
  return response?.data || null;
};

export const updateCoupon = async (id, payload) => {
  const response = await put(`/admin/coupons/${id}`, payload);
  return response?.data || null;
};

export const deleteCoupon = async (id) => {
  const response = await del(`/admin/coupons/${id}`);
  return response?.data || { message: "Coupon deleted" };
};
