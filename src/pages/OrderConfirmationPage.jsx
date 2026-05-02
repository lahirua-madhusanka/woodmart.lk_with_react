import { CheckCircle2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { useStorefrontSettings } from "../context/StorefrontSettingsContext";
import { getApiErrorMessage } from "../services/apiClient";
import { getOrderByIdApi } from "../services/orderService";

const COURIER_TRACKING_URL = "https://www.prontolanka.lk/";
const ORDER_ITEM_PLACEHOLDER =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80"><rect width="80" height="80" fill="#f1f5f9"/><rect x="16" y="18" width="48" height="34" rx="4" fill="#cbd5e1"/><circle cx="30" cy="30" r="5" fill="#94a3b8"/><path d="M20 48l10-10 9 9 7-7 14 14H20z" fill="#e2e8f0"/><rect x="20" y="57" width="40" height="6" rx="3" fill="#cbd5e1"/></svg>'
  );

const resolveItemImage = (item) => {
  const imageValue = String(item?.image || "").trim();
  return imageValue || ORDER_ITEM_PLACEHOLDER;
};

function OrderConfirmationPage() {
  const { id } = useParams();
  const { formatMoney } = useStorefrontSettings();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  const handleCopyTracking = async () => {
    const trackingValue = String(order?.trackingNumber || "").trim();
    if (!trackingValue) return;

    try {
      await navigator.clipboard.writeText(trackingValue);
      toast.success("Tracking number copied");
      return;
    } catch {
      // Fall through to legacy clipboard fallback.
    }

    try {
      const helper = document.createElement("textarea");
      helper.value = trackingValue;
      helper.setAttribute("readonly", "");
      helper.style.position = "fixed";
      helper.style.left = "-9999px";
      document.body.appendChild(helper);
      helper.select();
      const copied = document.execCommand("copy");
      document.body.removeChild(helper);

      if (copied) {
        toast.success("Tracking number copied");
      } else {
        toast.info("Copy not supported in this browser. Please copy manually.");
      }
    } catch {
      toast.info("Copy not supported in this browser. Please copy manually.");
    }
  };

  useEffect(() => {
    const loadOrder = async () => {
      try {
        const data = await getOrderByIdApi(id);
        setOrder(data);
      } catch (error) {
        toast.error(getApiErrorMessage(error));
      } finally {
        setLoading(false);
      }
    };

    loadOrder();
  }, [id]);

  if (loading) {
    return <section className="container-pad py-10 text-muted">Loading order...</section>;
  }

  if (!order) {
    return (
      <section className="container-pad py-10">
        <p className="text-muted">Order not found.</p>
      </section>
    );
  }

  return (
    <section className="container-pad py-10">
      <div className="rounded-2xl border border-slate-200 bg-white p-7">
        <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-emerald-700">
          <CheckCircle2 size={16} /> Order Confirmed
        </div>

        <h1 className="mt-4 font-display text-3xl font-bold">Thank you for your purchase</h1>
        <p className="mt-2 text-sm text-muted">Order ID: #{order._id.slice(-10).toUpperCase()}</p>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-xl bg-slate-50 p-4">
            <h2 className="font-semibold">Shipping Address</h2>
            <p className="mt-2 text-sm text-muted">
              {order.shippingAddress.fullName}
              <br />
              {order.shippingAddress.line1}
              {order.shippingAddress.line2 ? `, ${order.shippingAddress.line2}` : ""}
              <br />
              {order.shippingAddress.city}, {order.shippingAddress.postalCode}
              <br />
              {order.shippingAddress.country}
              <br />
              {order.shippingAddress.phone}
            </p>
          </div>

          <div className="rounded-xl bg-slate-50 p-4">
            <h2 className="font-semibold">Order Summary</h2>
            <p className="mt-2 text-sm text-muted">Payment: {order.paymentStatus}</p>
            <p className="mt-1 text-sm text-muted">Status: {order.orderStatus}</p>
            <p className="mt-1 text-sm text-muted">Tracking #: {order.trackingNumber || "Not assigned yet"}</p>
            <p className="mt-1 text-sm text-muted">Courier: {order.courierName || "Not assigned yet"}</p>
            <p className="mt-1 text-sm text-muted">Subtotal: {formatMoney(Number(order.subtotalAmount || 0))}</p>
            <p className="mt-1 text-sm text-muted">Shipping: {formatMoney(Number(order.shippingTotal || 0))}</p>
            <p className="mt-1 text-sm text-muted">Discount: {formatMoney(Number(order.discountTotal || 0))}</p>
            {Number(order.couponDiscountAmount || 0) > 0 ? (
              <p className="mt-1 text-sm text-muted">
                Coupon ({order.couponCode || "applied"}): -{formatMoney(Number(order.couponDiscountAmount || 0))}
              </p>
            ) : null}
            <p className="mt-1 text-sm font-semibold text-brand-dark">Total: {formatMoney(Number(order.totalAmount || 0))}</p>
          </div>
        </div>

        <div className="mt-6 space-y-3 rounded-xl border border-slate-200 p-4">
          {order.items.map((item) => (
            <div key={`${item.productId}-${item.variationId || "base"}`} className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3 last:border-none last:pb-0">
              <div className="flex min-w-0 items-start gap-3">
                <img
                  src={resolveItemImage(item)}
                  alt={item.name || "Ordered product"}
                  className="h-14 w-14 shrink-0 rounded-lg border border-slate-200 object-cover"
                  onError={(event) => {
                    event.currentTarget.src = ORDER_ITEM_PLACEHOLDER;
                  }}
                />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-ink">{item.name}</p>
                  {item.variationName ? (
                    <p className="text-xs text-muted">Variation: {item.variationName}</p>
                  ) : null}
                  {item.variationSku ? (
                    <p className="text-xs text-muted">SKU: {item.variationSku}</p>
                  ) : null}
                  <p className="text-xs text-muted">Qty: {Number(item.quantity || 0)}</p>
                  <p className="text-xs text-muted">Price: {formatMoney(Number(item.price || 0))}</p>
                  {Number(item.promotionDiscountPercentage || 0) > 0 ? (
                    <p className="text-xs text-muted">
                      Original: {formatMoney(Number(item.promotionOriginalPrice || item.listPrice || item.price || 0))}
                    </p>
                  ) : null}
                  {Number(item.promotionDiscountPercentage || 0) > 0 ? (
                    <p className="text-xs font-semibold text-rose-600">{Number(item.promotionDiscountPercentage || 0)}% OFF</p>
                  ) : null}
                  {item.promotionActive && item.promotionTitle ? (
                    <p className="text-xs font-medium text-emerald-700">Promotion: {item.promotionTitle}</p>
                  ) : null}
                  <p className="text-xs text-muted">Subtotal: {formatMoney(Number(item.lineSubtotal || Number(item.quantity || 0) * Number(item.price || 0)))}</p>
                </div>
              </div>
              <span className="shrink-0 text-sm font-semibold text-ink">
                {formatMoney(Number(item.lineTotal || Number(item.quantity || 0) * Number(item.price || 0)))}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link to="/orders" className="btn-primary">View all orders</Link>
          {String(order.orderStatus || "").toLowerCase() === "delivered" ? (
            <Link to={`/review?orderId=${encodeURIComponent(order._id)}`} className="btn-secondary">
              Review Products
            </Link>
          ) : null}
          {order.trackingNumber ? (
            <>
              <button type="button" onClick={handleCopyTracking} className="btn-secondary">Copy Tracking Number</button>
              <button
                type="button"
                onClick={() => window.open(COURIER_TRACKING_URL, "_blank", "noopener,noreferrer")}
                className="btn-secondary"
              >
                Track Order
              </button>
            </>
          ) : null}
          <Link to="/shop" className="btn-secondary">Continue shopping</Link>
        </div>
      </div>
    </section>
  );
}

export default OrderConfirmationPage;
