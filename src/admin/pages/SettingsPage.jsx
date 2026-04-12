import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import Loader from "../components/Loader";
import { getSettings, saveSettings, uploadHeroImage } from "../services/settingsService";
import { getApiErrorMessage } from "../../services/apiClient";

const MAX_HERO_SLIDES = 3;

const createEmptySlide = (index) => ({
  id: `hero-slide-${Date.now()}-${index}`,
  imageUrl: "",
  title: "",
  subtitle: "",
  buttonText: "Shop Now",
  buttonLink: "/shop",
  displayOrder: index + 1,
  status: "active",
});

const normalizeSlides = (slides = []) =>
  (Array.isArray(slides) ? slides : [])
    .slice(0, MAX_HERO_SLIDES)
    .map((slide, index) => ({
      id: String(slide?.id || `hero-slide-${index + 1}`),
      imageUrl: String(slide?.imageUrl || "").trim(),
      title: String(slide?.title || "").trim(),
      subtitle: String(slide?.subtitle || "").trim(),
      buttonText: String(slide?.buttonText || "Shop Now").trim() || "Shop Now",
      buttonLink: String(slide?.buttonLink || "/shop").trim() || "/shop",
      displayOrder: Number.isFinite(Number(slide?.displayOrder)) ? Number(slide.displayOrder) : index + 1,
      status: String(slide?.status || "active").toLowerCase() === "inactive" ? "inactive" : "active",
    }))
    .sort((a, b) => a.displayOrder - b.displayOrder)
    .map((slide, index) => ({ ...slide, displayOrder: index + 1 }));

