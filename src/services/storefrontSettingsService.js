import apiClient from "./apiClient";

const defaultStorefrontSettings = {
  storeName: "Woodmart.lk",
  supportEmail: "",
  contactNumber: "",
  storeAddress: "",
  currency: "Rs.",
  freeShippingThreshold: 199,
  themeAccent: "#0959a4",
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
