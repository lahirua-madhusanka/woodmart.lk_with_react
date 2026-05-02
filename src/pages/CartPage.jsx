import { Minus, Plus, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { useStorefrontSettings } from "../context/StorefrontSettingsContext";
import { useStore } from "../context/StoreContext";

function CartPage() {
  const {
    cartDetailedItems,
    cartSubtotal,
    cartShippingTotal,
    updateCartItem,
    removeFromCart,
  } = useStore();
  const { settings, formatMoney } = useStorefrontSettings();

  const freeShippingThreshold = Number(settings.freeShippingThreshold || 0);
  const shipping = Number(cartShippingTotal || 0);
  const total = cartSubtotal + shipping;

  return (
    <section className="container-pad py-10">
      <h1 className="font-display text-3xl font-bold">Your Cart</h1>

      {cartDetailedItems.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <p className="text-muted">Your cart is currently empty.</p>
          <Link to="/shop" className="btn-primary mt-4">Continue shopping</Link>
        </div>
      ) : (
        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="space-y-4">
            {cartDetailedItems.map((item) => (
              <article
                key={item.productId}
                className="grid gap-4 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-[100px_1fr_auto]"
              >
                <img
                  src={item.variation?.imageUrl || (item.images && item.images[0]) || item.image}
                  alt={item.name}
                  className="h-24 w-full rounded-lg object-cover"
                />

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-brand">{item.category}</p>
                  <h2 className="font-semibold">{item.name}</h2>
                  {item.variation?.name ? (
                    <p className="mt-1 text-xs text-muted">Variation: {item.variation.name}</p>
                  ) : null}
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-sm">
                    <span className="font-semibold text-ink">{formatMoney(Number(item.unitPrice || 0))} each</span>
                    {Number(item.unitDiscountAmount || 0) > 0 ? (
                      <span className="text-muted line-through">{formatMoney(Number(item.listPrice || 0))}</span>
                    ) : null}
                    {Number(item.unitDiscountAmount || 0) > 0 ? (
                      <span className="rounded-full bg-rose-600 px-2 py-0.5 text-[10px] font-semibold text-white">
                        {Number(item.discountPercentage || 0)}% OFF
                      </span>
                    ) : null}
                  </div>
                  {item.promotionActive && item.promotion?.title ? (
                    <p className="mt-1 text-xs font-medium text-emerald-700">{item.promotion.title}</p>
                  ) : null}
                  <div className="mt-3 inline-flex items-center rounded-lg border border-slate-300">
                    <button
                      onClick={() => updateCartItem(item.productId, item.variationId, item.quantity - 1)}
                      className="p-2"
                    >
                      <Minus size={15} />
                    </button>
                    <span className="px-3 text-sm font-semibold">{item.quantity}</span>
                    <button
                      onClick={() => updateCartItem(item.productId, item.variationId, item.quantity + 1)}
                      className="p-2"
                    >
                      <Plus size={15} />
                    </button>
                  </div>
                </div>

                <div className="flex flex-col items-end justify-between">
                  <button
                    onClick={() => removeFromCart(item.productId, item.variationId)}
                    className="rounded-md p-2 text-slate-500 transition hover:bg-slate-100 hover:text-red-500"
                    aria-label="Remove item"
                  >
                    <Trash2 size={16} />
                  </button>
                  <p className="text-lg font-bold text-brand-dark">{formatMoney(item.subtotal)}</p>
                </div>
              </article>
            ))}
          </div>

          <aside className="h-fit rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="text-lg font-semibold">Cart Total</h2>
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted">Subtotal</span>
                <span className="font-semibold">{formatMoney(cartSubtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Shipping</span>
                <span className="font-semibold">{formatMoney(shipping)}</span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-2 text-base">
                <span className="font-semibold">Total</span>
                <span className="font-bold text-brand-dark">{formatMoney(total)}</span>
              </div>
            </div>

          
            

            <Link to="/checkout" className="btn-primary mt-5 w-full">
              Proceed to Checkout
            </Link>
          </aside>
        </div>
      )}
    </section>
  );
}

export default CartPage;