import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import { useStorefrontSettings } from "../context/StorefrontSettingsContext";
import { getApiErrorMessage } from "../services/apiClient";
import { getUserOrdersApi } from "../services/orderService";

const COURIER_TRACKING_URL = "https://www.prontolanka.lk/";

function OrdersPage() {
  const { formatMoney } = useStorefrontSettings();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const handleCopyTracking = async (trackingNumber) => {
    if (!trackingNumber) return;
    try {
      await navigator.clipboard.writeText(trackingNumber);
      toast.success("Tracking number copied");
    } catch (error) {
      toast.error("Unable to copy tracking number");
    }
  };

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
              <div className="mt-3 text-sm text-muted">
                Tracking: {order.trackingNumber || "Not assigned yet"}
              </div>
              <div className="mt-4 flex flex-wrap gap-3">
                <Link to={`/order-confirmation/${order._id}`} className="inline-flex text-sm font-semibold text-brand">
                  View details
                </Link>
                {order.trackingNumber ? (
                  <>
                    <button
                      type="button"
                      onClick={() => handleCopyTracking(order.trackingNumber)}
                      className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-ink"
                    >
                      Copy Tracking
                    </button>
                    <button
                      type="button"
                      onClick={() => window.open(COURIER_TRACKING_URL, "_blank", "noopener,noreferrer")}
                      className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-ink"
                    >
                      Track Order
                    </button>
                  </>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export default OrdersPage;
