import asyncHandler from "express-async-handler";
import supabase from "../config/supabase.js";

const settingsSelect = "*";

const defaultStoreSettings = {
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

const MAX_HERO_SLIDES = 3;

const getDefaultHeroSlides = () => [
  {
    id: "hero-slide-1",
    imageUrl: defaultStoreSettings.heroImage,
    title: defaultStoreSettings.heroTitle,
    subtitle: defaultStoreSettings.heroSubtitle,
    buttonText: defaultStoreSettings.heroPrimaryButtonText,
    buttonLink: defaultStoreSettings.heroPrimaryButtonLink,
    displayOrder: 1,
    status: "active",
  },
];

const normalizeHeroSlideStatus = (value) =>
  String(value || "active").toLowerCase() === "inactive" ? "inactive" : "active";

const normalizeHeroSlides = (value, fallbackSlides = getDefaultHeroSlides()) => {
  const source = Array.isArray(value) ? value : fallbackSlides;

  const normalized = source
    .slice(0, MAX_HERO_SLIDES)
    .map((slide, index) => ({
      id: String(slide?.id || `hero-slide-${index + 1}`),
      imageUrl: String(slide?.imageUrl || "").trim(),
      title: String(slide?.title || "").trim(),
      subtitle: String(slide?.subtitle || "").trim(),
      buttonText: String(slide?.buttonText || "").trim(),
      buttonLink: String(slide?.buttonLink || "/shop").trim() || "/shop",
      displayOrder: Number.isFinite(Number(slide?.displayOrder)) ? Number(slide.displayOrder) : index + 1,
      status: normalizeHeroSlideStatus(slide?.status),
    }))
    .sort((a, b) => a.displayOrder - b.displayOrder)
    .map((slide, index) => ({
      ...slide,
      displayOrder: index + 1,
      title: slide.title || `Hero Slide ${index + 1}`,
      subtitle: slide.subtitle || defaultStoreSettings.heroSubtitle,
      buttonText: slide.buttonText || "Shop Now",
      imageUrl: slide.imageUrl || fallbackSlides[0]?.imageUrl || defaultStoreSettings.heroImage,
    }));

  if (!normalized.length) {
    return fallbackSlides;
  }

  return normalized;
};

const isMissingRelationError = (message = "") => {
  const normalized = String(message).toLowerCase();
  return normalized.includes("could not find") && (normalized.includes("relation") || normalized.includes("table"));
};

const applyNoStoreHeaders = (res) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.set("Pragma", "no-cache");
  res.set("Expires", "0");
};

const mapStoreSettings = (row = {}) => {
  const legacySlide = {
    id: "hero-slide-1",
    imageUrl: row.hero_image_url ?? defaultStoreSettings.heroImage,
    title: row.hero_title ?? defaultStoreSettings.heroTitle,
    subtitle: row.hero_subtitle ?? defaultStoreSettings.heroSubtitle,
    buttonText: row.hero_primary_button_text ?? defaultStoreSettings.heroPrimaryButtonText,
    buttonLink: row.hero_primary_button_link ?? defaultStoreSettings.heroPrimaryButtonLink,
    displayOrder: 1,
    status: "active",
  };
  const heroSlides = normalizeHeroSlides(row.hero_slides, [legacySlide]);
  const primarySlide = heroSlides.find((slide) => slide.status === "active") || heroSlides[0] || legacySlide;

  return {
    storeName: row.store_name ?? defaultStoreSettings.storeName,
    supportEmail: row.support_email ?? row.admin_email ?? defaultStoreSettings.supportEmail,
    contactNumber: row.contact_number ?? defaultStoreSettings.contactNumber,
    storeAddress: row.store_address ?? defaultStoreSettings.storeAddress,
    businessHours: row.business_hours ?? defaultStoreSettings.businessHours,
    supportNote: row.support_note ?? defaultStoreSettings.supportNote,
    contactImageUrl: row.contact_image_url ?? defaultStoreSettings.contactImageUrl,
    currency: row.currency ?? defaultStoreSettings.currency,
    freeShippingThreshold: Number(
      row.free_shipping_threshold ?? defaultStoreSettings.freeShippingThreshold
    ),
    themeAccent: row.theme_accent ?? defaultStoreSettings.themeAccent,
    heroSlides,
    heroTitle: primarySlide.title,
    heroSubtitle: primarySlide.subtitle,
    heroPrimaryButtonText: primarySlide.buttonText,
    heroPrimaryButtonLink: primarySlide.buttonLink,
    heroSecondaryButtonText:
      row.hero_secondary_button_text ?? defaultStoreSettings.heroSecondaryButtonText,
    heroSecondaryButtonLink:
      row.hero_secondary_button_link ?? defaultStoreSettings.heroSecondaryButtonLink,
    heroImage: primarySlide.imageUrl,
    updatedAt: row.updated_at ?? null,
    settingsVersion: row.updated_at ? new Date(row.updated_at).getTime() : 0,
  };
};

export const getStorefrontSettings = asyncHandler(async (req, res) => {
  applyNoStoreHeaders(res);

  const { data, error } = await supabase
    .from("store_settings")
    .select(settingsSelect)
    .eq("id", true)
    .maybeSingle();

  if (error) {
    if (isMissingRelationError(error.message)) {
      return res.json(defaultStoreSettings);
    }

    res.status(500);
    throw new Error(error.message);
  }

  if (!data) {
    return res.json(defaultStoreSettings);
  }

  return res.json(mapStoreSettings(data));
});
