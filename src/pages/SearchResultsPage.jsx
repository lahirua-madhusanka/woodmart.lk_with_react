import { Search } from "lucide-react";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import ProductGrid from "../components/products/ProductGrid";
import { searchProductsApi } from "../services/productService";
import { getApiErrorMessage } from "../services/apiClient";
import { toast } from "react-toastify";

function SearchResultsPage() {
  const [params] = useSearchParams();
  const query = params.get("q") || "";

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    if (!query.trim()) {
      setProducts([]);
      setSearched(false);
      return;
    }

    const fetchResults = async () => {
      setLoading(true);
      setSearched(true);
      try {
        const data = await searchProductsApi(query);
        setProducts(Array.isArray(data) ? data : []);
      } catch (error) {
        toast.error(getApiErrorMessage(error));
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [query]);

  return (
    <section className="container-pad py-10">
      <div className="mb-10">
        <p className="text-xs font-semibold uppercase tracking-wider text-brand">Search Results</p>
        <h1 className="font-display text-3xl font-bold text-ink mb-6">
          {query ? `Results for "${query}"` : "Search Products"}
        </h1>
      </div>

      {loading && (
        <div className="flex justify-center items-center py-20">
          <div className="text-center">
            <div className="inline-block">
              <div className="h-8 w-8 border-4 border-slate-200 border-t-brand rounded-full animate-spin"></div>
            </div>
            <p className="mt-2 text-muted text-sm">Searching products...</p>
          </div>
        </div>
      )}

      {!loading && searched && products.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Search size={48} className="text-slate-300 mb-4" />
          <h2 className="text-xl font-semibold text-ink mb-2">No products found</h2>
          <p className="text-muted mb-6 max-w-sm">
            We couldn't find any products matching "{query}". Try searching with different keywords or browse our{" "}
            <a href="/shop" className="text-brand font-semibold hover:underline">
              full shop
            </a>
            .
          </p>
        </div>
      )}

      {!loading && products.length > 0 && (
        <div>
          <p className="mb-6 text-sm text-muted">{products.length} products found</p>
          <ProductGrid products={products} />
        </div>
      )}
    </section>
  );
}

export default SearchResultsPage;
