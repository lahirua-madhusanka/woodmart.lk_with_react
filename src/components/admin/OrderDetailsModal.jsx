import StatusBadge from "./StatusBadge";

function OrderDetailsModal({ open, order, onClose }) {
  if (!open || !order) return null;

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-slate-900/50 p-4">
      <div className="w-full max-w-3xl rounded-xl bg-white p-6 shadow-premium">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-ink">Order Details</h3>
            <p className="text-xs text-muted">#{order._id}</p>
          </div>
          <button onClick={onClose} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm">Close</button>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="rounded-lg bg-slate-50 p-4 text-sm">
            <p className="font-semibold text-ink">Customer</p>
            <p className="mt-1 text-muted">{order.userId?.name || "Unknown"}</p>
            <p className="text-muted">{order.userId?.email || "N/A"}</p>
            <p className="mt-2 text-muted">Total: Rs. {Number(order.totalAmount || 0).toFixed(2)}</p>
            <div className="mt-2 flex items-center gap-2">
              <StatusBadge value={order.paymentStatus} />
              <StatusBadge value={order.orderStatus} />
            </div>
          </div>

          <div className="rounded-lg bg-slate-50 p-4 text-sm">
            <p className="font-semibold text-ink">Shipping Address</p>
            <p className="mt-1 text-muted">{order.shippingAddress?.fullName}</p>
            <p className="text-muted">{order.shippingAddress?.line1}</p>
            {order.shippingAddress?.line2 ? <p className="text-muted">{order.shippingAddress?.line2}</p> : null}
            <p className="text-muted">
              {order.shippingAddress?.city}, {order.shippingAddress?.postalCode}
            </p>
            <p className="text-muted">{order.shippingAddress?.country}</p>
            <p className="text-muted">{order.shippingAddress?.phone}</p>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-muted">
              <tr>
                <th className="px-3 py-2">Item</th>
                <th className="px-3 py-2">Qty</th>
                <th className="px-3 py-2">Price</th>
                <th className="px-3 py-2">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {(order.items || []).map((item) => (
                <tr key={`${item.productId}-${item.variationId || "base"}`} className="border-t border-slate-100">
                  <td className="px-3 py-2">
                    <p className="font-semibold text-ink">{item.name}</p>
                    {item.variationName ? (
                      <p className="text-xs text-muted">Variation: {item.variationName}</p>
                    ) : null}
                    {item.variationSku ? (
                      <p className="text-xs text-muted">SKU: {item.variationSku}</p>
                    ) : null}
                  </td>
                  <td className="px-3 py-2">{item.quantity}</td>
                  <td className="px-3 py-2">Rs. {Number(item.price).toFixed(2)}</td>
                  <td className="px-3 py-2">Rs. {Number(item.price * item.quantity).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default OrderDetailsModal;