function SettingsPage() {
  const [settings, setSettings] = useState(null);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploadingHeroImageIndex, setUploadingHeroImageIndex] = useState(null);

  const loadSettings = async () => {
    setLoadingSettings(true);
    setLoadError("");
    try {
      const data = await getSettings();
      setSettings(data);
    } catch (error) {
      setLoadError(getApiErrorMessage(error));
      setSettings(null);
      toast.error(getApiErrorMessage(error));
    } finally {
      setLoadingSettings(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const setField = (key) => (event) => {
    const value = event.target.type === "checkbox" ? event.target.checked : event.target.value;
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const heroSlides = useMemo(() => normalizeSlides(settings?.heroSlides || []), [settings?.heroSlides]);

  const setSlideField = (index, key, value) => {
    setSettings((prev) => {
      const nextSlides = normalizeSlides(prev?.heroSlides || []);
      if (!nextSlides[index]) return prev;
      nextSlides[index] = { ...nextSlides[index], [key]: value };
      return { ...prev, heroSlides: normalizeSlides(nextSlides) };
    });
  };

  const addSlide = () => {
    setSettings((prev) => {
      const nextSlides = normalizeSlides(prev?.heroSlides || []);
      if (nextSlides.length >= MAX_HERO_SLIDES) {
        toast.info("You can only add up to 3 hero slides");
        return prev;
      }
      nextSlides.push(createEmptySlide(nextSlides.length));
      return { ...prev, heroSlides: normalizeSlides(nextSlides) };
    });
  };

  const removeSlide = (index) => {
    setSettings((prev) => {
      const nextSlides = normalizeSlides(prev?.heroSlides || []);
      nextSlides.splice(index, 1);
      if (!nextSlides.length) {
        nextSlides.push(createEmptySlide(0));
      }
      return { ...prev, heroSlides: normalizeSlides(nextSlides) };
    });
  };

  const moveSlide = (fromIndex, toIndex) => {
    setSettings((prev) => {
      const nextSlides = normalizeSlides(prev?.heroSlides || []);
      if (toIndex < 0 || toIndex >= nextSlides.length) return prev;
      const [item] = nextSlides.splice(fromIndex, 1);
      nextSlides.splice(toIndex, 0, item);
      return { ...prev, heroSlides: normalizeSlides(nextSlides) };
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      setSaving(true);
      const payload = {
        ...settings,
        heroSlides: normalizeSlides(settings?.heroSlides || []).slice(0, MAX_HERO_SLIDES),
      };
      const updated = await saveSettings(payload);
      const updatedSlides = normalizeSlides(updated?.heroSlides || []);
      const payloadSlides = normalizeSlides(payload.heroSlides || []);
      const shouldKeepLocalSlides = payloadSlides.length > 1 && updatedSlides.length < payloadSlides.length;

      setSettings({
        ...updated,
        heroSlides: shouldKeepLocalSlides ? payloadSlides : updatedSlides,
      });

      if (shouldKeepLocalSlides) {
        toast.info("Hero slides are kept locally. Add hero_slides column in DB to persist multiple slides.");
      }
      toast.success("Settings saved successfully");
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const handleHeroImageUpload = async (event, slideIndex) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setUploadingHeroImageIndex(slideIndex);
      const response = await uploadHeroImage(file, slideIndex);
      setSettings((prev) => {
        const base = response?.settings || prev;
        const prevSlides = normalizeSlides(prev?.heroSlides || []);

        while (prevSlides.length <= slideIndex && prevSlides.length < MAX_HERO_SLIDES) {
          prevSlides.push(createEmptySlide(prevSlides.length));
        }

        if (prevSlides[slideIndex]) {
          prevSlides[slideIndex] = {
            ...prevSlides[slideIndex],
            imageUrl: String(response?.heroImage || prevSlides[slideIndex].imageUrl || "").trim(),
          };
        }

        const normalizedServerSlides = normalizeSlides(base?.heroSlides || []);
        const shouldKeepLocalSlides = prevSlides.length > 1 && normalizedServerSlides.length < prevSlides.length;

        if (shouldKeepLocalSlides) {
          toast.info("Uploaded. Multiple slide persistence requires hero_slides DB column.");
        }

        return {
          ...base,
          heroSlides: shouldKeepLocalSlides ? normalizeSlides(prevSlides) : normalizedServerSlides,
        };
      });
      toast.success(response.message);
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setUploadingHeroImageIndex(null);
      event.target.value = "";
    }
  };

  if (loadingSettings) {
    return <Loader label="Loading settings..." />;
  }

  if (!settings) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-5">
        <h2 className="text-base font-semibold text-rose-700">Unable to load settings</h2>
        <p className="mt-1 text-sm text-rose-700">{loadError || "Please try again."}</p>
        <button
          type="button"
          onClick={loadSettings}
          className="mt-3 rounded-lg border border-rose-300 bg-white px-4 py-2 text-sm font-semibold text-rose-700"
        >
          Retry
        </button>
      </div>
    );
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

      <div className="mt-2 border-t border-slate-200 pt-4 md:col-span-2">
        <h3 className="text-base font-semibold text-ink">Homepage Hero Section</h3>
        <p className="mt-1 text-xs text-muted">
          Manage up to 3 hero slides with image, text, button, order, and status.
        </p>
      </div>

      <div className="space-y-4 md:col-span-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-muted">Slides: {heroSlides.length} / {MAX_HERO_SLIDES}</p>
          <button
            type="button"
            onClick={addSlide}
            disabled={heroSlides.length >= MAX_HERO_SLIDES}
            className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-ink disabled:opacity-60"
          >
            Add Hero Slide
          </button>
        </div>

        {heroSlides.map((slide, index) => (
          <div key={slide.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-ink">Hero Slide {index + 1}</p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => moveSlide(index, index - 1)}
                  disabled={index === 0}
                  className="rounded border border-slate-300 px-2 py-1 text-xs font-semibold disabled:opacity-50"
                >
                  Move Up
                </button>
                <button
                  type="button"
                  onClick={() => moveSlide(index, index + 1)}
                  disabled={index === heroSlides.length - 1}
                  className="rounded border border-slate-300 px-2 py-1 text-xs font-semibold disabled:opacity-50"
                >
                  Move Down
                </button>
                <button
                  type="button"
                  onClick={() => removeSlide(index)}
                  disabled={heroSlides.length === 1}
                  className="rounded border border-red-300 px-2 py-1 text-xs font-semibold text-red-700 disabled:opacity-50"
                >
                  Delete
                </button>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <label className="text-sm text-muted md:col-span-2">
                Title
                <input
                  value={slide.title}
                  onChange={(event) => setSlideField(index, "title", event.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </label>

              <label className="text-sm text-muted md:col-span-2">
                Subtitle
                <textarea
                  rows={2}
                  value={slide.subtitle}
                  onChange={(event) => setSlideField(index, "subtitle", event.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </label>

              <label className="text-sm text-muted">
                Button Text
                <input
                  value={slide.buttonText}
                  onChange={(event) => setSlideField(index, "buttonText", event.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </label>

              <label className="text-sm text-muted">
                Button Link
                <input
                  value={slide.buttonLink}
                  onChange={(event) => setSlideField(index, "buttonLink", event.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </label>

              <label className="text-sm text-muted">
                Display Order
                <input
                  type="number"
                  min={1}
                  max={MAX_HERO_SLIDES}
                  value={slide.displayOrder}
                  onChange={(event) => setSlideField(index, "displayOrder", Number(event.target.value) || index + 1)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </label>

              <label className="text-sm text-muted">
                Status
                <select
                  value={slide.status}
                  onChange={(event) => setSlideField(index, "status", event.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </label>

              <div className="md:col-span-2 rounded-lg border border-slate-200 bg-white p-3">
                <p className="text-sm font-semibold text-ink">Hero Slide Image</p>
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(event) => handleHeroImageUpload(event, index)}
                    disabled={uploadingHeroImageIndex === index}
                    className="text-sm text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-brand file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white"
                  />
                  {uploadingHeroImageIndex === index ? (
                    <span className="text-xs text-muted">Uploading image...</span>
                  ) : null}
                </div>

                {slide.imageUrl ? (
                  <img
                    src={slide.imageUrl}
                    alt={`Hero slide ${index + 1} preview`}
                    className="mt-3 h-40 w-full rounded-lg object-cover"
                    onError={(event) => {
                      event.currentTarget.style.display = "none";
                    }}
                  />
                ) : null}
              </div>
            </div>
          </div>
        ))}
      </div>

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
