import { CardElement, Elements, useElements, useStripe } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useAuth } from "../context/AuthContext";
import { useStorefrontSettings } from "../context/StorefrontSettingsContext";
import { useStore } from "../context/StoreContext";
import { getApiErrorMessage } from "../services/apiClient";
import {
  applyCouponApi,
  createOrderApi,
  createPaymentIntentApi,
  getCheckoutProfileApi,
  saveCheckoutAddressApi,
} from "../services/orderService";

const stripePromise = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY)
  : null;

const cardStyle = {
  style: {
    base: {
      color: "#1f2937",
      fontFamily: "Manrope, sans-serif",
      fontSize: "14px",
      "::placeholder": { color: "#94a3b8" },
    },
  },
};

const emptyAddress = {
  id: "",
  fullName: "",
  email: "",
  phone: "",
  line1: "",
  line2: "",
  city: "",
  state: "",
  postalCode: "",
  country: "Sri Lanka",
};

function CheckoutInner({ stripeEnabled }) {
  const stripe = useStripe();
  const elements = useElements();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { formatMoney } = useStorefrontSettings();
  const { cartDetailedItems, cartSubtotal, cartShippingTotal, cartDiscountTotal } = useStore();

  const [loadingProfile, setLoadingProfile] = useState(true);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [savingAddress, setSavingAddress] = useState(false);
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState(stripeEnabled ? "card" : "cod");
  const [saveForFuture, setSaveForFuture] = useState(false);
  const [address, setAddress] = useState({ ...emptyAddress });
  const [couponCodeInput, setCouponCodeInput] = useState("");
  const [applyingCoupon, setApplyingCoupon] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const couponDiscountAmount = Number(appliedCoupon?.discountAmount || 0);

  const subtotalAmount = Number(cartSubtotal || 0);
  const shippingAmount = Number(cartShippingTotal || 0);
  const totalBeforeCoupon = subtotalAmount + shippingAmount;

  const total = useMemo(
    () => Math.max(0, totalBeforeCoupon - Math.max(0, Math.min(couponDiscountAmount, totalBeforeCoupon))),
    [couponDiscountAmount, totalBeforeCoupon]
  );

  const handleApplyCoupon = async () => {
    const code = String(couponCodeInput || "").trim();
    if (!code) {
      toast.error("Please enter a coupon code");
      return;
    }

    setApplyingCoupon(true);
    try {
      const response = await applyCouponApi(code);
      const coupon = response?.coupon || null;
      const summaryDiscount = Number(response?.summary?.totalBeforeDiscount || 0) - Number(response?.summary?.totalAfterDiscount || 0);
      const discountAmount = Number(coupon?.discountAmount ?? response?.discountAmount ?? summaryDiscount ?? 0);

      if (!coupon || discountAmount <= 0) {
        throw new Error("Coupon did not return a valid discount amount");
      }

      setAppliedCoupon({
        ...coupon,
        discountAmount,
      });
      setCouponCodeInput(coupon.code || code.toUpperCase());
      toast.success(response?.message || "Coupon applied successfully");
    } catch (error) {
      setAppliedCoupon(null);
      toast.error(getApiErrorMessage(error));
    } finally {
      setApplyingCoupon(false);
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponCodeInput("");
  };

  useEffect(() => {
    let ignore = false;

    const loadCheckoutProfile = async () => {
      setLoadingProfile(true);
      try {
        const payload = await getCheckoutProfileApi();
        if (ignore) return;

        const customer = payload?.customer || {};
        const addresses = Array.isArray(payload?.savedAddresses)
          ? payload.savedAddresses
          : [];
        const suggested = payload?.suggestedAddress || null;

        setSavedAddresses(addresses);

        const defaultAddress =
          addresses.find((entry) => entry.isDefault) || addresses[0] || null;

        if (defaultAddress) {
          setSelectedAddressId(defaultAddress.id || "");
          setAddress({
            ...emptyAddress,
            ...defaultAddress,
            email: defaultAddress.email || customer.email || user?.email || "",
            fullName: defaultAddress.fullName || customer.fullName || user?.name || "",
          });
        } else if (suggested) {
          setAddress({
            ...emptyAddress,
            ...suggested,
            fullName: suggested.fullName || customer.fullName || user?.name || "",
            email: suggested.email || customer.email || user?.email || "",
          });
        } else {
          setAddress((prev) => ({
            ...prev,
            fullName: customer.fullName || user?.name || "",
            email: customer.email || user?.email || "",
          }));
        }
      } catch (error) {
        toast.error(getApiErrorMessage(error));
      } finally {
        if (!ignore) {
          setLoadingProfile(false);
        }
      }
    };

    loadCheckoutProfile();

    return () => {
      ignore = true;
    };
  }, [user?.email, user?.name]);

  const onChangeAddress = (field) => (event) => {
    setAddress((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const onSelectSavedAddress = (addressId) => {
    setSelectedAddressId(addressId);
    const selected = savedAddresses.find((item) => item.id === addressId);
    if (!selected) return;
    setAddress({ ...emptyAddress, ...selected });
  };

  const clearAddressSelection = () => {
    setSelectedAddressId("");
    setAddress((prev) => ({
      ...emptyAddress,
      fullName: prev.fullName,
      email: prev.email,
      country: prev.country || "Sri Lanka",
    }));
  };

  const requiredFields = [
    ["fullName", "Full name is required"],
    ["email", "Email is required"],
    ["phone", "Phone number is required"],
    ["line1", "Address line is required"],
    ["city", "City is required"],
    ["state", "District/State is required"],
    ["postalCode", "Postal code is required"],
    ["country", "Country is required"],
  ];

  const validateCheckout = () => {
    for (const [field, message] of requiredFields) {
      if (!String(address[field] || "").trim()) {
        toast.error(message);
        return false;
      }
    }

    if (!String(paymentMethod || "").trim()) {
      toast.error("Payment method is required");
      return false;
    }

    if (!cartDetailedItems.length) {
      toast.info("Your cart is empty");
      return false;
    }

    return true;
  };

  const persistAddressForFuture = async () => {
    setSavingAddress(true);
    const isDefault = savedAddresses.length === 0 || Boolean(address.id);
    try {
      const response = await saveCheckoutAddressApi({
        id: address.id || undefined,
        fullName: address.fullName,
        email: address.email,
        phone: address.phone,
        line1: address.line1,
        line2: address.line2 || "",
        city: address.city,
        state: address.state,
        postalCode: address.postalCode,
        country: address.country,
        isDefault,
      });

      const latestAddresses = Array.isArray(response?.savedAddresses)
        ? response.savedAddresses
        : [];

      if (response?.addressBookReady === false) {
        toast.info(response?.message || "Address book is not ready yet. Please apply latest database migrations.");
        return;
      }

      setSavedAddresses(latestAddresses);

      const matching = latestAddresses.find(
        (entry) =>
          entry.id === address.id ||
          (entry.line1 === address.line1 &&
            entry.postalCode === address.postalCode &&
            entry.phone === address.phone)
      );

      if (matching?.id) {
        setSelectedAddressId(matching.id);
        setAddress({ ...emptyAddress, ...matching });
      }

      toast.success("Address saved for future checkout");
    } catch (error) {
      toast.error(getApiErrorMessage(error));
      throw error;
    } finally {
      setSavingAddress(false);
    }
  };

  const placeOrder = async () => {
    if (!validateCheckout()) {
      return;
    }

    setPlacingOrder(true);

    try {
      let paymentStatus = "pending";
      let paymentIntentId = "";

      if (paymentMethod === "card") {
        if (!stripeEnabled || !stripe || !elements) {
          toast.error("Card payment is not configured yet. Please choose another payment method.");
          return;
        }

        const intent = await createPaymentIntentApi({ amount: total });
        paymentIntentId = intent.paymentIntentId;

        const card = elements.getElement(CardElement);
        if (!card) {
          toast.error("Card form is not ready");
          return;
        }

        const confirmation = await stripe.confirmCardPayment(intent.clientSecret, {
          payment_method: {
            card,
            billing_details: {
              name: address.fullName,
              email: address.email,
              phone: address.phone,
            },
          },
        });

        if (confirmation.error) {
          toast.error(confirmation.error.message || "Payment failed");
          return;
        }

        if (confirmation.paymentIntent?.status === "succeeded") {
          paymentStatus = "paid";
        } else {
          toast.error("Payment was not completed");
          return;
        }
      }

      if (saveForFuture) {
        await persistAddressForFuture();
      }

      const order = await createOrderApi({
        shippingAddress: {
          fullName: address.fullName,
          email: address.email,
          phone: address.phone,
          line1: address.line1,
          line2: address.line2 || "",
          city: address.city,
          state: address.state,
          postalCode: address.postalCode,
          country: address.country,
        },
        paymentMethod,
        paymentStatus,
        paymentIntentId,
        couponCode: appliedCoupon?.code || null,
        checkoutSummary: {
          subtotalAmount,
          shippingAmount,
          couponDiscountAmount,
          totalAmount: total,
        },
      });

      toast.success("Order placed successfully");
      navigate(`/order-confirmation/${order._id}`);
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setPlacingOrder(false);
    }
  };

  if (!cartDetailedItems.length) {
    return (
      <section className="container-pad py-10">
        <h1 className="font-display text-3xl font-bold">Checkout</h1>
        <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <p className="text-muted">Your cart is empty.</p>
          <Link to="/shop" className="btn-primary mt-4">Go to shop</Link>
        </div>
      </section>
    );
  }

  return (
    <section className="container-pad py-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-brand">Secure Checkout</p>
          <h1 className="font-display text-3xl font-bold text-ink">Complete Your Order</h1>
        </div>
        <p className="text-sm text-muted">{cartDetailedItems.length} item(s) in cart</p>
      </div>

      {loadingProfile && (
        <div className="mt-5 rounded-lg border border-slate-200 bg-white p-4 text-sm text-muted">
          Loading your saved checkout details...
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="text-lg font-semibold text-ink">Billing / Customer Details</h2>
            <p className="mt-1 text-sm text-muted">We will use these details for order confirmation and delivery updates.</p>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="text-sm text-muted">
                Full Name
                <input value={address.fullName} onChange={onChangeAddress("fullName")} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              </label>
              <label className="text-sm text-muted">
                Email
                <input type="email" value={address.email} onChange={onChangeAddress("email")} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              </label>
              <label className="text-sm text-muted sm:col-span-2">
                Phone Number
                <input value={address.phone} onChange={onChangeAddress("phone")} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              </label>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-ink">Shipping Address</h2>
              {savedAddresses.length > 0 && (
                <button type="button" onClick={clearAddressSelection} className="text-sm font-semibold text-brand">
                  Add New Address
                </button>
              )}
            </div>

            {!!savedAddresses.length && (
              <div className="mt-4 space-y-2">
                {savedAddresses.map((entry) => (
                  <label key={entry.id} className="flex cursor-pointer items-start gap-2 rounded-lg border border-slate-200 p-3 text-sm">
                    <input
                      type="radio"
                      className="mt-1 accent-brand"
                      checked={selectedAddressId === entry.id}
                      onChange={() => onSelectSavedAddress(entry.id)}
                    />
                    <span>
                      <strong>{entry.fullName}</strong> {entry.isDefault ? "(Default)" : ""}
                      <br />
                      {entry.line1}, {entry.city}, {entry.state}, {entry.postalCode}, {entry.country}
                      <br />
                      {entry.phone}
                    </span>
                  </label>
                ))}
              </div>
            )}

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="text-sm text-muted sm:col-span-2">
                Address Line 1
                <input value={address.line1} onChange={onChangeAddress("line1")} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              </label>
              <label className="text-sm text-muted sm:col-span-2">
                Address Line 2 (Optional)
                <input value={address.line2} onChange={onChangeAddress("line2")} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              </label>
              <label className="text-sm text-muted">
                City
                <input value={address.city} onChange={onChangeAddress("city")} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              </label>
              <label className="text-sm text-muted">
                District / State
                <input value={address.state} onChange={onChangeAddress("state")} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              </label>
              <label className="text-sm text-muted">
                Postal Code
                <input value={address.postalCode} onChange={onChangeAddress("postalCode")} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              </label>
              <label className="text-sm text-muted">
                Country
                <input value={address.country} onChange={onChangeAddress("country")} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              </label>
            </div>

            <div className="mt-4 flex items-center gap-2 text-sm text-muted">
              <input
                id="save-for-future"
                type="checkbox"
                checked={saveForFuture}
                onChange={(event) => setSaveForFuture(event.target.checked)}
                className="accent-brand"
              />
              <label htmlFor="save-for-future">Save this address for future checkout</label>
            </div>

            {saveForFuture && (
              <button
                type="button"
                onClick={persistAddressForFuture}
                disabled={savingAddress}
                className="mt-3 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-60"
              >
                {savingAddress ? "Saving..." : "Save Address Now"}
              </button>
            )}
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="text-lg font-semibold text-ink">Payment Method</h2>
            <div className="mt-4 space-y-3 text-sm">
              <label className="flex items-center gap-2">
                <input type="radio" className="accent-brand" checked={paymentMethod === "cod"} onChange={() => setPaymentMethod("cod")} />
                Cash on Delivery
              </label>
              <label className="flex items-center gap-2">
                <input type="radio" className="accent-brand" checked={paymentMethod === "card"} onChange={() => setPaymentMethod("card")} disabled={!stripeEnabled} />
                Card Payment
              </label>
              
            </div>

            {paymentMethod === "card" && stripeEnabled && (
              <div className="mt-4 rounded-lg border border-slate-300 p-3">
                <CardElement options={cardStyle} />
              </div>
            )}
          </div>
        </div>

        <aside className="h-fit rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="text-lg font-semibold text-ink">Order Summary</h2>

          <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <label className="block text-xs font-semibold uppercase tracking-wide text-muted">Coupon code</label>
            <div className="mt-2 flex gap-2">
              <input
                value={couponCodeInput}
                onChange={(event) => setCouponCodeInput(event.target.value.toUpperCase())}
                placeholder="Enter coupon code"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
              <button
                type="button"
                onClick={handleApplyCoupon}
                disabled={applyingCoupon}
                className="rounded-lg border border-brand px-3 py-2 text-sm font-semibold text-brand disabled:opacity-60"
              >
                {applyingCoupon ? "Applying..." : "Apply"}
              </button>
            </div>
            {appliedCoupon ? (
              <div className="mt-2 flex items-center justify-between gap-2 text-xs text-emerald-700">
                <span>
                  Applied {appliedCoupon.code} ({appliedCoupon.title})
                </span>
                <button type="button" onClick={removeCoupon} className="font-semibold text-rose-600">
                  Remove
                </button>
              </div>
            ) : null}
          </div>

          <div className="mt-4 space-y-3">
            {cartDetailedItems.map((item) => {
              const unitPrice = Number(item.unitPrice ?? 0);
              const listPrice = Number(item.listPrice ?? unitPrice);
              const unitDiscount = Number(item.unitDiscountAmount || 0);
              const unitShipping = Number(item.unitShippingPrice || 0);
              const discountPercentage = Number(item.discountPercentage || 0);
              return (
                <article key={item.productId} className="flex gap-3 border-b border-slate-100 pb-3">
                  <img
                    src={item.variation?.imageUrl || item.images?.[0] || item.image}
                    alt={item.name}
                    className="h-14 w-14 rounded-lg object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-sm font-semibold text-ink">{item.name}</p>
                    <p className="text-xs text-muted">Qty: {item.quantity}</p>
                    <p className="text-xs text-muted">
                      Item price: {formatMoney(unitPrice)} {unitDiscount > 0 ? `(discounted from ${formatMoney(listPrice)})` : ""}
                    </p>
                    {unitDiscount > 0 ? (
                      <p className="text-xs font-semibold text-rose-600">{discountPercentage}% OFF</p>
                    ) : null}
                    {item.promotionActive && item.promotion?.title ? (
                      <p className="text-xs font-medium text-emerald-700">Promotion: {item.promotion.title}</p>
                    ) : null}
                    <p className="text-xs text-muted">Shipping: {formatMoney(unitShipping)} each</p>
                    {unitDiscount > 0 ? <p className="text-xs text-emerald-700">Discount: {formatMoney(unitDiscount * Number(item.quantity || 0))}</p> : null}
                  </div>
                  <p className="text-sm font-semibold text-ink">{formatMoney(Number(item.lineTotal || item.subtotal || 0))}</p>
                </article>
              );
            })}
          </div>

          <div className="mt-4 space-y-2 border-t border-slate-200 pt-4 text-sm">
            <div className="flex justify-between"><span className="text-muted">Subtotal</span><span>{formatMoney(subtotalAmount)}</span></div>
            <div className="flex justify-between"><span className="text-muted">Shipping</span><span>{formatMoney(shippingAmount)}</span></div>
            <div className="flex justify-between"><span className="text-muted">Product Discount</span><span>- {formatMoney(Number(cartDiscountTotal || 0))}</span></div>
            <div className="flex justify-between"><span className="text-muted">Coupon Discount</span><span>- {formatMoney(couponDiscountAmount)}</span></div>
            <div className="flex justify-between text-base font-semibold"><span>Final Total</span><span className="text-brand-dark">{formatMoney(total)}</span></div>
          </div>

          <button
            type="button"
            onClick={placeOrder}
            disabled={placingOrder || loadingProfile}
            className="btn-primary mt-5 w-full justify-center disabled:cursor-not-allowed disabled:opacity-60"
          >
            {placingOrder ? "Placing Order..." : "Place Order"}
          </button>
        </aside>
      </div>
    </section>
  );
}

function CheckoutPage() {
  const stripeEnabled = Boolean(stripePromise);

  if (!stripePromise) {
    return (
      <Elements stripe={null}>
        <CheckoutInner stripeEnabled={false} />
      </Elements>
    );
  }

  return (
    <Elements stripe={stripePromise}>
      <CheckoutInner stripeEnabled={stripeEnabled} />
    </Elements>
  );
}

export default CheckoutPage;
