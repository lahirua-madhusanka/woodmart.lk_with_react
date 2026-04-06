import { get, safeRequest } from "./adminApi";

export const getProfitReport = async (params = {}) =>
  safeRequest(
    () => get("/admin/profit-report", { params }),
    {
      period: params.period || "month",
      range: { from: "", to: "" },
      summary: {
        totalSales: 0,
        totalShippingCollected: 0,
        totalDiscountGiven: 0,
        totalProductCost: 0,
        totalProfit: 0,
        numberOfOrders: 0,
        numberOfProductsSold: 0,
      },
      orders: [],
      soldProducts: [],
      trend: [],
      orderTrend: [],
    }
  );
