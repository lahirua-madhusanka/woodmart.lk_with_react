import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import DataTable from "../components/DataTable";
import EmptyState from "../components/EmptyState";
import FilterDropdown from "../components/FilterDropdown";
import Loader from "../components/Loader";
import OrderDetailsModal from "../components/OrderDetailsModal";
import SearchBar from "../components/SearchBar";
import StatusBadge from "../components/StatusBadge";
import { getApiErrorMessage } from "../../services/apiClient";
import { getOrderById, getOrders, updateOrderDetails } from "../services/ordersService";

const ORDER_STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "pending", label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "processing", label: "Processing" },
  { value: "packed", label: "Packed" },
  { value: "shipped", label: "Shipped" },
  { value: "out_for_delivery", label: "Out for delivery" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
  { value: "returned", label: "Returned" },
];

const PAYMENT_STATUS_OPTIONS = [
  { value: "all", label: "All payments" },
  { value: "pending", label: "Pending" },
  { value: "paid", label: "Paid" },
  { value: "failed", label: "Failed" },
];

function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [paymentStatus, setPaymentStatus] = useState("all");
  const [orderStatus, setOrderStatus] = useState("all");
  const [query, setQuery] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [loadingSelectedOrder, setLoadingSelectedOrder] = useState(false);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const data = await getOrders({
        paymentStatus: paymentStatus === "all" ? undefined : paymentStatus,
        orderStatus: orderStatus === "all" ? undefined : orderStatus,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
      });
      setOrders(data || []);
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, [paymentStatus, orderStatus, fromDate, toDate]);

  const filtered = useMemo(() => {
    const lowered = query.toLowerCase().trim();
    if (!lowered) return orders;

    return orders.filter((item) => {
      const idMatch = item._id?.toLowerCase().includes(lowered);
      const nameMatch = (item.user?.name || item.userId?.name || item.customerName || "")
        .toLowerCase()
        .includes(lowered);
      const emailMatch = (item.user?.email || item.userId?.email || item.email || "")
        .toLowerCase()
        .includes(lowered);
      return idMatch || nameMatch || emailMatch;
    });
  }, [orders, query]);

  const handleStatusChange = async (id, value) => {
    const targetOrder = orders.find((item) => item._id === id);
    const trackingNumber = String(targetOrder?.trackingNumber || "").trim();

    if (value === "shipped" && !trackingNumber) {
      toast.error("Tracking number is required before marking an order as shipped.");
      return;
    }

    try {
      await updateOrderDetails(id, { orderStatus: value, statusNote: `Status changed to ${value}` });
      await loadOrders();
      if (selectedOrder?._id === id) {
        const refreshed = await getOrderById(id);
        setSelectedOrder(refreshed);
      }
      toast.success("Order status updated");
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    }
  };

  const openOrderDetails = async (orderId) => {
    setLoadingSelectedOrder(true);
    try {
      const details = await getOrderById(orderId);
      setSelectedOrder(details);
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setLoadingSelectedOrder(false);
    }
  };

  const handleOrderUpdated = (updatedOrder) => {
    if (!updatedOrder) return;
    setSelectedOrder(updatedOrder);
    loadOrders();
  };

  if (loading) {
    return <Loader label="Loading orders..." />;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <SearchBar value={query} onChange={setQuery} placeholder="Search by order or customer" />
        <FilterDropdown
          value={paymentStatus}
          onChange={setPaymentStatus}
          label="Payment"
          options={PAYMENT_STATUS_OPTIONS}
        />
        <FilterDropdown
          value={orderStatus}
          onChange={setOrderStatus}
          label="Order"
          options={ORDER_STATUS_OPTIONS}
        />
        <input
          type="date"
          value={fromDate}
          onChange={(event) => setFromDate(event.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <input
          type="date"
          value={toDate}
          onChange={(event) => setToDate(event.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
      </div>

      <DataTable
        rowKey="_id"
        rows={filtered}
        columns={[
          {
            key: "id",
            title: "Order",
            render: (row) => `#${String(row._id || "").slice(-8).toUpperCase()}`,
          },
          {
            key: "customer",
            title: "Customer",
            render: (row) => row.user?.name || row.userId?.name || row.customerName || "Guest",
          },
          {
            key: "createdAt",
            title: "Date",
            render: (row) => new Date(row.createdAt).toLocaleDateString(),
          },
          {
            key: "total",
            title: "Total",
            render: (row) => `Rs. ${Number(row.totalPrice || row.totalAmount || 0).toFixed(2)}`,
          },
          {
            key: "paymentMethod",
            title: "Payment Method",
            render: (row) => row.paymentMethod || "N/A",
          },
          {
            key: "payment",
            title: "Payment",
            render: (row) => <StatusBadge value={row.paymentStatus || "pending"} />,
          },
          {
            key: "status",
            title: "Status",
            render: (row) => <StatusBadge value={row.orderStatus || "pending"} />,
          },
          {
            key: "tracking",
            title: "Tracking",
            render: (row) => row.trackingNumber || "-",
          },
          {
            key: "actions",
            title: "Actions",
            render: (row) => (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => openOrderDetails(row._id)}
                  className="rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold"
                >
                  View
                </button>
                <select
                  value={row.orderStatus || "pending"}
                  onChange={(event) => handleStatusChange(row._id, event.target.value)}
                  className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs"
                >
                  <option value="pending">Pending</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="processing">Processing</option>
                  <option value="packed">Packed</option>
                  <option value="shipped" disabled={!String(row.trackingNumber || "").trim()}>
                    Shipped{!String(row.trackingNumber || "").trim() ? " (requires tracking)" : ""}
                  </option>
                  <option value="out_for_delivery">Out for delivery</option>
                  <option value="delivered">Delivered</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="returned">Returned</option>
                </select>
              </div>
            ),
          },
        ]}
        emptyFallback={<EmptyState title="No orders found" />}
      />

      <OrderDetailsModal
        open={Boolean(selectedOrder)}
        order={selectedOrder}
        loading={loadingSelectedOrder}
        onOrderUpdated={handleOrderUpdated}
        onClose={() => setSelectedOrder(null)}
      />
    </div>
  );
}

export default OrdersPage;
