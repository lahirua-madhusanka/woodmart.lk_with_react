import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ShoppingCart, Sparkles } from "lucide-react";
import StarRatingDisplay from "../components/common/StarRatingDisplay";
import { useStorefrontSettings } from "../context/StorefrontSettingsContext";
import { useStore } from "../context/StoreContext";
import { getApiErrorMessage } from "../services/apiClient";
import { getPromotionsApi } from "../services/promotionService";

function PromotionsPage() {
  const { addToCart } = useStore();
  const { formatMoney } = useStorefrontSettings();
  const navigate = useNavigate();
  const [promotions, setPromotions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let ignore = false;

    const load = async () => {
      setLoading(true);
      try {
        const data = await getPromotionsApi();
        if (!ignore) {
          setPromotions(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        if (!ignore) {
          setError(getApiErrorMessage(err));
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      ignore = true;
    };
  }, []);

  return (
    <section className="container-pad py-10">
      <div className="rounded-2xl border border-slate-200 bg-gradient-to-r from-[#0959a4] to-[#0b3f76] p-8 text-white">
        <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-white/80">
          <Sparkles size={14} /> Special Promotions
        </p>
        <h1 className="mt-2 font-display text-4xl font-bold">Limited-time deals</h1>
        <p className="mt-3 max-w-2xl text-sm text-white/90">
          Explore active campaigns with curated products and exclusive discounts.
        </p>
      </div>

      {loading ? (
        <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-muted">Loading promotions...</div>
      ) : error ? (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">{error}</div>
      ) : promotions.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-muted">No active promotions available.</div>
      ) : (
        <div className="mt-6 space-y-8">
          {promotions.map((promotion) => (
            <article key={promotion.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-2xl font-semibold text-ink">{promotion.title}</h2>
                  {promotion.slug ? (
                    <Link to={`/promotion/${promotion.slug}`} className="text-sm font-semibold text-brand hover:underline">
                      Open Promotion Page
                    </Link>
                  ) : null}
                </div>
                <p className="mt-2 text-sm text-muted">
                  {promotion.description || "Special promotion with limited-time pricing."}
                </p>
                <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-brand">
                  {Number(promotion.productCount || 0)} products in this promotion
                </p>
              </div>

              {Array.isArray(promotion.products) && promotion.products.length > 0 ? (
                <div className="grid grid-cols-2 gap-3 sm:gap-6 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
                  {promotion.products.map((item) => {
                    const product = item.product;
                    if (!product) return null;

                    return (
                      <article
                        key={`${promotion.id}-${item.id}-${item.productId}`}
                        className="group overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:shadow-premium"
                      >
                        <div className="relative overflow-hidden">
                          <Link to={`/product/${product._id || product.id}`}>
                            <img
                              src={product.images?.[0] || product.image}
                              alt={product.name}
                              className="h-64 w-full object-cover transition duration-500 group-hover:scale-105"
                              loading="lazy"
                            />
                          </Link>
                          <span className="absolute left-3 top-3 rounded-full bg-rose-600 px-3 py-1 text-xs font-bold text-white">
                            {Number(item.discountPercentage || 0)}% OFF
                          </span>
                        </div>

                        <div className="space-y-3 p-4">
                          <p className="text-xs font-semibold uppercase tracking-wide text-brand">{product.category}</p>
                          <Link to={`/product/${product._id || product.id}`} className="line-clamp-2 text-lg font-semibold text-ink">
                            {product.name}
                          </Link>

                          <StarRatingDisplay
                            rating={Number(product.rating || 0)}
                            reviewCount={Array.isArray(product.reviews) ? product.reviews.length : Number(product.reviewCount || 0)}
                            showValue
                            size={14}
                          />

                          <div className="flex items-center gap-2">
                            <span className="text-lg font-bold text-brand-dark">{formatMoney(item.discountedPrice)}</span>
                            <span className="text-sm text-muted line-through">{formatMoney(item.originalPrice)}</span>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              const productId = product._id || product.id;
                              if (product?.variations?.length) {
                                navigate(`/product/${productId}`);
                                return;
                              }
                              addToCart(productId, 1);
                            }}
                            className="btn-primary w-full justify-center gap-2 py-2.5"
                          >
                            <ShoppingCart size={15} /> Add to Cart
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-muted">
                  No products assigned to this promotion yet.
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export default PromotionsPage;
