import apiClient from "./apiClient";

const defaultStorefrontSettings = {
  storeName: "Woodmart.lk",
  supportEmail: "",
  contactNumber: "",
  storeAddress: "",
  businessHours: "Mon - Sat, 9:00 AM - 7:00 PM",
  supportNote: "Visit our showroom or contact our team for personalized recommendations.",
  contactImageUrl:
    "https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1000&q=80",
  currency: "Rs.",
  freeShippingThreshold: 199,
  themeAccent: "#0959a4",
  heroTitle: "Craft your space with timeless pieces.",
  heroSubtitle:
    "Discover premium furniture, decor, and lifestyle objects inspired by natural materials and modern living.",
  heroPrimaryButtonText: "Shop Now",
  heroPrimaryButtonLink: "/shop",
  heroSecondaryButtonText: "View Collection",
  heroSecondaryButtonLink: "/shop",
  heroImage:
    "https://images.unsplash.com/photo-1493666438817-866a91353ca9?auto=format&fit=crop&w=1200&q=80",
};

export const getStorefrontSettingsApi = async () => {
  try {
    const { data } = await apiClient.get("/store/settings");
    return { ...defaultStorefrontSettings, ...(data || {}) };
  } catch {
    return defaultStorefrontSettings;
  }
};

export { defaultStorefrontSettings };
