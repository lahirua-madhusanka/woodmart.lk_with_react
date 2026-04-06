import { Search, SlidersHorizontal } from "lucide-react";
import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import ProductGrid from "../components/products/ProductGrid";
import { useStore } from "../context/StoreContext";

function ShopPage() {
  const { loadingProducts, products } = useStore();
  const [params] = useSearchParams();
  const [search, setSearch] = useState(params.get("q") || "");
  const [category, setCategory] = useState("All");
  const [minRating, setMinRating] = useState(0);
  const [maxPrice, setMaxPrice] = useState(200000);
  const [sortBy, setSortBy] = useState("featured");
  const [visibleCount, setVisibleCount] = useState(6);

  const uniqueCategories = useMemo(
    () => ["All", ...new Set(products.map((item) => item.category))],
    [products]
  );

  const filtered = useMemo(() => {
    const lowered = search.trim().toLowerCase();

    const data = products
      .filter((item) => (category === "All" ? true : item.category === category))
      .filter((item) => Number(item.discountPrice || item.price) <= maxPrice)
      .filter((item) => item.rating >= minRating)
      .filter((item) =>
        lowered
          ? item.name.toLowerCase().includes(lowered) ||
            item.tags.join(" ").toLowerCase().includes(lowered)
          : true
      );

    if (sortBy === "priceAsc") {
      return [...data].sort(
        (a, b) => Number(a.discountPrice || a.price) - Number(b.discountPrice || b.price)
      );
    }
    if (sortBy === "priceDesc") {
      return [...data].sort(
        (a, b) => Number(b.discountPrice || b.price) - Number(a.discountPrice || a.price)
      );
    }
    if (sortBy === "rating") return [...data].sort((a, b) => b.rating - a.rating);
    if (sortBy === "new") {
      return [...data].sort(
        (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
      );
    }
    return data;
  }, [category, maxPrice, minRating, products, search, sortBy]);

  const visibleProducts = filtered.slice(0, visibleCount);

  return (
    <section className="container-pad py-10">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-brand">Shop</p>
          <h1 className="font-display text-3xl font-bold">All Products</h1>
        </div>
        <div className="text-sm text-muted">{filtered.length} products found</div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <aside className="h-fit space-y-5 rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-ink">
            <SlidersHorizontal size={15} /> Filters
          </h2>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold">Search</span>
            <span className="flex items-center rounded-lg border border-slate-300 px-3 py-2">
              <Search size={15} className="text-muted" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Find products"
                className="ml-2 w-full text-sm outline-none"
              />
            </span>
          </label>

          <div>
            <h3 className="mb-2 text-sm font-semibold">Category</h3>
            <div className="space-y-2">
              {uniqueCategories.map((entry) => (
                <label key={entry} className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="radio"
                    className="accent-brand"
                    checked={category === entry}
                    onChange={() => setCategory(entry)}
                  />
                  {entry}
                </label>
              ))}
            </div>
          </div>

          <div>
            <h3 className="mb-2 text-sm font-semibold">Price up to Rs. {Number(maxPrice).toLocaleString()}</h3>
            <input
              type="range"
              min={0}
              max={200000}
              step={500}
              value={maxPrice}
              onChange={(event) => setMaxPrice(Number(event.target.value))}
              className="w-full accent-brand"
            />
          </div>

          <div>
            <h3 className="mb-2 text-sm font-semibold">Minimum Rating</h3>
            <select
              value={minRating}
              onChange={(event) => setMinRating(Number(event.target.value))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none"
            >
              <option value={0}>All</option>
              <option value={4}>4+ stars</option>
              <option value={4.5}>4.5+ stars</option>
              <option value={4.8}>4.8+ stars</option>
            </select>
          </div>
        </aside>

        <div>
          <div className="mb-4 flex justify-end">
            <select
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none"
            >
              <option value="featured">Sort: Featured</option>
              <option value="new">Newest</option>
              <option value="priceAsc">Price: Low to High</option>
              <option value="priceDesc">Price: High to Low</option>
              <option value="rating">Top Rated</option>
            </select>
          </div>

          {loadingProducts ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-muted">
              Loading catalog...
            </div>
          ) : (
            <ProductGrid products={visibleProducts} />
          )}

          {visibleCount < filtered.length && (
            <div className="mt-8 text-center">
              <button
                onClick={() => setVisibleCount((count) => count + 6)}
                className="btn-secondary"
              >
                Load More
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export default ShopPage;