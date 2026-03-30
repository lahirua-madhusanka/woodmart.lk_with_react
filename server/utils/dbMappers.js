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

  const reviews = (row.product_reviews || []).map((review) => ({
    _id: review.id,
    user: review.user_id,
    name: review.name,
    rating: Number(review.rating || 0),
    comment: review.comment,
    createdAt: review.created_at,
    updatedAt: review.updated_at,
  }));

  return {
    _id: row.id,
    id: row.id,
    name: row.name,
    description: row.description,
    price: Number(row.price || 0),
    discountPrice: row.discount_price == null ? null : Number(row.discount_price),
    productCost: Number(row.product_cost || 0),
    shippingPrice: Number(row.shipping_price || 0),
    category: row.category,
    sku: row.sku || "",
    brand: row.brand || "",
    featured: Boolean(row.featured),
    status: row.status || "active",
    image: images[0] || "",
    images,
    stock: row.stock,
    countInStock: row.stock,
    rating: Number(row.rating || 0),
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
      return {
        productId: item.product_id,
        product: product ? mapProduct(product) : null,
        quantity: item.quantity,
      };
    }),
  };
};
