import { CheckCircle2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { useStorefrontSettings } from "../context/StorefrontSettingsContext";
import { getApiErrorMessage } from "../services/apiClient";
import { getOrderByIdApi } from "../services/orderService";

const COURIER_TRACKING_URL = "https://www.prontolanka.lk/";

function OrderConfirmationPage() {
  const { id } = useParams();
  const { formatMoney } = useStorefrontSettings();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  const handleCopyTracking = async () => {
    if (!order?.trackingNumber) return;
    try {
      await navigator.clipboard.writeText(order.trackingNumber);
      toast.success("Tracking number copied");
    } catch (error) {
      toast.error("Unable to copy tracking number");
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

        <div className="mt-6 space-y-2 rounded-xl border border-slate-200 p-4">
          {order.items.map((item) => (
            <div key={item.productId} className="flex justify-between text-sm">
              <span>
                {item.name} x {item.quantity}
                <br />
                <span className="text-xs text-muted">Item: {formatMoney(Number(item.price || 0))} | Shipping: {formatMoney(Number(item.shippingPrice || 0))} | Discount: {formatMoney(Number(item.discountAmount || 0))}</span>
              </span>
              <span>{formatMoney(Number(item.lineTotal || (item.quantity * item.price)))}</span>
            </div>
          ))}
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link to="/orders" className="btn-primary">View all orders</Link>
          {order.trackingNumber ? (
            <>
              <button type="button" onClick={handleCopyTracking} className="btn-secondary">Copy tracking</button>
              <button
                type="button"
                onClick={() => window.open(COURIER_TRACKING_URL, "_blank", "noopener,noreferrer")}
                className="btn-secondary"
              >
                Track order
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
