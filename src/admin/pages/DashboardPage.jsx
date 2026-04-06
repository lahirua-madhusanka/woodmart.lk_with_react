import { DollarSign, Package, ShoppingCart, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import ChartCard from "../components/ChartCard";
import DataTable from "../components/DataTable";
import EmptyState from "../components/EmptyState";
import Loader from "../components/Loader";
import StatusBadge from "../components/StatusBadge";
import SummaryCard from "../components/SummaryCard";
import { getDashboardStats } from "../services/dashboardService";

function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const data = await getDashboardStats();
      setStats(data);
      setLoading(false);
    };

    load();
  }, []);

  const totals = stats?.totals || {};
  const revenueChart = useMemo(() => stats?.monthlyRevenue || [], [stats]);
  const maxRevenue = useMemo(
    () => Math.max(...revenueChart.map((entry) => Number(entry.revenue || 0)), 1),
    [revenueChart]
  );

  if (loading) {
    return <Loader label="Loading dashboard..." />;
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard title="Total Products" value={totals.products || 0} icon={Package} />
        <SummaryCard title="Total Orders" value={totals.orders || 0} icon={ShoppingCart} />
        <SummaryCard title="Total Users" value={totals.users || 0} icon={Users} />
        <SummaryCard
          title="Revenue"
          value={`Rs. ${Number(totals.revenue || 0).toLocaleString()}`}
          icon={DollarSign}
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <ChartCard title="Monthly Revenue">
          {!revenueChart.length ? (
            <EmptyState title="No revenue data" description="Revenue trend will appear once orders are recorded." />
          ) : (
            <div className="flex h-56 items-end gap-2">
              {revenueChart.map((item) => {
                const amount = Number(item.revenue || 0);
                const height = Math.max(12, Math.round((amount / maxRevenue) * 100));
                return (
                  <div key={item.month} className="flex h-full flex-1 flex-col justify-end items-center gap-2">
                    <span className="text-[10px] font-semibold text-muted">Rs. {amount.toLocaleString()}</span>
                    <div className="w-full rounded-t-md bg-brand/80" style={{ height: `${height}%` }} />
                    <span className="text-xs text-muted">{item.month}</span>
                  </div>
                );
              })}
            </div>
          )}
        </ChartCard>

        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-ink">Low Stock Products</h2>
          <DataTable
            rowKey="_id"
            rows={stats?.lowStockProducts || []}
            columns={[
              { key: "name", title: "Product" },
              { key: "category", title: "Category" },
              {
                key: "stock",
                title: "Stock",
                render: (row) => <StatusBadge value={row.stock <= 10 ? "low" : "active"} />,
              },
              {
                key: "qty",
                title: "Qty",
                render: (row) => row.stock ?? row.countInStock ?? 0,
              },
            ]}
            emptyFallback={<EmptyState title="No low stock products" />}
          />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-ink">Recent Orders</h2>
        <DataTable
          rowKey="_id"
          rows={stats?.recentOrders || []}
          columns={[
            {
              key: "order",
              title: "Order",
              render: (row) => `#${String(row._id || "").slice(-8).toUpperCase()}`,
            },
            {
              key: "customer",
              title: "Customer",
              render: (row) => row.user?.name || row.userId?.name || "Guest",
            },
            {
              key: "total",
              title: "Total",
              render: (row) => `Rs. ${Number(row.totalPrice || row.totalAmount || 0).toFixed(2)}`,
            },
            {
              key: "status",
              title: "Status",
              render: (row) => <StatusBadge value={row.orderStatus || "created"} />,
            },
          ]}
          emptyFallback={<EmptyState title="No recent orders" />}
        />
      </section>
    </div>
  );
}

export default DashboardPage;
