import { get } from "./adminApi";

export const getProfitReport = async (params = {}) =>
  (await get("/admin/profit-report", { params })).data;
