import EmptyState from "./EmptyState";

const COURIER_TRACKING_URL = "https://www.prontolanka.lk/";

function OrdersTable({ orders = [], loading, onViewDetails }) {
  const handleCopyTracking = async (trackingNumber) => {
    if (!trackingNumber) return;
    try {
      await navigator.clipboard.writeText(trackingNumber);
    } catch (error) {
      // Ignore clipboard failures in table action context.
    }
  };

  if (loading) {
    return <div className="text-sm text-muted">Loading orders...</div>;
  }

  if (!orders.length) {
    return (
      <EmptyState
        title="No orders yet"
        message="Once you place an order, it will appear here."
      />
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-left text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-muted">
            <th className="py-3 pr-4">Order #</th>
            <th className="py-3 pr-4">Date</th>
            <th className="py-3 pr-4">Status</th>
            <th className="py-3 pr-4">Tracking</th>
            <th className="py-3 pr-4">Total</th>
            <th className="py-3">Action</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr key={order._id || order.id} className="border-b border-slate-100">
              <td className="py-3 pr-4 font-semibold text-ink">#{(order._id || order.id || "").slice(0, 8)}</td>
              <td className="py-3 pr-4 text-muted">{new Date(order.createdAt || Date.now()).toLocaleDateString()}</td>
              <td className="py-3 pr-4">
                <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold capitalize text-slate-700">
                  {order.orderStatus || "created"}
                </span>
              </td>
              <td className="py-3 pr-4 text-xs text-muted">
                {order.trackingNumber ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-ink">{order.trackingNumber}</span>
                    <button
                      type="button"
                      onClick={() => handleCopyTracking(order.trackingNumber)}
                      className="rounded border border-slate-300 px-2 py-0.5 text-[11px] font-semibold text-ink"
                    >
                      Copy
                    </button>
                    <button
                      type="button"
                      onClick={() => window.open(COURIER_TRACKING_URL, "_blank", "noopener,noreferrer")}
                      className="rounded border border-slate-300 px-2 py-0.5 text-[11px] font-semibold text-ink"
                    >
                      Track
                    </button>
                  </div>
                ) : (
                  "-"
                )}
              </td>
              <td className="py-3 pr-4 font-semibold text-ink">Rs. {Number(order.totalAmount || 0).toFixed(2)}</td>
              <td className="py-3">
                <button
                  type="button"
                  onClick={() => onViewDetails(order)}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-ink hover:border-brand hover:text-brand"
                >
                  View Details
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default OrdersTable;
