import { del, get } from "./adminApi";

export const getReviews = async () =>
  (await get("/admin/reviews")).data;

export const deleteReview = async (id) =>
  (await del(`/products/reviews/${id}`)).data;
