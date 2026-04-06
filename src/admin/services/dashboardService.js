import { get, safeRequest } from "./adminApi";

export const getDashboardStats = async () => {
  return safeRequest(() => get("/admin/stats"), {
    totals: {
      products: 0,
      orders: 0,
      users: 0,
      revenue: 0,
    },
    monthlyRevenue: [],
    recentOrders: [],
    lowStockProducts: [],
  });
};
