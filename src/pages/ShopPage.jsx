import { Search, SlidersHorizontal } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import ProductCard from "../components/products/ProductCard";
import { useStore } from "../context/StoreContext";
import { getProductsApi } from "../services/productService";
import { getProductMinPrice } from "../utils/pricing";


const TOP_SECTION_PRODUCT_COUNT = 4;
const INITIAL_VISIBLE_PRODUCTS = 24;
const LOAD_MORE_STEP = 12;

function ShopPage() {
  const { products } = useStore();
  const [params, setParams] = useSearchParams();
  const urlCategory = (params.get("category") || "").trim();
  const urlQuery = (params.get("q") || "").trim();

  const [search, setSearch] = useState(urlQuery);
  const [category, setCategory] = useState(urlCategory || "All");
  const [minRating, setMinRating] = useState(0);
  const [maxPrice, setMaxPrice] = useState(200000);
  const [sortBy, setSortBy] = useState("featured");
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_PRODUCTS);
  const [catalog, setCatalog] = useState([]);
  const [loadingCatalog, setLoadingCatalog] = useState(true);

  useEffect(() => {
    setSearch(urlQuery);
    setCategory(urlCategory || "All");
    setVisibleCount(INITIAL_VISIBLE_PRODUCTS);
  }, [urlCategory, urlQuery]);

  useEffect(() => {
    let ignore = false;

    const loadProducts = async () => {
      setLoadingCatalog(true);
      try {
        const data = await getProductsApi({
          category: urlCategory || undefined,
        });

        if (!ignore) {
          setCatalog(Array.isArray(data) ? data : []);
        }
      } catch {
        if (!ignore) {
          setCatalog([]);
        }
      } finally {
        if (!ignore) {
          setLoadingCatalog(false);
        }
      }
    };

    loadProducts();

    return () => {
      ignore = true;
    };
  }, [urlCategory, urlQuery]);

  const updateQueryParam = (key, value) => {
    const nextParams = new URLSearchParams(params);
    if (value == null || value === "" || value === "All") {
      nextParams.delete(key);
    } else {
      nextParams.set(key, value);
    }
    setParams(nextParams, { replace: true });
  };

  const uniqueCategories = useMemo(
    () => ["All", ...new Set((products || []).map((item) => item.category).filter(Boolean))],
    [products]
  );

  const filtered = useMemo(() => {
    const lowered = search.trim().toLowerCase();

    const data = catalog
      .filter((item) => (category === "All" ? true : item.category === category))
      .filter((item) => Number(getProductMinPrice(item)) <= maxPrice)
      .filter((item) => item.rating >= minRating)
      .filter((item) =>
        lowered
          ? [item.name, item.category, item.description, Array.isArray(item.tags) ? item.tags.join(" ") : ""]
              .join(" ")
              .toLowerCase()
              .includes(lowered)
          : true
      );

    if (sortBy === "priceAsc") {
      return [...data].sort(
        (a, b) => Number(getProductMinPrice(a)) - Number(getProductMinPrice(b))
      );
    }
    if (sortBy === "priceDesc") {
      return [...data].sort(
        (a, b) => Number(getProductMinPrice(b)) - Number(getProductMinPrice(a))
      );
    }
    if (sortBy === "rating") return [...data].sort((a, b) => b.rating - a.rating);
    if (sortBy === "new") {
      return [...data].sort(
        (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
      );
    }
    return data;
  }, [catalog, category, maxPrice, minRating, search, sortBy]);

  const visibleProducts = filtered.slice(0, visibleCount);
  const topSectionProducts = visibleProducts.slice(0, TOP_SECTION_PRODUCT_COUNT);
  const remainingProducts = visibleProducts.slice(TOP_SECTION_PRODUCT_COUNT);

  const onCategoryChange = (nextCategory) => {
    setCategory(nextCategory);
    setVisibleCount(INITIAL_VISIBLE_PRODUCTS);
    updateQueryParam("category", nextCategory);
  };

  const onSearchChange = (value) => {
    setSearch(value);
    setVisibleCount(INITIAL_VISIBLE_PRODUCTS);
  };

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
                type="search"
                value={search}
                onChange={(event) => onSearchChange(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                  }
                }}
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
                    onChange={() => onCategoryChange(entry)}
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

          {loadingCatalog ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-muted">
              Loading catalog...
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-muted">
              No products found.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {topSectionProducts.map((product) => (
                <ProductCard key={product._id || product.id} product={product} />
              ))}
            </div>
          )}
        </div>

        {!loadingCatalog && filtered.length > 0 && remainingProducts.length > 0 ? (
          <div className="lg:col-span-2">
            <div className="grid grid-cols-2 gap-3 sm:gap-6 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
              {remainingProducts.map((product) => (
                <ProductCard key={product._id || product.id} product={product} />
              ))}
            </div>
          </div>
        ) : null}

        {visibleCount < filtered.length && (
          <div className="mt-2 text-center lg:col-span-2">
            <button
              onClick={() => setVisibleCount((count) => count + LOAD_MORE_STEP)}
              className="btn-secondary"
            >
              Load More
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

export default ShopPage;