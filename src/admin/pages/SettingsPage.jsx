import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import Loader from "../components/Loader";
import { getSettings, saveSettings } from "../services/settingsService";
import { getApiErrorMessage } from "../../services/apiClient";

function SettingsPage() {
  const [settings, setSettings] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getSettings();
        setSettings(data);
      } catch (error) {
        toast.error(getApiErrorMessage(error));
      }
    };

    load();
  }, []);

  const setField = (key) => (event) => {
    const value = event.target.type === "checkbox" ? event.target.checked : event.target.value;
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      setSaving(true);
      const updated = await saveSettings(settings);
      setSettings(updated);
      toast.success("Settings saved successfully");
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  if (!settings) {
    return <Loader label="Loading settings..." />;
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4 rounded-xl border border-slate-200 bg-white p-5 md:grid-cols-2">
      <label className="text-sm text-muted">
        Store Name
        <input
          value={settings.storeName || ""}
          onChange={setField("storeName")}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
      </label>
      <label className="text-sm text-muted">
        Support Email
        <input
          value={settings.supportEmail || ""}
          onChange={setField("supportEmail")}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
      </label>
      <label className="text-sm text-muted">
        Contact Number
        <input
          value={settings.contactNumber || ""}
          onChange={setField("contactNumber")}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
      </label>
      <label className="text-sm text-muted">
        Currency
        <input
          value={settings.currency || "Rs."}
          onChange={setField("currency")}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
      </label>
      <label className="text-sm text-muted">
        Store Address
        <input
          value={settings.storeAddress || ""}
          onChange={setField("storeAddress")}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
      </label>
      <label className="text-sm text-muted">
        Free Shipping Threshold
        <input
          type="number"
          value={settings.freeShippingThreshold || 0}
          onChange={setField("freeShippingThreshold")}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
      </label>
      <label className="text-sm text-muted">
        Theme Accent
        <input
          value={settings.themeAccent || "#0959a4"}
          onChange={setField("themeAccent")}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
      </label>

      <div className="md:col-span-2">
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {saving ? "Saving..." : "Save Settings"}
        </button>
      </div>
    </form>
  );
}

export default SettingsPage;
