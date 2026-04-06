import { Box, CalendarDays, DollarSign, LineChart, PackageCheck, ReceiptText, Truck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import DataTable from "../components/DataTable";
import EmptyState from "../components/EmptyState";
import Loader from "../components/Loader";
import SummaryCard from "../components/SummaryCard";
import { getProfitReport } from "../services/profitService";

const periodOptions = [
  { value: "today", label: "Today" },
  { value: "week", label: "This week" },
  { value: "month", label: "This month" },
  { value: "year", label: "This year" },
  { value: "custom", label: "Custom range" },
];

const money = (value) => `Rs. ${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function ProfitReportPage() {
  const [period, setPeriod] = useState("month");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState(null);

  useEffect(() => {
    const load = async () => {
      if (period === "custom" && (!startDate || !endDate)) {
        return;
      }

      setLoading(true);
      const params = { period };
      if (period === "custom") {
        params.startDate = startDate;
        params.endDate = endDate;
      }
      const data = await getProfitReport(params);
      setReport(data);
      setLoading(false);
    };

    load();
  }, [period, startDate, endDate]);

  const summary = report?.summary || {};

  const trend = useMemo(() => report?.trend || [], [report?.trend]);
  const trendMax = useMemo(() => Math.max(1, ...trend.map((item) => Number(item.profit || 0))), [trend]);
  const orderTrend = useMemo(() => report?.orderTrend || [], [report?.orderTrend]);
  const orderTrendMax = useMemo(
    () => Math.max(1, ...orderTrend.map((item) => Number(item.orders || 0))),
    [orderTrend]
  );

  if (loading && !report) {
    return <Loader label="Loading profit report..." />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink">Profit Analytics</h1>
          <p className="text-sm text-muted">Track sales, costs, discounts, shipping and profit with period filters.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={period}
            onChange={(event) => setPeriod(event.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          >
            {periodOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>

          {period === "custom" ? (
            <>
              <input
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              />
              <input
                type="date"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              />
            </>
          ) : null}
        </div>
      </div>

      {loading ? <Loader label="Refreshing report..." /> : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard title="Total Sales" value={money(summary.totalSales)} icon={DollarSign} />
        <SummaryCard title="Total Profit" value={money(summary.totalProfit)} helper="After cost, shipping, discounts" icon={LineChart} />
        <SummaryCard title="Shipping Collected" value={money(summary.totalShippingCollected)} icon={Truck} />
        <SummaryCard title="Discount Given" value={money(summary.totalDiscountGiven)} icon={ReceiptText} />
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <SummaryCard title="Product Cost" value={money(summary.totalProductCost)} icon={PackageCheck} />
        <SummaryCard title="Orders" value={Number(summary.numberOfOrders || 0).toLocaleString()} icon={CalendarDays} />
        <SummaryCard title="Products Sold" value={Number(summary.numberOfProductsSold || 0).toLocaleString()} icon={Box} />
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-ink">Profit Trend</h2>
        {!trend.length ? (
          <div className="mt-4">
            <EmptyState title="No trend data" description="Place orders in the selected period to see profit trend." />
          </div>
        ) : (
          <div className="mt-4 flex h-56 items-end gap-2">
            {trend.map((entry) => {
              const amount = Number(entry.profit || 0);
              const height = Math.max(10, Math.round((amount / trendMax) * 100));
              return (
                <div key={entry.date} className="flex h-full flex-1 flex-col justify-end items-center gap-2">
                  <span className="text-[10px] font-semibold text-muted">{money(amount)}</span>
                  <div className="w-full rounded-t-md bg-brand/80" style={{ height: `${height}%` }} />
                  <span className="text-[10px] text-muted">{entry.date.slice(5)}</span>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-ink">Order Trend</h2>
        {!orderTrend.length ? (
          <div className="mt-4">
            <EmptyState title="No order trend data" description="Place orders in the selected period to see order trend." />
          </div>
        ) : (
          <div className="mt-4 flex h-56 items-end gap-2">
            {orderTrend.map((entry) => {
              const count = Number(entry.orders || 0);
              const height = Math.max(10, Math.round((count / orderTrendMax) * 100));
              return (
                <div key={entry.date} className="flex h-full flex-1 flex-col justify-end items-center gap-2">
                  <span className="text-[10px] font-semibold text-muted">{count}</span>
                  <div className="w-full rounded-t-md bg-emerald-500/80" style={{ height: `${height}%` }} />
                  <span className="text-[10px] text-muted">{entry.date.slice(5)}</span>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-ink">Sold Products</h2>
        <DataTable
          rowKey="rowId"
          rows={(report?.soldProducts || []).map((item, index) => ({
            ...item,
            rowId: `${item.productId || item.name || "row"}-${index}`,
          }))}
          columns={[
            { key: "name", title: "Product" },
            { key: "quantitySold", title: "Qty Sold" },
            { key: "sales", title: "Sales", render: (row) => money(row.sales) },
            { key: "shipping", title: "Shipping", render: (row) => money(row.shipping) },
            { key: "discount", title: "Discount", render: (row) => money(row.discount) },
            { key: "productCost", title: "Cost", render: (row) => money(row.productCost) },
            { key: "profit", title: "Profit", render: (row) => money(row.profit) },
          ]}
          emptyFallback={<EmptyState title="No sold products" description="No product sales in selected range." />}
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-ink">Orders</h2>
        <DataTable
          rowKey="_id"
          rows={report?.orders || []}
          columns={[
            { key: "order", title: "Order", render: (row) => `#${String(row._id || "").slice(-8).toUpperCase()}` },
            { key: "date", title: "Date", render: (row) => new Date(row.createdAt).toLocaleDateString() },
            { key: "customer", title: "Customer", render: (row) => row.userId?.name || row.userId?.email || "Customer" },
            { key: "subtotal", title: "Subtotal", render: (row) => money(row.subtotalAmount) },
            { key: "shipping", title: "Shipping", render: (row) => money(row.shippingTotal) },
            { key: "discount", title: "Discount", render: (row) => money(row.discountTotal) },
            { key: "cost", title: "Cost", render: (row) => money(row.productCostTotal) },
            { key: "profit", title: "Profit", render: (row) => money(row.profitTotal) },
            { key: "total", title: "Total", render: (row) => money(row.totalAmount) },
          ]}
          emptyFallback={<EmptyState title="No orders" description="No orders found for selected range." />}
        />
      </section>
    </div>
  );
}

export default ProfitReportPage;
