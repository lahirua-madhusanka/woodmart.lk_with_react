import { HeartOff, ShoppingBag } from "lucide-react";
import { Link } from "react-router-dom";
import { useStore } from "../context/StoreContext";
import { getProductPricing } from "../utils/pricing";

function WishlistPage() {
  const { getProductId, wishlistItems, toggleWishlist, moveWishlistToCart } = useStore();

  return (
    <section className="container-pad py-10">
      <h1 className="font-display text-3xl font-bold">Wishlist</h1>

      {wishlistItems.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <p className="text-muted">No saved products yet.</p>
          <Link to="/shop" className="btn-primary mt-4">Browse products</Link>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {wishlistItems.map((item) => (
            <article key={getProductId(item)} className="grid gap-4 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-[120px_1fr]">
              <img src={(item.images && item.images[0]) || item.image} alt={item.name} className="h-28 w-full rounded-lg object-cover" />
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-brand">{item.category}</p>
                <h2 className="text-lg font-semibold">{item.name}</h2>
                <p className="mt-1 text-sm text-muted">Rs. {Number(getProductPricing(item).finalPrice)}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    onClick={() => moveWishlistToCart(getProductId(item))}
                    className="inline-flex items-center gap-2 rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-white"
                  >
                    <ShoppingBag size={15} /> Move to Cart
                  </button>
                  <button
                    onClick={() => toggleWishlist(getProductId(item))}
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700"
                  >
                    <HeartOff size={15} /> Remove
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export default WishlistPage;