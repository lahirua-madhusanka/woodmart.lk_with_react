import { get, post, put, safeRequest } from "./adminApi";

const defaultSettings = {
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

const normalizeSettings = (data = {}) => ({
  ...defaultSettings,
  ...data,
  freeShippingThreshold: Number(
    data.freeShippingThreshold ?? defaultSettings.freeShippingThreshold
  ),
});

export const getSettings = async () => {
  const data = await safeRequest(() => get("/admin/settings"), defaultSettings);
  return normalizeSettings(data);
};

export const saveSettings = async (payload) => {
  const response = await put("/admin/settings", payload);
  const next = normalizeSettings(response?.data ?? response);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("storefront-settings-updated", { detail: next }));
  }
  return next;
};

export const uploadHeroImage = async (file) => {
  const formData = new FormData();
  formData.append("heroImage", file);

  const response = await post("/admin/settings/hero-image", formData);
  const payload = response?.data ?? response;
  const next = normalizeSettings(payload?.settings || {});

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("storefront-settings-updated", { detail: next }));
  }

  return {
    message: payload?.message || "Hero image uploaded successfully",
    settings: next,
  };
};
