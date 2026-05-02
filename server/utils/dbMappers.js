export const mapUser = (row) => ({
  _id: row.id,
  id: row.id,
  name: row.name,
  email: row.email,
  role: row.role,
  emailVerified: row.email_verified ?? true,
  emailVerifiedAt: row.email_verified_at || null,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const mapProduct = (row) => {
  const images = (row.product_images || [])
    .slice()
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
    .map((entry) => entry.image_url);

  const variations = (row.product_variations || [])
    .slice()
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
    .map((entry) => ({
      id: entry.id,
      name: entry.name ?? entry.variation_name ?? "",
      price: Number(entry.price || 0),
      discountedPrice:
        entry.discounted_price == null ? null : Number(entry.discounted_price),
      cost: Number(entry.cost || 0),
      stock: Number(entry.stock || 0),
      sku: entry.sku || "",
      imageUrl: entry.image_url || "",
      sortOrder: Number(entry.sort_order || 0),
    }));

  const reviews = (row.product_reviews || []).map((review) => ({
    _id: review.id,
    user: review.user_id,
    name: review.name,
    title: review.title || "",
    rating: Number(review.rating || 0),
    comment: review.comment,
    orderId: review.order_id || null,
    verifiedPurchase: Boolean(review.order_id),
    createdAt: review.created_at,
    updatedAt: review.updated_at,
  }));

  return {
    _id: row.id,
    id: row.id,
    name: row.name,
    description: row.description,
    category: row.category,
    brand: row.brand || "",
    status: row.status || "active",
    featured: Boolean(row.featured),
    shippingPrice: row.shipping_price == null ? 0 : Number(row.shipping_price),
    rating: row.rating == null ? 0 : Number(row.rating),
    image: images[0] || "",
    images,
    variations,
    reviews,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

export const mapOrder = (row, options = {}) => {
  const includeUser = options.includeUser ?? false;
  const shipping = Array.isArray(row.order_shipping_addresses)
    ? row.order_shipping_addresses[0]
    : row.order_shipping_addresses;

  const mappedItems = (row.order_items || []).map((item) => ({
    productId: item.product_id,
    name: item.name,
    image: item.image,
    sku: item.sku || "",
    variationId: item.variation_id || null,
    variationName: item.variation_name || "",
    variationSku: item.variation_sku || "",
    variationImage: item.variation_image || "",
    variationPrice: item.variation_price == null ? null : Number(item.variation_price),
    price: Number(item.price || 0),
    listPrice: Number(item.list_price ?? item.price ?? 0),
    discountAmount: Number(item.discount_amount || 0),
    productCost: Number(item.product_cost || 0),
    shippingPrice: Number(item.shipping_price || 0),
    quantity: item.quantity,
    lineSubtotal: Number(item.line_subtotal || Number(item.price || 0) * Number(item.quantity || 0)),
    lineShippingTotal: Number(item.line_shipping_total || Number(item.shipping_price || 0) * Number(item.quantity || 0)),
    lineDiscountTotal: Number(item.line_discount_total || Number(item.discount_amount || 0) * Number(item.quantity || 0)),
    lineProductCostTotal: Number(item.line_product_cost_total || Number(item.product_cost || 0) * Number(item.quantity || 0)),
    lineTotal:
      Number(item.line_total) ||
      Number((Number(item.line_subtotal || Number(item.price || 0) * Number(item.quantity || 0)) + Number(item.line_shipping_total || Number(item.shipping_price || 0) * Number(item.quantity || 0))).toFixed(2)),
    lineProfitTotal:
      Number(item.line_profit_total) ||
      Number((
        Number(item.line_subtotal || Number(item.price || 0) * Number(item.quantity || 0)) -
        (Number(item.line_product_cost_total || Number(item.product_cost || 0) * Number(item.quantity || 0)) +
          Number(item.line_shipping_total || Number(item.shipping_price || 0) * Number(item.quantity || 0)) +
          Number(item.line_discount_total || Number(item.discount_amount || 0) * Number(item.quantity || 0)))
      ).toFixed(2)),
    promotionId: item.promotion_id || null,
    promotionTitle: item.promotion_title || "",
    promotionSlug: item.promotion_slug || "",
    promotionDiscountPercentage: Number(item.promotion_discount_percentage || 0),
    promotionOriginalPrice: item.promotion_original_price == null ? null : Number(item.promotion_original_price),
    promotionDiscountedPrice: item.promotion_discounted_price == null ? null : Number(item.promotion_discounted_price),
    promotionActive: Boolean(item.promotion_active),
  }));

  const mapped = {
    _id: row.id,
    id: row.id,
    userId: row.user_id,
    items: mappedItems,
    totalAmount: Number(row.total_amount || 0),
    subtotalAmount: Number(row.subtotal_amount || 0),
    shippingTotal: Number(row.shipping_total || 0),
    discountTotal: Number(row.discount_total || 0),
    productCostTotal: Number(row.product_cost_total || 0),
    profitTotal: Number(row.profit_total || 0),
    paymentStatus: row.payment_status,
    orderStatus: row.order_status,
    paymentMethod: row.payment_method || "cod",
    transactionId: row.transaction_id || "",
    paidAmount: Number(row.paid_amount || 0),
    trackingNumber: row.tracking_number || "",
    courierName: row.courier_name || "",
    adminNote: row.admin_note || "",
    shippedAt: row.shipped_at || null,
    outForDeliveryAt: row.out_for_delivery_at || null,
    deliveredAt: row.delivered_at || null,
    returnedAt: row.returned_at || null,
    cancelledAt: row.cancelled_at || null,
    trackingAddedAt: row.tracking_added_at || null,
    invoiceNumber: row.invoice_number || "",
    shippingAddress: shipping
      ? {
          fullName: shipping.full_name,
          line1: shipping.line1,
          line2: shipping.line2,
          city: shipping.city,
          state: shipping.state || "",
          postalCode: shipping.postal_code,
          country: shipping.country,
          phone: shipping.phone,
        }
      : null,
    paymentIntentId: row.payment_intent_id || "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    couponId: row.coupon_id || null,
    couponCode: row.coupon_code || null,
    couponTitle: row.coupon_title || null,
    couponDiscountType: row.coupon_discount_type || null,
    couponDiscountValue: row.coupon_discount_value == null ? null : Number(row.coupon_discount_value),
    couponDiscountAmount: Number(row.coupon_discount_amount || 0),
    statusHistory: (row.order_status_history || [])
      .slice()
      .sort((a, b) => new Date(b.changed_at).getTime() - new Date(a.changed_at).getTime())
      .map((entry) => ({
        id: entry.id,
        status: entry.order_status,
        note: entry.note || "",
        changedAt: entry.changed_at,
        changedBy: entry.changed_by || null,
        changedByUser: entry.users
          ? {
              name: entry.users.name || "",
              email: entry.users.email || "",
            }
          : null,
      })),
  };

  if (includeUser) {
    mapped.userId = row.users
      ? {
          _id: row.users.id,
          name: row.users.name,
          email: row.users.email,
        }
      : null;
  }

  return mapped;
};

export const mapCart = (cartRow, itemRows, productRows) => {
  const productMap = new Map(productRows.map((product) => [product.id, product]));

  return {
    _id: cartRow.id,
    id: cartRow.id,
    userId: cartRow.user_id,
    items: itemRows.map((item) => {
      const product = productMap.get(item.product_id);
      const variation = item.product_variations || null;
      return {
        productId: item.product_id,
        variationId: item.variation_id || null,
        variation: variation
          ? {
              id: variation.id,
              name: variation.name ?? variation.variation_name ?? "",
              price: Number(variation.price || 0),
              discountedPrice:
                variation.discounted_price == null ? null : Number(variation.discounted_price),
              cost: Number(variation.cost || 0),
              stock: Number(variation.stock || 0),
              sku: variation.sku || "",
              imageUrl: variation.image_url || "",
            }
          : null,
        product: product ? mapProduct(product) : null,
        quantity: item.quantity,
      };
    }),
  };
};
