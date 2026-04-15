import { Heart, Minus, Plus, ShieldCheck, ShoppingBag, Truck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import DOMPurify from "dompurify";
import StarRating from "../components/common/StarRating";
import StarRatingDisplay from "../components/common/StarRatingDisplay";
import ProductGrid from "../components/products/ProductGrid";
import { useStore } from "../context/StoreContext";
import { useAuth } from "../context/AuthContext";
import { useStorefrontSettings } from "../context/StorefrontSettingsContext";
import { getApiErrorMessage } from "../services/apiClient";
import { getProductPricing } from "../utils/pricing";
import {
  addProductReviewApi,
  getProductByIdApi,
  getReviewEligibilityApi,
  updateProductReviewApi,
} from "../services/productService";

const DESCRIPTION_SANITIZE_OPTIONS = {
  ALLOWED_TAGS: ["p", "br", "ul", "ol", "li", "strong", "b", "em", "i", "u", "a", "h1", "h2", "h3", "h4", "h5", "h6", "blockquote", "code", "pre", "span"],
  ALLOWED_ATTR: ["href", "target", "rel", "title"],
};

const escapeHtml = (value) =>
  String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const isLikelyHtml = (value) => /<[^>]+>/.test(String(value || ""));

const renderSanitizedDescription = (value) => {
  const rawValue = String(value || "");
  const content = isLikelyHtml(rawValue)
    ? rawValue
    : escapeHtml(rawValue).replace(/\r\n|\r|\n/g, "<br />");

  return {
    __html: DOMPurify.sanitize(content, DESCRIPTION_SANITIZE_OPTIONS),
  };
};

function ProductDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { addToCart, getProductId, loadingProducts, products, toggleWishlist, wishlist } = useStore();
  const { isAuthenticated, user } = useAuth();
  const { settings, formatMoney } = useStorefrontSettings();
  const [remoteProduct, setRemoteProduct] = useState(null);
  const [loadingRemoteProduct, setLoadingRemoteProduct] = useState(false);
  const productFromStore = products.find((item) => getProductId(item) === String(id));
  const product = productFromStore || remoteProduct;
  const [selectedImage, setSelectedImage] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState("description");
  const [review, setReview] = useState({ rating: 5, comment: "" });
  const [submittingReview, setSubmittingReview] = useState(false);
  const [localReviews, setLocalReviews] = useState([]);
  const [reviewEligibility, setReviewEligibility] = useState({
    eligible: false,
    canReview: false,
    canEdit: false,
    message: "Only verified buyers can review this product",
    existingReview: null,
  });
  const [loadingEligibility, setLoadingEligibility] = useState(false);

  useEffect(() => {
    let ignore = false;

    const loadProduct = async () => {
      if (productFromStore || loadingProducts) return;
      setLoadingRemoteProduct(true);
      try {
        const data = await getProductByIdApi(id);
        if (!ignore) {
          setRemoteProduct(data || null);
        }
      } catch {
        if (!ignore) {
          setRemoteProduct(null);
        }
      } finally {
        if (!ignore) {
          setLoadingRemoteProduct(false);
        }
      }
    };

    loadProduct();
    return () => {
      ignore = true;
    };
  }, [id, loadingProducts, productFromStore]);

  const gallery = useMemo(() => {
    const images = product?.images || product?.gallery || [];
    if (images.length) return images;
    return product?.image ? [product.image] : [];
  }, [product]);

  const productId = product ? getProductId(product) : "";
  const stockValue = Number(product?.stock ?? product?.countInStock ?? -1);
  const hasStockLimit = Number.isFinite(stockValue) && stockValue >= 0;
  const inStock = !hasStockLimit || stockValue > 0;
  const maxQuantity = hasStockLimit && stockValue > 0 ? stockValue : 99;
  const brand = product?.brand || settings.storeName;
  const sku = product?.sku || "Not specified";

  useEffect(() => {
    if (gallery.length) {
      setSelectedImage(gallery[0]);
      setQuantity(1);
    }
  }, [gallery, productId]);

  useEffect(() => {
    setLocalReviews(Array.isArray(product?.reviews) ? product.reviews : []);
  }, [product]);

  useEffect(() => {
    let ignore = false;

    const loadEligibility = async () => {
      if (!isAuthenticated || !productId) {
        if (!ignore) {
          setReviewEligibility({
            eligible: false,
            canReview: false,
            canEdit: false,
            message: "Only verified buyers can review this product",
            existingReview: null,
          });
        }
        return;
      }

      setLoadingEligibility(true);
      try {
        const data = await getReviewEligibilityApi(productId);
        if (!ignore) {
          setReviewEligibility({
            eligible: Boolean(data?.eligible),
            canReview: Boolean(data?.canReview),
            canEdit: Boolean(data?.canEdit),
            message: data?.message || "Only verified buyers can review this product",
            existingReview: data?.existingReview || null,
          });

          if (data?.existingReview) {
            setReview({
              rating: Number(data.existingReview.rating || 5),
              comment: data.existingReview.comment || "",
            });
          } else {
            setReview({ rating: 5, comment: "" });
          }
        }
      } catch (error) {
        if (!ignore) {
          setReviewEligibility({
            eligible: false,
            canReview: false,
            canEdit: false,
            message: getApiErrorMessage(error),
            existingReview: null,
          });
        }
      } finally {
        if (!ignore) {
          setLoadingEligibility(false);
        }
      }
    };

    loadEligibility();

    return () => {
      ignore = true;
    };
  }, [isAuthenticated, productId]);

  const related = useMemo(() => {
    if (!product) return [];
    return products
      .filter(
        (item) =>
          item.category === product.category && getProductId(item) !== getProductId(product)
      )
      .slice(0, 4);
  }, [getProductId, product, products]);

  const similar = useMemo(() => {
    if (!product) return [];
    return products
      .filter((item) => getProductId(item) !== getProductId(product))
      .filter(
        (item) =>
          (brand ? item.brand === brand : true) ||
          Math.abs(Number(item.rating || 0) - Number(product.rating || 0)) < 0.4
      )
      .slice(0, 4);
  }, [brand, getProductId, product, products]);

  const ratingSummary = useMemo(() => {
    if (localReviews.length) {
      const average =
        localReviews.reduce((sum, entry) => sum + Number(entry.rating || 0), 0) /
        localReviews.length;
      return Number(average.toFixed(1));
    }
    return Number(product?.rating || 0).toFixed(1);
  }, [localReviews, product?.rating]);

  const reviewBuckets = useMemo(() => {
    const buckets = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    for (const entry of localReviews) {
      const rounded = Math.max(1, Math.min(5, Math.round(Number(entry.rating || 0))));
      buckets[rounded] += 1;
    }
    return buckets;
  }, [localReviews]);

  if (loadingProducts || loadingRemoteProduct) {
    return (
      <section className="container-pad py-16">
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-muted">
          Loading product details...
        </div>
      </section>
    );
  }

  if (!product) {
    return (
      <section className="container-pad py-16">
        <h1 className="font-display text-3xl font-bold">Product not found</h1>
        <Link to="/shop" className="mt-5 inline-flex text-brand">
          Return to Shop
        </Link>
      </section>
    );
  }

  const inWishlist = wishlist.includes(productId);
  const pricing = getProductPricing(product || {});
  const unitPrice = Number(pricing.finalPrice || 0);
  const regularPrice = Number(pricing.originalPrice || unitPrice);
  const hasDiscount = Boolean(pricing.hasDiscount);
  const tags = Array.isArray(product.tags) ? product.tags : [];

  const onDecreaseQuantity = () => {
    setQuantity((value) => Math.max(1, value - 1));
  };

  const onIncreaseQuantity = () => {
    setQuantity((value) => Math.min(maxQuantity, value + 1));
  };

  const onManualQuantityChange = (event) => {
    const parsed = Number(event.target.value || 1);
    if (!Number.isFinite(parsed)) {
      setQuantity(1);
      return;
    }
    setQuantity(Math.max(1, Math.min(maxQuantity, parsed)));
  };

  const onAddToCart = async () => {
    if (!inStock) {
      toast.error("This product is currently out of stock");
      return;
    }
    await addToCart(productId, quantity);
  };

  const onBuyNow = async () => {
    if (!isAuthenticated) {
      navigate("/auth", { replace: true, state: { from: location.pathname } });
      return;
    }

    if (!inStock) {
      toast.error("This product is currently out of stock");
      return;
    }

    await addToCart(productId, quantity);
    navigate("/checkout");
  };

  const onSubmitReview = async (event) => {
    event.preventDefault();
    if (!isAuthenticated) {
      toast.info("Please sign in to review this product");
      return;
    }

    if (!reviewEligibility.eligible) {
      toast.error("You can only review products you have purchased and received.");
      return;
    }

    if (!String(review.comment || "").trim()) {
      toast.error("Please add a review comment");
      return;
    }

    setSubmittingReview(true);
    try {
      const payload = {
        rating: Number(review.rating || 0),
        comment: String(review.comment || "").trim(),
      };
      const response = reviewEligibility.canEdit
        ? await updateProductReviewApi(productId, payload)
        : await addProductReviewApi(productId, payload);

      const returnedReview = response?.review;
      if (returnedReview) {
        setLocalReviews((prev) => {
          const otherReviews = prev.filter((entry) => String(entry.user || "") !== String(user?._id || ""));
          return [returnedReview, ...otherReviews];
        });
      }

      setReviewEligibility((prev) => ({
        ...prev,
        canReview: false,
        canEdit: true,
        existingReview: returnedReview || prev.existingReview,
        message: "You already reviewed this product. You can edit your review.",
      }));

      toast.success(reviewEligibility.canEdit ? "Review updated" : "Review submitted");
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setSubmittingReview(false);
    }
  };

  return (
    <section className="container-pad py-10">
      <div className="mb-6 text-sm text-muted">
        <Link to="/" className="hover:text-brand">Home</Link> / <Link to="/shop" className="hover:text-brand">Shop</Link> / {product.name}
      </div>

      <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
        <div>
          <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <img src={selectedImage} alt={product.name} className="w-full h-full object-cover" />
            {!inStock && (
              <span className="absolute left-4 top-4 rounded-full bg-red-600 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white">
                Out of stock
              </span>
            )}
          </div>
          <div className="mt-3 grid grid-cols-4 gap-3 sm:grid-cols-5">
           {gallery.map((image) => (
              <button
                key={image}
                onClick={() => setSelectedImage(image)}
                className={`border ${
                  image === selectedImage ? "border-brand" : "border-slate-200"
                }`}
              >
                <img
                  src={image}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-brand">
            {product.category}
          </p>
          <h1 className="mt-2 font-display text-4xl font-bold">{product.name}</h1>
          <div className="mt-3">
            <StarRatingDisplay
              rating={ratingSummary}
              reviewCount={localReviews.length || 0}
              showValue
              size={16}
            />
          </div>

          <div className="mt-4 flex items-center gap-3">
            <span className="text-3xl font-bold text-brand-dark">{formatMoney(unitPrice)}</span>
            {hasDiscount && (
              <span className="text-lg text-muted line-through">{formatMoney(regularPrice)}</span>
            )}
            {hasDiscount ? (
              <span className="rounded-full bg-rose-600 px-2.5 py-1 text-xs font-semibold text-white">
                {Number(pricing.discountPercentage || 0)}% OFF
              </span>
            ) : null}
            {!hasDiscount && product.oldPrice && (
              <span className="text-lg text-muted line-through">{formatMoney(Number(product.oldPrice))}</span>
            )}
          </div>

          {pricing.promotionActive && pricing.promotion?.title ? (
            <p className="mt-2 text-sm font-medium text-emerald-700">
              Promotion applied: {pricing.promotion.title}
            </p>
          ) : null}

          <div className="mt-5 flex flex-wrap items-center gap-2 text-xs">
            <span className={`rounded-full px-2 py-1 font-semibold ${inStock ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
              {inStock ? "In stock" : "Out of stock"}
            </span>
            {hasStockLimit && inStock ? (
              <span className="rounded-full bg-slate-100 px-2 py-1 font-semibold text-slate-700">
                {stockValue} available
              </span>
            ) : null}
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-[auto_1fr_1fr]">
            <div className="inline-flex items-center rounded-lg border border-slate-300 bg-white">
              <button onClick={onDecreaseQuantity} className="p-3">
                <Minus size={16} />
              </button>
              <input
                type="number"
                min={1}
                max={maxQuantity}
                value={quantity}
                onChange={onManualQuantityChange}
                className="w-14 border-x border-slate-200 bg-transparent px-2 py-2 text-center text-sm font-semibold outline-none"
              />
              <button onClick={onIncreaseQuantity} className="p-3">
                <Plus size={16} />
              </button>
            </div>

            <button onClick={onAddToCart} disabled={!inStock} className="btn-primary disabled:cursor-not-allowed disabled:opacity-60">
              Add to Cart
            </button>

            <button onClick={onBuyNow} disabled={!inStock} className="rounded-lg bg-ink px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60">
              Buy Now
            </button>
          </div>

          <div className="mt-3">
            <button
              onClick={() => toggleWishlist(productId)}
              className={`inline-flex items-center gap-2 rounded-lg border px-4 py-3 text-sm font-semibold ${
                inWishlist
                  ? "border-brand bg-brand text-white"
                  : "border-slate-300 text-slate-700 hover:border-brand hover:text-brand"
              }`}
            >
              <Heart size={16} /> Add to Wishlist
            </button>
          </div>

          <div className="mt-8 grid gap-3 text-sm sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="font-semibold text-ink">Delivery</p>
              <p className="mt-1 inline-flex items-center gap-2 text-muted"><Truck size={14} /> Islandwide shipping available</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="font-semibold text-ink">Guarantee</p>
              <p className="mt-1 inline-flex items-center gap-2 text-muted"><ShieldCheck size={14} /> Quality checked with warranty support</p>
            </div>
          </div>

          <div className="mt-4 space-y-2 rounded-xl border border-slate-200 bg-white p-4 text-sm">
            <p><span className="font-semibold">SKU:</span> {sku}</p>
            <p><span className="font-semibold">Category:</span> {product.category || "Uncategorized"}</p>
            <p><span className="font-semibold">Brand:</span> {brand}</p>
            <p><span className="font-semibold">Stock:</span> {inStock ? (hasStockLimit ? `${stockValue} items` : "Available") : "Out of stock"}</p>
            {!!tags.length && <p><span className="font-semibold">Tags:</span> {tags.join(", ")}</p>}
          </div>
        </div>
      </div>

      <div className="mt-12 rounded-xl border border-slate-200 bg-white p-6">
        <div className="mb-4 flex flex-wrap gap-2 border-b border-slate-200 pb-3">
          <button
            onClick={() => setActiveTab("description")}
            className={`rounded-lg px-3 py-2 text-sm font-semibold ${
              activeTab === "description"
                ? "bg-brand text-white"
                : "text-muted hover:bg-slate-100"
            }`}
          >
            Description
          </button>
          <button
            onClick={() => setActiveTab("additional")}
            className={`rounded-lg px-3 py-2 text-sm font-semibold ${
              activeTab === "additional"
                ? "bg-brand text-white"
                : "text-muted hover:bg-slate-100"
            }`}
          >
            Additional Information
          </button>
          <button
            onClick={() => setActiveTab("reviews")}
            className={`rounded-lg px-3 py-2 text-sm font-semibold ${
              activeTab === "reviews"
                ? "bg-brand text-white"
                : "text-muted hover:bg-slate-100"
            }`}
          >
            Reviews
          </button>
        </div>
        {activeTab === "description" ? (
          <div
            className="text-sm leading-relaxed text-muted prose prose-slate max-w-none"
            dangerouslySetInnerHTML={renderSanitizedDescription(product.description)}
          />
        ) : activeTab === "additional" ? (
          <div className="grid gap-3 text-sm text-muted sm:grid-cols-2">
            <div className="rounded-lg bg-slate-50 p-3"><span className="font-semibold text-ink">SKU:</span> {sku}</div>
            <div className="rounded-lg bg-slate-50 p-3"><span className="font-semibold text-ink">Category:</span> {product.category || "Uncategorized"}</div>
            <div className="rounded-lg bg-slate-50 p-3"><span className="font-semibold text-ink">Brand:</span> {brand}</div>
            <div className="rounded-lg bg-slate-50 p-3"><span className="font-semibold text-ink">Stock:</span> {inStock ? (hasStockLimit ? `${stockValue} items` : "Available") : "Out of stock"}</div>
          </div>
        ) : (
          <div className="space-y-4 text-sm text-muted">
            <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
              <div className="rounded-lg bg-slate-50 p-4">
                <p className="text-4xl font-bold text-ink">{ratingSummary}</p>
                <p className="text-xs uppercase tracking-wide">Based on {localReviews.length || 0} review(s)</p>
                <div className="mt-3 space-y-1 text-xs">
                  {[5, 4, 3, 2, 1].map((value) => (
                    <div key={value} className="flex items-center justify-between">
                      <span>{value} star</span>
                      <span>{reviewBuckets[value]}</span>
                    </div>
                  ))}
                </div>
              </div>

              {loadingEligibility ? (
                <div className="space-y-3 rounded-lg bg-slate-50 p-4">
                  <h3 className="font-semibold text-ink">Checking review eligibility...</h3>
                </div>
              ) : isAuthenticated && (reviewEligibility.canReview || reviewEligibility.canEdit) ? (
                <form onSubmit={onSubmitReview} className="space-y-3 rounded-lg bg-slate-50 p-4">
                  <h3 className="font-semibold text-ink">
                    {reviewEligibility.canEdit ? "Edit your review" : "Write a review"}
                  </h3>
                  <p className="text-xs text-emerald-700">Only verified buyers can review this product.</p>
                  <select
                    value={review.rating}
                    onChange={(event) => setReview((prev) => ({ ...prev, rating: Number(event.target.value) }))}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2"
                  >
                    <option value={5}>5 - Excellent</option>
                    <option value={4}>4 - Very good</option>
                    <option value={3}>3 - Good</option>
                    <option value={2}>2 - Fair</option>
                    <option value={1}>1 - Poor</option>
                  </select>
                  <textarea
                    value={review.comment}
                    onChange={(event) => setReview((prev) => ({ ...prev, comment: event.target.value }))}
                    rows={3}
                    placeholder="Share your experience"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none"
                  />
                  <button disabled={submittingReview} className="btn-primary disabled:cursor-not-allowed disabled:opacity-60">
                    {submittingReview ? "Submitting..." : reviewEligibility.canEdit ? "Update Review" : "Submit Review"}
                  </button>
                </form>
              ) : (
                <div className="space-y-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4">
                  <h3 className="font-semibold text-ink">Only verified buyers can review this product</h3>
                  <p>{reviewEligibility.message || "You can only review products you have purchased and received."}</p>
                </div>
              )}
            </div>

            {!localReviews.length ? (
              <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-5 text-center">
                No reviews yet. Be the first to review this product.
              </div>
            ) : (
              <div className="space-y-3">
                {localReviews.map((entry) => (
                  <article key={entry._id || `${entry.name}-${entry.createdAt}`} className="rounded-lg bg-slate-50 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-ink">{entry.name || "Anonymous"}</p>
                        {entry.verifiedPurchase ? (
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700">Verified Purchase</p>
                        ) : null}
                      </div>
                      <p className="text-xs text-muted">{entry.createdAt ? new Date(entry.createdAt).toLocaleDateString() : ""}</p>
                    </div>
                    <div className="mt-1">
                      <StarRating
                        value={Number(entry.rating || 0)}
                        readOnly
                        size={16}
                      />
                    </div>
                    <p className="mt-2">{entry.comment}</p>
                  </article>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {!!related.length && (
        <div className="mt-12">
          <h2 className="mb-5 font-display text-3xl font-bold">Related products</h2>
          <ProductGrid products={related} />
        </div>
      )}

      {!!similar.length && (
        <div className="mt-12">
          <h2 className="mb-5 inline-flex items-center gap-2 font-display text-3xl font-bold">
            <ShoppingBag size={22} /> Similar products
          </h2>
          <ProductGrid products={similar} />
        </div>
      )}
    </section>
  );
}

export default ProductDetailsPage;