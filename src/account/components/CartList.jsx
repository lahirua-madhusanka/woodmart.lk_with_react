import EmptyState from "./EmptyState";

function CartList({ items = [], onQuantityChange, onRemove, onCheckout }) {
  const total = items.reduce((sum, item) => sum + Number(item.subtotal || 0), 0);

  if (!items.length) {
    return <EmptyState title="Cart is empty" message="Add products to your cart to continue checkout." />;
  }

  return (
    <div className="space-y-4">
      {items.map((item) => (
        <article key={item.productId || item._id || item.id} className="rounded-xl border border-slate-200 p-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <img src={item.variation?.imageUrl || item.images?.[0] || item.image} alt={item.name} className="h-16 w-16 rounded-lg object-cover" />
              <div>
                <p className="font-semibold text-ink">{item.name}</p>
                {item.variation?.name ? (
                  <p className="text-xs text-muted">Variation: {item.variation.name}</p>
                ) : null}
                <p className="text-sm text-muted">Rs. {Number(item.unitPrice || 0).toFixed(2)}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="number"
                min={1}
                value={item.quantity}
                onChange={(event) => onQuantityChange(item, Number(event.target.value || 1))}
                className="w-16 rounded-lg border border-slate-300 px-2 py-1 text-sm"
              />
              <p className="text-sm font-semibold text-ink">Rs. {Number(item.subtotal || 0).toFixed(2)}</p>
              <button type="button" onClick={() => onRemove(item)} className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600">Remove</button>
            </div>
          </div>
        </article>
      ))}

      <div className="flex flex-col items-start justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center">
        <p className="text-lg font-semibold text-ink">Total: Rs. {total.toFixed(2)}</p>
        <button type="button" onClick={onCheckout} className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white">Proceed to checkout</button>
      </div>
    </div>
  );
}

export default CartList;
