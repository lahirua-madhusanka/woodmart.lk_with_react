import { get } from "./adminApi";

export const getDashboardStats = async () => {
  return (await get("/admin/stats")).data;
};
