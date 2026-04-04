import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import Loader from "../components/Loader";
import { getSettings, saveSettings, uploadHeroImage } from "../services/settingsService";
import { getApiErrorMessage } from "../../services/apiClient";

function SettingsPage() {
  const [settings, setSettings] = useState(null);
  const [saving, setSaving] = useState(false);
  const [uploadingHeroImage, setUploadingHeroImage] = useState(false);

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

  const handleHeroImageUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setUploadingHeroImage(true);
      const response = await uploadHeroImage(file);
      setSettings(response.settings);
      toast.success(response.message);
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setUploadingHeroImage(false);
      event.target.value = "";
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
        Business Hours
        <input
          value={settings.businessHours || ""}
          onChange={setField("businessHours")}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
      </label>
      <label className="text-sm text-muted md:col-span-2">
        Support Note
        <textarea
          rows={2}
          value={settings.supportNote || ""}
          onChange={setField("supportNote")}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
      </label>
      <label className="text-sm text-muted md:col-span-2">
        Contact Section Image URL
        <input
          value={settings.contactImageUrl || ""}
          onChange={setField("contactImageUrl")}
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

      <div className="md:col-span-2 mt-2 border-t border-slate-200 pt-4">
        <h3 className="text-base font-semibold text-ink">Homepage Hero Section</h3>
        <p className="mt-1 text-xs text-muted">Edit the main homepage banner content to match your current campaign.</p>
      </div>

      <label className="text-sm text-muted md:col-span-2">
        Hero Title
        <input
          value={settings.heroTitle || ""}
          onChange={setField("heroTitle")}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
      </label>

      <label className="text-sm text-muted md:col-span-2">
        Hero Subtitle
        <textarea
          rows={3}
          value={settings.heroSubtitle || ""}
          onChange={setField("heroSubtitle")}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
      </label>

      <label className="text-sm text-muted">
        Primary Button Text
        <input
          value={settings.heroPrimaryButtonText || ""}
          onChange={setField("heroPrimaryButtonText")}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
      </label>

      <label className="text-sm text-muted">
        Primary Button Link
        <input
          value={settings.heroPrimaryButtonLink || "/shop"}
          onChange={setField("heroPrimaryButtonLink")}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
      </label>

      <label className="text-sm text-muted">
        Secondary Button Text
        <input
          value={settings.heroSecondaryButtonText || ""}
          onChange={setField("heroSecondaryButtonText")}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
      </label>

      <label className="text-sm text-muted">
        Secondary Button Link
        <input
          value={settings.heroSecondaryButtonLink || "/shop"}
          onChange={setField("heroSecondaryButtonLink")}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
      </label>

      <div className="md:col-span-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
        <p className="text-sm font-semibold text-ink">Upload Hero Image</p>
        <p className="mt-1 text-xs text-muted">Choose an image file and we will store it and save it automatically.</p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <input
            type="file"
            accept="image/*"
            onChange={handleHeroImageUpload}
            disabled={uploadingHeroImage}
            className="text-sm text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-brand file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white"
          />
          {uploadingHeroImage ? <span className="text-xs text-muted">Uploading image...</span> : null}
        </div>
      </div>

      {settings.heroImage ? (
        <div className="md:col-span-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Hero Image Preview</p>
          <img
            src={settings.heroImage}
            alt="Hero preview"
            className="h-44 w-full rounded-lg object-cover"
            onError={(event) => {
              event.currentTarget.style.display = "none";
            }}
          />
        </div>
      ) : null}

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
