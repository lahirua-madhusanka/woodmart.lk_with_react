import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  defaultStorefrontSettings,
  getStorefrontSettingsApi,
} from "../services/storefrontSettingsService";

const StorefrontSettingsContext = createContext(null);

const normalizeHex = (value) => {
  const hex = String(value || "").trim();
  if (!/^#([a-fA-F0-9]{3}|[a-fA-F0-9]{6})$/.test(hex)) {
    return defaultStorefrontSettings.themeAccent;
  }

  if (hex.length === 4) {
    return `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`.toLowerCase();
  }

  return hex.toLowerCase();
};

const shadeHex = (hex, factor) => {
  const clean = normalizeHex(hex).slice(1);
  const num = Number.parseInt(clean, 16);
  const clamp = (channel) => Math.max(0, Math.min(255, channel));

  const r = clamp(Math.round(((num >> 16) & 255) * factor));
  const g = clamp(Math.round(((num >> 8) & 255) * factor));
  const b = clamp(Math.round((num & 255) * factor));

  return `#${r.toString(16).padStart(2, "0")}${g
    .toString(16)
    .padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
};

export function StorefrontSettingsProvider({ children }) {
  const [settings, setSettings] = useState(defaultStorefrontSettings);

  useEffect(() => {
    let ignore = false;

    const load = async () => {
      const payload = await getStorefrontSettingsApi();
      if (!ignore) {
        setSettings({ ...defaultStorefrontSettings, ...(payload || {}) });
      }
    };

    load();

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    const onSettingsUpdated = (event) => {
      const payload = event?.detail || {};
      setSettings((prev) => ({ ...prev, ...payload }));
    };

    window.addEventListener("storefront-settings-updated", onSettingsUpdated);
    return () => {
      window.removeEventListener("storefront-settings-updated", onSettingsUpdated);
    };
  }, []);

  useEffect(() => {
    const accent = normalizeHex(settings.themeAccent);
    const accentDark = shadeHex(accent, 0.68);
    const accentLight = shadeHex(accent, 1.16);

    const root = document.documentElement;
    root.style.setProperty("--brand", accent);
    root.style.setProperty("--brand-dark", accentDark);
    root.style.setProperty("--brand-light", `${accentLight}33`);
  }, [settings.themeAccent]);

  const value = useMemo(() => {
    const currency = String(settings.currency || defaultStorefrontSettings.currency);
    const formatMoney = (amount) =>
      `${currency} ${Number(amount || 0).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;

    return {
      settings,
      currency,
      formatMoney,
    };
  }, [settings]);

  return (
    <StorefrontSettingsContext.Provider value={value}>
      {children}
    </StorefrontSettingsContext.Provider>
  );
}

export function useStorefrontSettings() {
  const context = useContext(StorefrontSettingsContext);
  if (!context) {
    throw new Error("useStorefrontSettings must be used within StorefrontSettingsProvider");
  }
  return context;
}
