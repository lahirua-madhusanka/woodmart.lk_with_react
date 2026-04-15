import { memo, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Heart, ShoppingCart } from "lucide-react";
import StarRatingDisplay from "../common/StarRatingDisplay";
import RoutePrefetchLink from "../common/RoutePrefetchLink";
import { usePrefetchOnHover, usePrefetchTrigger } from "../../hooks/usePrefetchOnHover";
import { useStorefrontSettings } from "../../context/StorefrontSettingsContext";
import { useStore } from "../../context/StoreContext";
import { getProductPricing } from "../../utils/pricing";

function ProductCard({ product }) {
  const { addToCart, getProductId, toggleWishlist, wishlist } = useStore();
  const { formatMoney } = useStorefrontSettings();
  const [imageLoaded, setImageLoaded] = useState(false);
  const productId = getProductId(product);
  const inWishlist = wishlist.includes(productId);

  const pricing = useMemo(() => getProductPricing(product), [product]);
  const price = pricing.finalPrice;
  const reviewCount = useMemo(() => {
    if (Array.isArray(product.reviews)) {
      return product.reviews.length;
    }
    return Number(product.reviewCount || 0);
  }, [product.reviewCount, product.reviews]);

  const productImage = product.images?.[0] || product.image;
  const detailsPrefetch = usePrefetchOnHover("productDetails", { immediate: true });
  const prefetchCart = usePrefetchTrigger("cart", { immediate: true });
  const prefetchWishlist = usePrefetchTrigger("wishlist", { immediate: true });

  return (
    <motion.article
      whileHover={{ y: -6 }}
      transition={{ type: "spring", stiffness: 260, damping: 22 }}
      className="group overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:shadow-premium"
    >
      <div className="relative overflow-hidden">
        <RoutePrefetchLink to={`/product/${productId}`} routeKey="productDetails" {...detailsPrefetch}>
          {!imageLoaded && <div className="absolute inset-0 animate-pulse bg-slate-200" />}
          <img
              src={productImage}
              alt={product.name}
              loading="lazy"
              decoding="async"
              onLoad={() => setImageLoaded(true)}
              className="w-full aspect-square object-cover transition duration-500 group-hover:scale-105"
            />
        </RoutePrefetchLink>
        {pricing.hasDiscount ? (
          <span className="absolute left-3 top-3 rounded-full bg-rose-600 px-3 py-1 text-xs font-semibold text-white">
            {Number(pricing.discountPercentage || 0)}% OFF
          </span>
        ) : null}
        {product.badge && !pricing.hasDiscount && (
          <span className="absolute left-3 top-3 rounded-full bg-brand px-3 py-1 text-xs font-semibold text-white">
            {product.badge}
          </span>
        )}
        <button
          className={`absolute right-3 top-3 rounded-full p-2 transition ${
            inWishlist
              ? "bg-brand text-white"
              : "bg-white/90 text-slate-700 hover:bg-brand hover:text-white"
          }`}
          onClick={() => {
            prefetchWishlist();
            toggleWishlist(productId);
          }}
          aria-label="Toggle wishlist"
        >
          <Heart size={16} />
        </button>
      </div>

      <div className="space-y-3 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand">
          {product.category}
        </p>
        <RoutePrefetchLink to={`/product/${productId}`} routeKey="productDetails" className="line-clamp-2 text-lg font-semibold text-ink" {...detailsPrefetch}>
          {product.name}
        </RoutePrefetchLink>

        <StarRatingDisplay
          rating={product.rating}
          reviewCount={reviewCount}
          showValue
          size={14}
        />

        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-brand-dark">{formatMoney(price)}</span>
          {pricing.hasDiscount && (
            <span className="text-sm text-muted line-through">{formatMoney(pricing.originalPrice)}</span>
          )}
          {!pricing.hasDiscount && product.oldPrice && (
            <span className="text-sm text-muted line-through">{formatMoney(product.oldPrice)}</span>
          )}
        </div>

        <div className="pt-1">
          <button
            onMouseEnter={prefetchCart}
            onFocus={prefetchCart}
            onClick={() => {
              prefetchCart();
              addToCart(productId, 1);
            }}
            className="btn-primary w-full justify-center gap-2 py-2.5"
          >
            <ShoppingCart size={15} /> Add to Cart
          </button>
        </div>
      </div>
    </motion.article>
  );
}

export default memo(ProductCard);