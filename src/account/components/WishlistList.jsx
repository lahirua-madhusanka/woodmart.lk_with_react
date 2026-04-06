import EmptyState from "./EmptyState";

function WishlistList({ items = [], onRemove, onMoveToCart }) {
  if (!items.length) {
    return <EmptyState title="Wishlist is empty" message="Save products to review them later." />;
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <article key={item._id || item.id} className="flex flex-col gap-3 rounded-xl border border-slate-200 p-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <img src={item.images?.[0] || item.image} alt={item.name} className="h-16 w-16 rounded-lg object-cover" />
            <div>
              <p className="font-semibold text-ink">{item.name}</p>
              <p className="text-sm text-muted">Rs. {Number(item.discountPrice || item.price || 0).toFixed(2)}</p>
            </div>
          </div>

          <div className="flex gap-2">
            <button type="button" onClick={() => onMoveToCart(item)} className="rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white">Move to cart</button>
            <button type="button" onClick={() => onRemove(item)} className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600">Remove</button>
          </div>
        </article>
      ))}
    </div>
  );
}

export default WishlistList;
