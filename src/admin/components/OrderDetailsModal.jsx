import { useEffect, useMemo, useState } from "react";
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

const printHtml = (title, htmlBody, options = {}) => {
  const pageSize = options.pageSize || "A4";
  const pageMargin = options.pageMargin || "10mm";

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
          @page {
            size: ${pageSize};
            margin: ${pageMargin};
          }

          :root {
            --brand: #0959a4;
            --brand-soft: #eaf3fb;
            --ink: #0f172a;
            --muted: #475569;
            --line: #dbe3ee;
            --panel: #ffffff;
            --surface: #f6f9fc;
          }

          * { box-sizing: border-box; }

          body {
            margin: 0;
            padding: 20px;
            font-family: "Segoe UI", Arial, sans-serif;
            color: var(--ink);
            background: var(--surface);
          }

          .invoice {
            width: 190mm;
            max-width: calc(100vw - 40px);
            margin: 0 auto;
            background: var(--panel);
            border: 1px solid var(--line);
            border-radius: 14px;
            overflow: hidden;
          }

          .invoice-header {
            background: linear-gradient(120deg, #0959a4, #0a4a84);
            color: #ffffff;
            padding: 22px 24px;
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 24px;
          }

          .brand-title { margin: 0; font-size: 26px; font-weight: 700; letter-spacing: 0.02em; }
          .brand-sub { margin: 4px 0 0 0; font-size: 12px; opacity: 0.9; }
          .invoice-title { margin: 0 0 8px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 0.12em; opacity: 0.9; }

          .meta-grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(140px, 1fr));
            gap: 8px 16px;
            font-size: 12px;
          }

          .meta-item-label { opacity: 0.82; margin-right: 6px; }
          .status-pill {
            display: inline-block;
            padding: 4px 10px;
            border-radius: 999px;
            font-size: 11px;
            font-weight: 700;
            letter-spacing: 0.04em;
            text-transform: uppercase;
            background: rgba(255, 255, 255, 0.16);
            border: 1px solid rgba(255, 255, 255, 0.26);
          }

          .invoice-body { padding: 20px 24px 24px; }

          .section-title {
            margin: 0 0 10px 0;
            font-size: 13px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            color: var(--brand);
          }

          .cards {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 14px;
            margin-bottom: 16px;
          }

          .card {
            border: 1px solid var(--line);
            border-radius: 10px;
            padding: 12px 14px;
            background: #ffffff;
          }

          .row { margin-bottom: 6px; font-size: 13px; color: var(--muted); }
          .row strong { color: var(--ink); }

          table {
            width: 100%;
            border-collapse: collapse;
            border: 1px solid var(--line);
            border-radius: 10px;
            overflow: hidden;
            margin-top: 12px;
            table-layout: fixed;
          }

          .items-table col.col-product { width: 41%; }
          .items-table col.col-qty { width: 8%; }
          .items-table col.col-unit,
          .items-table col.col-discount,
          .items-table col.col-shipping,
          .items-table col.col-total { width: 12.75%; }

          th {
            background: var(--brand-soft);
            color: var(--brand);
            text-align: left;
            font-size: 12px;
            font-weight: 700;
            letter-spacing: 0.04em;
            text-transform: uppercase;
            padding: 10px;
            border-bottom: 1px solid var(--line);
          }

          td {
            padding: 10px;
            border-bottom: 1px solid var(--line);
            font-size: 12px;
            vertical-align: top;
            word-break: break-word;
            overflow-wrap: anywhere;
          }

          tbody tr:last-child td { border-bottom: none; }
          .right { text-align: right; }

          .item-cell {
            display: grid;
            grid-template-columns: 44px 1fr;
            gap: 10px;
            align-items: start;
            min-width: 0;
          }

          .item-image {
            width: 44px;
            height: 44px;
            object-fit: cover;
            border-radius: 6px;
            border: 1px solid var(--line);
            background: #eef2f7;
          }

          .item-name { font-weight: 600; color: var(--ink); margin: 0 0 2px; }
          .item-sku { font-size: 11px; color: #64748b; margin: 0; }

          .totals-wrap {
            display: flex;
            justify-content: flex-end;
            margin-top: 14px;
          }

          .totals {
            width: 74mm;
            max-width: 100%;
            border: 1px solid var(--line);
            border-radius: 10px;
            padding: 10px 12px;
            background: #ffffff;
          }

          .totals-row {
            display: flex;
            justify-content: space-between;
            padding: 6px 0;
            font-size: 13px;
            color: var(--muted);
          }

          .totals-row strong { color: var(--ink); }

          .totals-row.total {
            margin-top: 4px;
            padding-top: 10px;
            border-top: 1px solid var(--line);
            font-size: 16px;
            font-weight: 700;
            color: var(--brand);
          }

          .invoice-footer {
            margin-top: 16px;
            padding-top: 12px;
            border-top: 1px dashed var(--line);
            font-size: 12px;
            color: #64748b;
          }

          .invoice-footer p { margin: 0 0 6px 0; }

          .cards,
          .totals-wrap,
          .invoice-footer,
          .items-table tr,
          .card {
            page-break-inside: avoid;
            break-inside: avoid;
          }

          @media (max-width: 900px) {
            .invoice {
              width: 100%;
              max-width: 100%;
            }

            .invoice-header {
              flex-direction: column;
              gap: 14px;
            }

            .cards {
              grid-template-columns: 1fr;
            }
          }

          @media print {
            body {
              margin: 0;
              padding: 0;
              background: #ffffff;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }

            .invoice {
              width: 100%;
              max-width: 100%;
              border: none;
              border-radius: 0;
            }

            .invoice-header {
              border-bottom: 1px solid #d0d9e6;
            }

            .invoice-body {
              padding: 12px 0 0;
            }

            .cards {
              grid-template-columns: 1fr 1fr;
              gap: 10px;
            }

            th,
            td {
              font-size: 11px;
              padding: 8px;
            }

            .totals {
              width: 72mm;
            }

            .invoice-footer {
              margin-top: 12px;
            }
          }

          .waybill {
            width: 202mm;
            height: calc(297mm - 8mm);
            max-width: 100%;
            margin: 0 auto;
            border: 2px solid #000;
            border-radius: 0;
            background: #fff;
            color: #000;
            font-family: "Segoe UI", Arial, sans-serif;
            padding: 4mm;
            display: grid;
            grid-template-rows: auto auto auto auto auto;
            gap: 2.5mm;
          }

          .waybill-head {
            border-bottom: 1px solid #000;
            padding-bottom: 3mm;
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 4mm;
          }

          .waybill-title {
            margin: 0;
            font-size: 41px;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            font-weight: 800;
            color: #000;
          }

          .waybill-store {
            margin: 1mm 0 0 0;
            font-size: 17px;
            font-weight: 600;
          }

          .waybill-meta {
            margin: 0;
            text-align: right;
            font-size: 20px;
            line-height: 1.55;
          }

          .waybill-section {
            border: 1px solid #000;
            padding: 3mm;
            margin-bottom: 0;
            page-break-inside: avoid;
            break-inside: avoid;
            display: flex;
            flex-direction: column;
            justify-content: flex-start;
          }

          .waybill-section-title {
            margin: 0 0 2mm 0;
            font-size: 28px;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            font-weight: 700;
            border-bottom: 1px dashed #000;
            padding-bottom: 1.5mm;
          }

          .waybill-row {
            margin: 0 0 1.6mm 0;
            font-size: 25px;
            line-height: 1.45;
          }

          .waybill-label {
            display: inline-block;
            min-width: 25mm;
            font-weight: 700;
            font-size: 22px;
          }

          .waybill-address {
            margin: 0;
            font-size: 25px;
            line-height: 1.5;
            word-break: break-word;
          }

          .waybill-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 2.5mm;
          }

          .tracking-box {
            border: 2px solid #000;
            padding: 3.5mm;
            text-align: center;
            margin-top: 0;
            page-break-inside: avoid;
            break-inside: avoid;
            display: flex;
            flex-direction: column;
            justify-content: center;
          }

          .tracking-label {
            margin: 0 0 1mm 0;
            font-size: 22px;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            font-weight: 700;
          }

          .tracking-value {
            margin: 0;
            font-size: 53px;
            letter-spacing: 0.08em;
            font-weight: 800;
            word-break: break-all;
            line-height: 1.25;
          }

          .waybill-amount {
            font-size: 35px;
            font-weight: 800;
          }

          .waybill-footer {
            margin-top: auto;
            border-top: 1px solid #000;
            padding-top: 2mm;
            font-size: 19px;
            line-height: 1.45;
          }

          @media print {
            .waybill {
              width: 100%;
              height: calc(297mm - 8mm);
              border-width: 1.5px;
              padding: 4mm;
              margin: 0;
              gap: 2mm;
            }

            .waybill-title {
              font-size: 37px;
            }

            .waybill-meta,
            .waybill-row,
            .waybill-address {
              font-size: 20px;
            }

            .waybill-section-title {
              font-size: 26px;
            }

            .waybill-label {
              font-size: 22px;
            }

            .tracking-value {
              font-size: 50px;
            }

            .waybill-footer {
              font-size: 17px;
            }
          }
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
  const isShippedSelected = form.orderStatus === "shipped";
  const trackingRequiredError =
    isShippedSelected && !String(form.trackingNumber || "").trim()
      ? "Tracking number is required before marking an order as shipped."
      : "";

  const syncFromOrder = (source = order) => {
    setForm({
      orderStatus: source?.orderStatus || "pending",
      paymentStatus: source?.paymentStatus || "pending",
      trackingNumber: source?.trackingNumber || "",
      courierName: source?.courierName || "",
      adminNote: source?.adminNote || "",
      statusNote: "",
    });
  };

  useEffect(() => {
    if (!open) return;
    syncFromOrder(order);
  }, [order, open]);

  if (!open) return null;

  const handleSave = async () => {
    if (!order?._id) return;

    if (trackingRequiredError) {
      toast.error(trackingRequiredError);
      return;
    }

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
      syncFromOrder(updated);
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
        <section class="waybill">
          <header class="waybill-head">
            <div>
              <h1 class="waybill-title">Woodmart.lk</h1>
            </div>
            <p class="waybill-meta">
              <strong>Order ID:</strong> ${order._id}<br />
              <strong>Date:</strong> ${formatDateTime(order.createdAt)}
            </p>
          </header>

          <section class="waybill-section">
            <h3 class="waybill-section-title">Shipping Details</h3>
            <p class="waybill-row"><span class="waybill-label">Customer</span>${shipping.fullName || order.userId?.name || "N/A"}</p>
            <p class="waybill-row"><span class="waybill-label">Mobile</span>${shipping.phone || "N/A"}</p>
            <p class="waybill-row"><span class="waybill-label">Address</span></p>
            <p class="waybill-address">${shipping.line1 || ""} ${shipping.line2 || ""}, ${shipping.city || ""}, ${shipping.state || ""}, ${shipping.postalCode || ""}, ${shipping.country || ""}</p>
          </section>

          <section class="waybill-section">
            <h3 class="waybill-section-title">Payment & Order Details</h3>
            <div class="waybill-grid">
              <p class="waybill-row"><span class="waybill-label">Amount</span><span class="waybill-amount">${formatMoney(order.totalAmount)}</span></p>
              <p class="waybill-row"><span class="waybill-label">Method</span>${order.paymentMethod || "N/A"}</p>
              <p class="waybill-row"><span class="waybill-label">Items</span>${items.length}</p>
            </div>
          </section>

          <section class="tracking-box">
            <p class="tracking-label">Tracking Number</p>
            <p class="tracking-value">${order.trackingNumber || "NOT ASSIGNED"}</p>
          </section>

          <footer class="waybill-footer">
            Handle with care. This label is for shipping identification and delivery processing.
          </footer>
        </section>
      `,
      {
        pageSize: "A4",
        pageMargin: "4mm",
      }
    );
  };

  const handlePrintInvoice = () => {
    if (!order) return;

    const shipping = order.shippingAddress || {};
    const rows = items
      .map(
        (item) => `
          <tr>
            <td>
              <div class="item-cell">
                <img class="item-image" src="${item.image || ""}" alt="${item.name || "Item"}" />
                <div>
                  <p class="item-name">${item.name}</p>
                  <p class="item-sku">SKU: ${item.sku || "-"}</p>
                </div>
              </div>
            </td>
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
        <div class="invoice">
          <header class="invoice-header">
            <div>
              <h1 class="brand-title">Woodmart.lk</h1>
              <p class="brand-sub">Furniture and lifestyle essentials</p>
            </div>
            <div>
              <p class="invoice-title">Invoice</p>
              <div class="meta-grid">
                <div><span class="meta-item-label">Invoice #</span>${order.invoiceNumber || order._id}</div>
                <div><span class="meta-item-label">Order #</span>${order._id}</div>
                <div><span class="meta-item-label">Date</span>${formatDateTime(order.createdAt)}</div>
                <div><span class="meta-item-label">Method</span>${order.paymentMethod || "N/A"}</div>
                <div><span class="meta-item-label">Payment</span><span class="status-pill">${order.paymentStatus || "N/A"}</span></div>
                <div><span class="meta-item-label">Order</span><span class="status-pill">${order.orderStatus || "N/A"}</span></div>
              </div>
            </div>
          </header>

          <main class="invoice-body">
            <div class="cards">
              <section class="card">
                <h3 class="section-title">Customer Details</h3>
                <div class="row"><strong>Name:</strong> ${shipping.fullName || order.userId?.name || "N/A"}</div>
                <div class="row"><strong>Email:</strong> ${order.userId?.email || "N/A"}</div>
                <div class="row"><strong>Phone:</strong> ${shipping.phone || "N/A"}</div>
              </section>

              <section class="card">
                <h3 class="section-title">Shipping Address</h3>
                <div class="row">${shipping.line1 || ""}</div>
                ${shipping.line2 ? `<div class="row">${shipping.line2}</div>` : ""}
                <div class="row">${shipping.city || ""}, ${shipping.state || ""}</div>
                <div class="row">${shipping.postalCode || ""}, ${shipping.country || ""}</div>
              </section>
            </div>

            <section>
              <h3 class="section-title">Items</h3>
              <table class="items-table">
                <colgroup>
                  <col class="col-product" />
                  <col class="col-qty" />
                  <col class="col-unit" />
                  <col class="col-discount" />
                  <col class="col-shipping" />
                  <col class="col-total" />
                </colgroup>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th class="right">Qty</th>
                    <th class="right">Unit Price</th>
                    <th class="right">Discount</th>
                    <th class="right">Shipping</th>
                    <th class="right">Line Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${rows}
                </tbody>
              </table>
            </section>

            <div class="totals-wrap">
              <section class="totals">
                <div class="totals-row"><span>Subtotal</span><strong>${formatMoney(order.subtotalAmount)}</strong></div>
                <div class="totals-row"><span>Shipping</span><strong>${formatMoney(order.shippingTotal)}</strong></div>
                <div class="totals-row"><span>Discount</span><strong>- ${formatMoney(order.discountTotal)}</strong></div>
                <div class="totals-row"><span>Payment Method</span><strong>${order.paymentMethod || "N/A"}</strong></div>
                <div class="totals-row total"><span>Total</span><span>${formatMoney(order.totalAmount)}</span></div>
              </section>
            </div>

            <footer class="invoice-footer">
              <p>Thank you for shopping with Woodmart.lk.</p>
              <p>For support: support@woodmart.lk | +94 76 065 9957</p>
              <p>This is a system-generated invoice for order processing.</p>
            </footer>
          </main>
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
                    <input value={form.trackingNumber} onChange={(event) => setForm((prev) => ({ ...prev, trackingNumber: event.target.value }))} className={`w-full rounded-lg border px-3 py-2 ${trackingRequiredError ? "border-red-400 bg-red-50" : "border-slate-300"}`} placeholder="Enter tracking number" />
                    {trackingRequiredError ? (
                      <p className="mt-1 text-xs font-medium text-red-600">{trackingRequiredError}</p>
                    ) : null}
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

                  <button type="button" onClick={handleSave} disabled={saving || Boolean(trackingRequiredError)} className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60">
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
