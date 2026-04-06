export const mockBanners = [
  {
    id: "b1",
    title: "Spring Luxury Sale",
    subtitle: "Up to 30% off selected furniture",
    ctaText: "Shop Now",
    ctaLink: "/shop",
    image:
      "https://images.unsplash.com/photo-1493666438817-866a91353ca9?auto=format&fit=crop&w=1400&q=80",
    active: true,
  },
  {
    id: "b2",
    title: "Workspace Upgrade",
    subtitle: "Smart desks and storage for productive homes",
    ctaText: "View Collection",
    ctaLink: "/shop",
    image:
      "https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?auto=format&fit=crop&w=1400&q=80",
    active: false,
  },
];

export const mockCoupons = [
  {
    id: "c1",
    code: "WELCOME10",
    discountType: "percentage",
    discountValue: 10,
    minPurchase: 100,
    expiryDate: "2026-12-31",
    active: true,
  },
  {
    id: "c2",
    code: "FLAT25",
    discountType: "fixed",
    discountValue: 25,
    minPurchase: 200,
    expiryDate: "2026-08-15",
    active: true,
  },
];

export const mockSettings = {
  storeName: "Woodmart.lk",
  supportEmail: "support@woodmart.lk",
  contactNumber: "+1 (212) 555-0193",
  storeAddress: "224 Artisan Street, New York",
  currency: "Rs.",
  freeShippingThreshold: 199,
  themeAccent: "#0959a4",
};

export const monthlyRevenue = [
  { month: "Jan", revenue: 14320 },
  { month: "Feb", revenue: 15740 },
  { month: "Mar", revenue: 18980 },
  { month: "Apr", revenue: 17620 },
  { month: "May", revenue: 20810 },
  { month: "Jun", revenue: 23100 },
];
