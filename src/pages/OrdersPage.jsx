import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import { useStorefrontSettings } from "../context/StorefrontSettingsContext";
import { getApiErrorMessage } from "../services/apiClient";
import { getUserOrdersApi } from "../services/orderService";

const COURIER_TRACKING_URL = "https://www.prontolanka.lk/";
const ORDER_ITEM_PLACEHOLDER =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><rect width="64" height="64" fill="#f1f5f9"/><rect x="12" y="14" width="40" height="28" rx="4" fill="#cbd5e1"/><circle cx="24" cy="24" r="4" fill="#94a3b8"/><path d="M16 40l9-9 8 8 6-6 9 9H16z" fill="#e2e8f0"/><rect x="16" y="47" width="32" height="5" rx="2.5" fill="#cbd5e1"/></svg>'
  );

const resolveOrderItemImage = (image) => {
  const value = String(image || "").trim();
  return value || ORDER_ITEM_PLACEHOLDER;
};

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
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="font-display text-3xl font-bold">My Orders</h1>
        <div className="flex flex-wrap gap-2">
          <Link to="/account?tab=orders" className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-ink hover:border-brand hover:text-brand">
            Back to Account
          </Link>
          <Link to="/shop" className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-ink hover:border-brand hover:text-brand">
            Continue Shopping
          </Link>
        </div>
      </div>

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

              {Array.isArray(order.items) && order.items.length ? (
                <div className="mt-3 flex flex-wrap items-center gap-3 rounded-lg bg-slate-50 p-3">
                  <div className="flex items-center -space-x-2">
                    {order.items.slice(0, 3).map((item, index) => (
                      <img
                        key={`${order._id}-item-${index}`}
                        src={resolveOrderItemImage(item.image)}
                        alt={item.name || "Ordered product"}
                        loading="lazy"
                        onError={(event) => {
                          event.currentTarget.src = ORDER_ITEM_PLACEHOLDER;
                        }}
                        className="h-10 w-10 rounded-md border border-white object-cover"
                      />
                    ))}
                  </div>

                  <div className="min-w-0 text-xs text-muted">
                    <p className="truncate text-sm font-semibold text-ink">
                      {order.items[0]?.name || "Ordered product"}
                    </p>
                    {order.items.length > 1 ? (
                      <p>+{order.items.length - 1} more item{order.items.length - 1 > 1 ? "s" : ""}</p>
                    ) : (
                      <p>1 item in this order</p>
                    )}
                  </div>
                </div>
              ) : null}

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
                {String(order.orderStatus || "").toLowerCase() === "delivered" ? (
                  <Link
                    to={`/review?orderId=${encodeURIComponent(order._id)}`}
                    className="rounded-lg border border-brand px-3 py-1.5 text-xs font-semibold text-brand"
                  >
                    Review
                  </Link>
                ) : null}
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
