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

const normalizeHeroSlides = (slides, fallbackSlides) => {
  const source = Array.isArray(slides) && slides.length ? slides : fallbackSlides;

  return source
    .slice(0, 3)
    .map((slide, index) => ({
      id: String(slide?.id || `hero-slide-${index + 1}`),
      imageUrl: String(slide?.imageUrl || fallbackSlides[0]?.imageUrl || "").trim(),
      title: String(slide?.title || fallbackSlides[0]?.title || "Hero Slide").trim(),
      subtitle: String(slide?.subtitle || fallbackSlides[0]?.subtitle || "").trim(),
      buttonText: String(slide?.buttonText || "Shop Now").trim(),
      buttonLink: String(slide?.buttonLink || "/shop").trim() || "/shop",
      displayOrder: Number.isFinite(Number(slide?.displayOrder)) ? Number(slide.displayOrder) : index + 1,
      status: String(slide?.status || "active").toLowerCase() === "inactive" ? "inactive" : "active",
    }))
    .sort((a, b) => a.displayOrder - b.displayOrder)
    .map((slide, index) => ({ ...slide, displayOrder: index + 1 }));
};

const normalizeSettings = (data = {}) => {
  const merged = { ...defaultStorefrontSettings, ...(data || {}) };
  const derivedSettingsVersion = Number(
    merged.settingsVersion || (merged.updatedAt ? new Date(merged.updatedAt).getTime() : 0)
  );
  const fallbackSlides = [
    {
      id: "hero-slide-1",
      imageUrl: merged.heroImage || defaultStorefrontSettings.heroImage,
      title: merged.heroTitle || defaultStorefrontSettings.heroTitle,
      subtitle: merged.heroSubtitle || defaultStorefrontSettings.heroSubtitle,
      buttonText: merged.heroPrimaryButtonText || defaultStorefrontSettings.heroPrimaryButtonText,
      buttonLink: merged.heroPrimaryButtonLink || defaultStorefrontSettings.heroPrimaryButtonLink,
      displayOrder: 1,
      status: "active",
    },
  ];

  const heroSlides = normalizeHeroSlides(merged.heroSlides, fallbackSlides);
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

export const getStorefrontSettingsApi = async () => {
  try {
    const { data } = await apiClient.get("/store/settings");
    return normalizeSettings(data);
  } catch {
    return normalizeSettings(defaultStorefrontSettings);
  }
};

export { defaultStorefrontSettings };
