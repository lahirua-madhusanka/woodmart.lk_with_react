import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import { useStorefrontSettings } from "../context/StorefrontSettingsContext";
import { getApiErrorMessage } from "../services/apiClient";
import { getUserOrdersApi } from "../services/orderService";

function OrdersPage() {
  const { formatMoney } = useStorefrontSettings();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadOrders = async () => {
      try {
        const data = await getUserOrdersApi();
        setOrders(data);
      } catch (error) {
        toast.error(getApiErrorMessage(error));
      } finally {
        setLoading(false);
      }
    };

    loadOrders();
  }, []);

  return (
    <section className="container-pad py-10">
      <h1 className="font-display text-3xl font-bold">My Orders</h1>

      {loading ? (
        <div className="mt-6 rounded-xl bg-white p-10 text-center text-muted">Loading orders...</div>
      ) : orders.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <p className="text-muted">No orders yet.</p>
          <Link to="/shop" className="btn-primary mt-4">Start shopping</Link>
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {orders.map((order) => (
            <article key={order._id} className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-brand">Order</p>
                  <h2 className="font-semibold">#{order._id.slice(-8).toUpperCase()}</h2>
                </div>
                <div className="text-sm">
                  <span className="rounded-full bg-brand-light px-3 py-1 font-semibold text-brand-dark">{order.orderStatus}</span>
                </div>
              </div>
              <div className="mt-3 grid gap-2 text-sm text-muted sm:grid-cols-3">
                <p>Total: {formatMoney(order.totalAmount)}</p>
                <p>Payment: {order.paymentStatus}</p>
                <p>Items: {order.items.length}</p>
              </div>
              <Link to={`/order-confirmation/${order._id}`} className="mt-4 inline-flex text-sm font-semibold text-brand">
                View details
              </Link>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export default OrdersPage;
