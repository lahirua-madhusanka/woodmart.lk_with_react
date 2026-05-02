import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ShoppingCart } from "lucide-react";
import StarRatingDisplay from "../components/common/StarRatingDisplay";
import { useStorefrontSettings } from "../context/StorefrontSettingsContext";
import { useStore } from "../context/StoreContext";
import { getApiErrorMessage } from "../services/apiClient";
import { getPromotionBySlugApi } from "../services/promotionService";

function PromotionDetailsPage() {
  const { slug } = useParams();
  const { addToCart } = useStore();
  const { formatMoney } = useStorefrontSettings();
  const navigate = useNavigate();
  const [promotion, setPromotion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let ignore = false;

    const load = async () => {
      setLoading(true);
      try {
        const data = await getPromotionBySlugApi(slug);
        if (!ignore) {
          setPromotion(data || null);
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
  }, [slug]);

  const products = useMemo(() => promotion?.products || [], [promotion]);

  if (loading) {
    return (
      <section className="container-pad py-10">
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-muted">Loading promotion...</div>
      </section>
    );
  }

  if (error || !promotion) {
    return (
      <section className="container-pad py-10">
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <p className="text-lg font-semibold text-ink">Promotion not available</p>
          <p className="mt-2 text-sm text-muted">{error || "This promotion is inactive or unavailable."}</p>
          <Link to="/shop" className="btn-primary mt-4 inline-flex">Back to Shop</Link>
        </div>
      </section>
    );
  }

  return (
    <section className="container-pad py-10">
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand">Promotion</p>
        <h1 className="mt-2 font-display text-4xl font-bold text-ink">{promotion.title}</h1>
        {promotion.description ? (
          <p className="mt-3 max-w-3xl text-sm text-muted">{promotion.description}</p>
        ) : null}
      </div>

      {products.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-muted">No products assigned to this promotion yet.</div>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-6 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
          {products.map((item) => {
            const product = item.product;
            if (!product) return null;
            return (
              <article key={`${item.id}-${item.productId}`} className="group overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:shadow-premium">
                <div className="relative overflow-hidden">
                  <Link to={`/product/${product._id || product.id}`}>
                    <img src={product.images?.[0] || product.image} alt={product.name} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" loading="lazy" />
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
      )}
    </section>
  );
}

export default PromotionDetailsPage;
