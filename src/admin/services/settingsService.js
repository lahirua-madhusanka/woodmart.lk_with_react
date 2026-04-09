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
  heroSlides: [
    {
      id: "hero-slide-1",
      imageUrl:
        "https://images.unsplash.com/photo-1493666438817-866a91353ca9?auto=format&fit=crop&w=1200&q=80",
      title: "Craft your space with timeless pieces.",
      subtitle:
        "Discover premium furniture, decor, and lifestyle objects inspired by natural materials and modern living.",
      buttonText: "Shop Now",
      buttonLink: "/shop",
      displayOrder: 1,
      status: "active",
    },
  ],
};

const normalizeHeroSlides = (slides, fallback) => {
  const source = Array.isArray(slides) && slides.length ? slides : fallback;

  return source
    .slice(0, 3)
    .map((slide, index) => ({
      id: String(slide?.id || `hero-slide-${index + 1}`),
      imageUrl: String(slide?.imageUrl || fallback[0]?.imageUrl || "").trim(),
      title: String(slide?.title || fallback[0]?.title || "Hero Slide").trim(),
      subtitle: String(slide?.subtitle || fallback[0]?.subtitle || "").trim(),
      buttonText: String(slide?.buttonText || "Shop Now").trim(),
      buttonLink: String(slide?.buttonLink || "/shop").trim() || "/shop",
      displayOrder: Number.isFinite(Number(slide?.displayOrder)) ? Number(slide.displayOrder) : index + 1,
      status: String(slide?.status || "active").toLowerCase() === "inactive" ? "inactive" : "active",
    }))
    .sort((a, b) => a.displayOrder - b.displayOrder)
    .map((slide, index) => ({ ...slide, displayOrder: index + 1 }));
};

const normalizeSettings = (data = {}) => {
  const merged = {
    ...defaultSettings,
    ...data,
    freeShippingThreshold: Number(
      data.freeShippingThreshold ?? defaultSettings.freeShippingThreshold
    ),
  };
  const derivedSettingsVersion = Number(
    merged.settingsVersion || (merged.updatedAt ? new Date(merged.updatedAt).getTime() : 0)
  );

  const legacyFallbackSlides = [
    {
      id: "hero-slide-1",
      imageUrl: merged.heroImage || defaultSettings.heroImage,
      title: merged.heroTitle || defaultSettings.heroTitle,
      subtitle: merged.heroSubtitle || defaultSettings.heroSubtitle,
      buttonText: merged.heroPrimaryButtonText || defaultSettings.heroPrimaryButtonText,
      buttonLink: merged.heroPrimaryButtonLink || defaultSettings.heroPrimaryButtonLink,
      displayOrder: 1,
      status: "active",
    },
  ];

  const heroSlides = normalizeHeroSlides(merged.heroSlides, legacyFallbackSlides);
  const primarySlide = heroSlides.find((slide) => slide.status === "active") || heroSlides[0];

  return {
    ...merged,
    settingsVersion: Number.isFinite(derivedSettingsVersion) ? derivedSettingsVersion : 0,
    heroSlides,
    heroImage: primarySlide?.imageUrl || merged.heroImage,
    heroTitle: primarySlide?.title || merged.heroTitle,
    heroSubtitle: primarySlide?.subtitle || merged.heroSubtitle,
    heroPrimaryButtonText: primarySlide?.buttonText || merged.heroPrimaryButtonText,
    heroPrimaryButtonLink: primarySlide?.buttonLink || merged.heroPrimaryButtonLink,
  };
};

export const getSettings = async () => {
  const data = await safeRequest(() => get("/admin/settings", { params: { _: Date.now() } }), defaultSettings);
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

export const uploadHeroImage = async (file, slideIndex = 0) => {
  const formData = new FormData();
  formData.append("heroImage", file);
  formData.append("slideIndex", String(slideIndex));

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
