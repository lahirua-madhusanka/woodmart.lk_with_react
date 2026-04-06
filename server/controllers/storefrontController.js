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

const isMissingRelationError = (message = "") => {
  const normalized = String(message).toLowerCase();
  return normalized.includes("could not find") && (normalized.includes("relation") || normalized.includes("table"));
};

const mapStoreSettings = (row = {}) => ({
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
  heroTitle: row.hero_title ?? defaultStoreSettings.heroTitle,
  heroSubtitle: row.hero_subtitle ?? defaultStoreSettings.heroSubtitle,
  heroPrimaryButtonText:
    row.hero_primary_button_text ?? defaultStoreSettings.heroPrimaryButtonText,
  heroPrimaryButtonLink:
    row.hero_primary_button_link ?? defaultStoreSettings.heroPrimaryButtonLink,
  heroSecondaryButtonText:
    row.hero_secondary_button_text ?? defaultStoreSettings.heroSecondaryButtonText,
  heroSecondaryButtonLink:
    row.hero_secondary_button_link ?? defaultStoreSettings.heroSecondaryButtonLink,
  heroImage: row.hero_image_url ?? defaultStoreSettings.heroImage,
});

export const getStorefrontSettings = asyncHandler(async (req, res) => {
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
