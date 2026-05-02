const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const roundMoney = (value) => Number(toNumber(value, 0).toFixed(2));

export const getVariationPricing = (variation = {}, options = {}) => {
  const originalPrice = roundMoney(variation.price ?? 0);
  const explicitDiscounted = variation.discountedPrice ?? variation.discounted_price ?? null;
  const variationDiscounted =
    explicitDiscounted == null || explicitDiscounted === ""
      ? null
      : roundMoney(explicitDiscounted);

  const hasVariationDiscount =
    variationDiscounted != null &&
    variationDiscounted > 0 &&
    variationDiscounted < originalPrice;

  const baseAfterVariationDiscount = hasVariationDiscount ? variationDiscounted : originalPrice;

  // Apply product-level promotion (% off the variation's base/list price)
  const product = options.product || null;
  const promotion = options.promotion || product?.promotion || null;
  const promotionActive = Boolean(
    options.promotionActive ?? product?.promotionActive ?? (promotion && Number(promotion.discountPercentage) > 0)
  );
  const promotionPercentage =
    promotionActive && promotion
      ? Math.max(0, Math.min(100, Number(promotion.discountPercentage || 0)))
      : 0;

  let finalPrice = baseAfterVariationDiscount;
  if (promotionPercentage > 0) {
    finalPrice = roundMoney(Math.max(0, originalPrice - (originalPrice * promotionPercentage) / 100));
  }

  const hasDiscount = finalPrice < originalPrice;
  const discountPercentage =
    hasDiscount && originalPrice > 0
      ? roundMoney(((originalPrice - finalPrice) / originalPrice) * 100)
      : 0;

  return {
    originalPrice,
    discountedPrice: hasDiscount ? finalPrice : originalPrice,
    finalPrice,
    hasDiscount,
    discountPercentage,
    promotionActive: promotionPercentage > 0,
    promotion: promotionPercentage > 0 ? promotion : null,
  };
};

const getCandidateVariations = (product = {}) => {
  if (Array.isArray(product?.variations) && product.variations.length) {
    return product.variations;
  }
  return [];
};

export const getProductPricing = (product = {}) => {
  const variations = getCandidateVariations(product);

  if (variations.length) {
    const prices = variations.map((variation) => getVariationPricing(variation, { product }));
    const min = prices.reduce((acc, entry) => {
      if (!acc) return entry;
      return entry.finalPrice < acc.finalPrice ? entry : acc;
    }, null);
    return min || getVariationPricing(variations[0], { product });
  }

  // Legacy fallback (pre-variation-only)
  const originalPrice = roundMoney(product.originalPrice ?? product.price ?? 0);
  const explicitDiscounted = product.discountedPrice ?? product.discountPrice;
  const baseDiscounted = roundMoney(explicitDiscounted == null ? originalPrice : explicitDiscounted);
  const hasBaseDiscount = baseDiscounted > 0 && baseDiscounted < originalPrice;
  const baseFinal = hasBaseDiscount ? baseDiscounted : originalPrice;

  const promotion = product.promotion || null;
  const promotionActive = Boolean(product.promotionActive ?? (promotion && Number(promotion.discountPercentage) > 0));
  const promotionPercentage =
    promotionActive && promotion ? Math.max(0, Math.min(100, Number(promotion.discountPercentage || 0))) : 0;

  let finalPrice = baseFinal;
  if (promotionPercentage > 0) {
    finalPrice = roundMoney(Math.max(0, originalPrice - (originalPrice * promotionPercentage) / 100));
  }

  const hasDiscount = finalPrice < originalPrice;

  return {
    originalPrice,
    discountedPrice: hasDiscount ? finalPrice : originalPrice,
    finalPrice,
    hasDiscount,
    discountPercentage:
      hasDiscount && originalPrice > 0
        ? roundMoney(((originalPrice - finalPrice) / originalPrice) * 100)
        : 0,
    promotionActive: promotionPercentage > 0,
    promotion: promotionPercentage > 0 ? promotion : null,
  };
};

export const getProductMinPrice = (product = {}) => getProductPricing(product).finalPrice;
