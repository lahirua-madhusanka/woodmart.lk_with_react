import asyncHandler from "express-async-handler";
import supabase from "../config/supabase.js";

const settingsSelect = "*";

const defaultStoreSettings = {
  storeName: "Woodmart.lk",
  supportEmail: "",
  contactNumber: "",
  storeAddress: "",
  currency: "Rs.",
  freeShippingThreshold: 199,
  themeAccent: "#0959a4",
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
  currency: row.currency ?? defaultStoreSettings.currency,
  freeShippingThreshold: Number(
    row.free_shipping_threshold ?? defaultStoreSettings.freeShippingThreshold
  ),
  themeAccent: row.theme_accent ?? defaultStoreSettings.themeAccent,
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
