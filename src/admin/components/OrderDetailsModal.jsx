import { useMemo, useState } from "react";
import { toast } from "react-toastify";
import { getApiErrorMessage } from "../../services/apiClient";
import { updateOrderDetails } from "../services/ordersService";
import StatusBadge from "./StatusBadge";

const ORDER_STATUS_OPTIONS = [
  "pending",
  "confirmed",
  "processing",
  "packed",
  "shipped",
  "out_for_delivery",
  "delivered",
  "cancelled",
  "returned",
];

const PAYMENT_STATUS_OPTIONS = ["pending", "paid", "failed"];

const formatMoney = (value) => `Rs. ${Number(value || 0).toFixed(2)}`;

const formatDateTime = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString();
};

const printHtml = (title, htmlBody) => {
  const printWindow = window.open("", "_blank", "width=900,height=700");
  if (!printWindow) {
    toast.error("Unable to open print window. Please allow popups.");
    return;
  }

  printWindow.document.write(`
    <html>
      <head>
        <title>${title}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 24px; color: #111827; }
          h1, h2, h3 { margin: 0 0 8px 0; }
          .muted { color: #6b7280; }
          .row { margin-bottom: 8px; }
          table { width: 100%; border-collapse: collapse; margin-top: 12px; }
          th, td { border: 1px solid #d1d5db; padding: 8px; text-align: left; font-size: 12px; }
          .right { text-align: right; }
          .section { margin-top: 18px; }
        </style>
      </head>
      <body>
        ${htmlBody}
      </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
};

function OrderDetailsModal({ order, open, onClose, onOrderUpdated, loading = false }) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    orderStatus: order?.orderStatus || "pending",
    paymentStatus: order?.paymentStatus || "pending",
    trackingNumber: order?.trackingNumber || "",
    courierName: order?.courierName || "",
    adminNote: order?.adminNote || "",
    statusNote: "",
  });

  const items = useMemo(() => order?.items || [], [order]);

  if (!open) return null;

  const syncFromOrder = () => {
    setForm({
      orderStatus: order?.orderStatus || "pending",
      paymentStatus: order?.paymentStatus || "pending",
      trackingNumber: order?.trackingNumber || "",
      courierName: order?.courierName || "",
      adminNote: order?.adminNote || "",
      statusNote: "",
    });
  };

  const handleSave = async () => {
    if (!order?._id) return;

    if (form.trackingNumber && form.trackingNumber.length > 120) {
      toast.error("Tracking number is too long");
      return;
    }

    setSaving(true);
    try {
      const updated = await updateOrderDetails(order._id, {
        orderStatus: form.orderStatus,
        paymentStatus: form.paymentStatus,
        trackingNumber: form.trackingNumber,
        courierName: form.courierName,
        adminNote: form.adminNote,
        statusNote: form.statusNote,
      });
      onOrderUpdated?.(updated);
      toast.success("Order updated successfully");
      syncFromOrder();
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const handlePrintWaybill = () => {
    if (!order) return;

    const shipping = order.shippingAddress || {};

    printHtml(
      `Waybill-${order._id}`,
      `
        <h1>Waybill</h1>
        <div class="row"><strong>Order ID:</strong> ${order._id}</div>
        <div class="row"><strong>Customer:</strong> ${shipping.fullName || order.userId?.name || "N/A"}</div>
        <div class="row"><strong>Mobile:</strong> ${shipping.phone || "N/A"}</div>
        <div class="row"><strong>Address:</strong> ${shipping.line1 || ""} ${shipping.line2 || ""}, ${shipping.city || ""}, ${shipping.state || ""}, ${shipping.postalCode || ""}, ${shipping.country || ""}</div>
        <div class="row"><strong>Courier:</strong> ${order.courierName || "N/A"}</div>
        <div class="row"><strong>Tracking #:</strong> ${order.trackingNumber || "N/A"}</div>
        <div class="row"><strong>Package items:</strong> ${items.length}</div>
      `
    );
  };

  const handlePrintInvoice = () => {
    if (!order) return;

    const shipping = order.shippingAddress || {};
    const rows = items
      .map(
        (item) => `
          <tr>
            <td>${item.name}</td>
            <td>${item.sku || "-"}</td>
            <td class="right">${item.quantity}</td>
            <td class="right">${formatMoney(item.price)}</td>
            <td class="right">${formatMoney(item.discountAmount)}</td>
            <td class="right">${formatMoney(item.shippingPrice)}</td>
            <td class="right">${formatMoney(item.lineTotal)}</td>
          </tr>
        `
      )
      .join("");

    printHtml(
      `Invoice-${order.invoiceNumber || order._id}`,
      `
        <h1>Woodmart.lk</h1>
        <div class="muted">Invoice</div>
        <div class="section">
          <div class="row"><strong>Invoice #:</strong> ${order.invoiceNumber || order._id}</div>
          <div class="row"><strong>Order ID:</strong> ${order._id}</div>
          <div class="row"><strong>Order Date:</strong> ${formatDateTime(order.createdAt)}</div>
          <div class="row"><strong>Payment Method:</strong> ${order.paymentMethod || "N/A"}</div>
          <div class="row"><strong>Payment Status:</strong> ${order.paymentStatus || "N/A"}</div>
        </div>
        <div class="section">
          <h3>Bill To / Ship To</h3>
          <div class="row">${shipping.fullName || order.userId?.name || "N/A"}</div>
          <div class="row">${order.userId?.email || "N/A"}</div>
          <div class="row">${shipping.phone || "N/A"}</div>
          <div class="row">${shipping.line1 || ""} ${shipping.line2 || ""}, ${shipping.city || ""}, ${shipping.state || ""}, ${shipping.postalCode || ""}, ${shipping.country || ""}</div>
        </div>
        <div class="section">
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>SKU</th>
                <th class="right">Qty</th>
                <th class="right">Unit Price</th>
                <th class="right">Discount</th>
                <th class="right">Shipping</th>
                <th class="right">Total</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>
        </div>
        <div class="section">
          <div class="row right"><strong>Subtotal:</strong> ${formatMoney(order.subtotalAmount)}</div>
          <div class="row right"><strong>Shipping:</strong> ${formatMoney(order.shippingTotal)}</div>
          <div class="row right"><strong>Discount:</strong> ${formatMoney(order.discountTotal)}</div>
          <div class="row right"><strong>Total:</strong> ${formatMoney(order.totalAmount)}</div>
        </div>
      `
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div className="max-h-[92vh] w-full max-w-6xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-xl font-semibold text-ink">Order Details</h3>
          <div className="flex items-center gap-2">
            <button type="button" onClick={handlePrintWaybill} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm">Print Waybill</button>
            <button type="button" onClick={handlePrintInvoice} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm">Print Invoice</button>
            <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm">Close</button>
          </div>
        </div>

        {loading || !order ? (
          <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-muted">Loading order details...</div>
        ) : (
          <div className="mt-5 grid gap-5 lg:grid-cols-[1.2fr_1fr]">
            <div className="space-y-4">
              <section className="rounded-lg border border-slate-200 p-4">
                <h4 className="text-sm font-semibold uppercase tracking-wide text-muted">Order</h4>
                <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                  <p><span className="font-semibold">Order ID:</span> {order._id}</p>
                  <p><span className="font-semibold">Order Date:</span> {formatDateTime(order.createdAt)}</p>
                  <p><span className="font-semibold">Status:</span> <StatusBadge value={order.orderStatus} /></p>
                  <p><span className="font-semibold">Payment:</span> <StatusBadge value={order.paymentStatus} /></p>
                  <p><span className="font-semibold">Payment Method:</span> {order.paymentMethod || "N/A"}</p>
                  <p><span className="font-semibold">Transaction ID:</span> {order.transactionId || "N/A"}</p>
                  <p><span className="font-semibold">Tracking #:</span> {order.trackingNumber || "N/A"}</p>
                  <p><span className="font-semibold">Courier:</span> {order.courierName || "N/A"}</p>
                </div>
              </section>

              <section className="rounded-lg border border-slate-200 p-4">
                <h4 className="text-sm font-semibold uppercase tracking-wide text-muted">Customer & Shipping</h4>
                <div className="mt-3 space-y-1 text-sm">
                  <p><span className="font-semibold">Name:</span> {order.shippingAddress?.fullName || order.userId?.name || "N/A"}</p>
                  <p><span className="font-semibold">Email:</span> {order.userId?.email || "N/A"}</p>
                  <p><span className="font-semibold">Mobile:</span> {order.shippingAddress?.phone || "N/A"}</p>
                  <p><span className="font-semibold">Address:</span> {`${order.shippingAddress?.line1 || ""} ${order.shippingAddress?.line2 || ""}, ${order.shippingAddress?.city || ""}, ${order.shippingAddress?.state || ""}, ${order.shippingAddress?.postalCode || ""}, ${order.shippingAddress?.country || ""}`}</p>
                </div>
              </section>

              <section className="rounded-lg border border-slate-200 p-4">
                <h4 className="text-sm font-semibold uppercase tracking-wide text-muted">Items</h4>
                <div className="mt-3 space-y-3">
                  {items.map((item) => (
                    <article key={`${item.productId}-${item.name}`} className="grid gap-3 rounded-lg border border-slate-100 p-3 sm:grid-cols-[64px_1fr_auto]">
                      <img src={item.image} alt={item.name} className="h-16 w-16 rounded-md object-cover" />
                      <div className="text-sm">
                        <p className="font-semibold text-ink">{item.name}</p>
                        <p className="text-xs text-muted">SKU: {item.sku || "-"}</p>
                        <p className="text-xs text-muted">Qty: {item.quantity}</p>
                        <p className="text-xs text-muted">Unit: {formatMoney(item.price)} | Discount: {formatMoney(item.discountAmount)} | Shipping: {formatMoney(item.shippingPrice)}</p>
                      </div>
                      <div className="text-sm font-semibold text-ink">{formatMoney(item.lineTotal)}</div>
                    </article>
                  ))}
                </div>
                <div className="mt-4 space-y-1 border-t border-slate-200 pt-3 text-sm">
                  <div className="flex justify-between"><span>Subtotal</span><span>{formatMoney(order.subtotalAmount)}</span></div>
                  <div className="flex justify-between"><span>Shipping</span><span>{formatMoney(order.shippingTotal)}</span></div>
                  <div className="flex justify-between"><span>Discount</span><span>- {formatMoney(order.discountTotal)}</span></div>
                  <div className="flex justify-between text-base font-semibold"><span>Total</span><span>{formatMoney(order.totalAmount)}</span></div>
                </div>
              </section>
            </div>

            <div className="space-y-4">
              <section className="rounded-lg border border-slate-200 p-4">
                <h4 className="text-sm font-semibold uppercase tracking-wide text-muted">Manage Order</h4>
                <div className="mt-3 grid gap-3">
                  <label className="text-sm">
                    <span className="mb-1 block font-semibold">Order Status</span>
                    <select value={form.orderStatus} onChange={(event) => setForm((prev) => ({ ...prev, orderStatus: event.target.value }))} className="w-full rounded-lg border border-slate-300 px-3 py-2">
                      {ORDER_STATUS_OPTIONS.map((value) => (
                        <option key={value} value={value}>{value}</option>
                      ))}
                    </select>
                  </label>

                  <label className="text-sm">
                    <span className="mb-1 block font-semibold">Payment Status</span>
                    <select value={form.paymentStatus} onChange={(event) => setForm((prev) => ({ ...prev, paymentStatus: event.target.value }))} className="w-full rounded-lg border border-slate-300 px-3 py-2">
                      {PAYMENT_STATUS_OPTIONS.map((value) => (
                        <option key={value} value={value}>{value}</option>
                      ))}
                    </select>
                  </label>

                  <label className="text-sm">
                    <span className="mb-1 block font-semibold">Tracking Number</span>
                    <input value={form.trackingNumber} onChange={(event) => setForm((prev) => ({ ...prev, trackingNumber: event.target.value }))} className="w-full rounded-lg border border-slate-300 px-3 py-2" placeholder="Enter tracking number" />
                  </label>

                  <label className="text-sm">
                    <span className="mb-1 block font-semibold">Courier Name</span>
                    <input value={form.courierName} onChange={(event) => setForm((prev) => ({ ...prev, courierName: event.target.value }))} className="w-full rounded-lg border border-slate-300 px-3 py-2" placeholder="Courier service name" />
                  </label>

                  <label className="text-sm">
                    <span className="mb-1 block font-semibold">Status Note</span>
                    <input value={form.statusNote} onChange={(event) => setForm((prev) => ({ ...prev, statusNote: event.target.value }))} className="w-full rounded-lg border border-slate-300 px-3 py-2" placeholder="Optional status note" />
                  </label>

                  <label className="text-sm">
                    <span className="mb-1 block font-semibold">Internal Admin Note</span>
                    <textarea rows={3} value={form.adminNote} onChange={(event) => setForm((prev) => ({ ...prev, adminNote: event.target.value }))} className="w-full rounded-lg border border-slate-300 px-3 py-2" placeholder="Internal notes for team" />
                  </label>

                  <button type="button" onClick={handleSave} disabled={saving} className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
                    {saving ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </section>

              <section className="rounded-lg border border-slate-200 p-4">
                <h4 className="text-sm font-semibold uppercase tracking-wide text-muted">Timeline</h4>
                <div className="mt-3 space-y-2">
                  {(order.statusHistory || []).length ? (
                    order.statusHistory.map((entry) => (
                      <div key={entry.id} className="rounded-md border border-slate-100 bg-slate-50 p-2 text-xs">
                        <div className="flex items-center justify-between">
                          <StatusBadge value={entry.status} />
                          <span className="text-muted">{formatDateTime(entry.changedAt)}</span>
                        </div>
                        <p className="mt-1 text-slate-700">{entry.note || "No note"}</p>
                        <p className="mt-1 text-muted">
                          By: {entry.changedByUser?.name || entry.changedByUser?.email || "System"}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-muted">No status history yet.</p>
                  )}
                </div>
              </section>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default OrderDetailsModal;
