import { get, put, safeRequest } from "./adminApi";

const defaultSettings = {
  storeName: "Woodmart.lk",
  supportEmail: "",
  contactNumber: "",
  storeAddress: "",
  currency: "Rs.",
  freeShippingThreshold: 199,
  themeAccent: "#0959a4",
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
