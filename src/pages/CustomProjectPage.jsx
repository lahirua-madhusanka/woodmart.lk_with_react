import { Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { useAuth } from "../context/AuthContext";
import { getApiErrorMessage } from "../services/apiClient";
import { createCustomProjectRequestApi } from "../services/customProjectService";
import { getUserPhone } from "../account/utils/userAccountStorage";

const emptyForm = {
  description: "",
  specifications: "",
  budget: "",
  deadline: "",
  name: "",
  email: "",
  mobile: "",
};

const acceptedImageMimeTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const maxImages = 5;

function CustomProjectPage() {
  const { user, isAuthenticated } = useAuth();
  const [form, setForm] = useState(emptyForm);
  const [images, setImages] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      return;
    }

    setForm((prev) => ({
      ...prev,
      name: user.name || "",
      email: user.email || "",
      mobile: getUserPhone(user._id || user.id) || prev.mobile || "",
    }));
  }, [isAuthenticated, user]);

  useEffect(
    () => () => {
      images.forEach((entry) => URL.revokeObjectURL(entry.previewUrl));
    },
    [images]
  );

  const canSubmit = useMemo(() => {
    return (
      form.description.trim() &&
      form.name.trim() &&
      form.email.trim() &&
      form.mobile.trim() &&
      !submitting
    );
  }, [form, submitting]);

  const setField = (key) => (event) => {
    setForm((prev) => ({ ...prev, [key]: event.target.value }));
  };

  const onFileChange = (event) => {
    const selected = Array.from(event.target.files || []);
    if (!selected.length) {
      return;
    }

    if (images.length + selected.length > maxImages) {
      toast.error(`You can upload up to ${maxImages} images only`);
      event.target.value = "";
      return;
    }

    const invalid = selected.find((file) => !acceptedImageMimeTypes.includes(file.type));
    if (invalid) {
      toast.error("Only image files are allowed (jpg, png, webp, gif)");
      event.target.value = "";
      return;
    }

    const next = selected.map((file) => ({
      file,
      previewUrl: URL.createObjectURL(file),
    }));

    setImages((prev) => [...prev, ...next]);
    event.target.value = "";
  };

  const removeImageAt = (index) => {
    setImages((prev) => {
      const target = prev[index];
      if (target?.previewUrl) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return prev.filter((_, idx) => idx !== index);
    });
  };

  const resetForm = () => {
    setForm((prev) => ({
      ...emptyForm,
      name: isAuthenticated ? user?.name || "" : "",
      email: isAuthenticated ? user?.email || "" : "",
      mobile: isAuthenticated ? getUserPhone(user?._id || user?.id) || "" : "",
    }));

    setImages((prev) => {
      prev.forEach((entry) => URL.revokeObjectURL(entry.previewUrl));
      return [];
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!canSubmit) {
      toast.error("Please fill all required fields");
      return;
    }

    const payload = new FormData();
    payload.append("description", form.description.trim());
    payload.append("name", form.name.trim());
    payload.append("email", form.email.trim());
    payload.append("mobile", form.mobile.trim());
    if (form.specifications.trim()) payload.append("specifications", form.specifications.trim());
    if (form.budget.trim()) payload.append("budget", form.budget.trim());
    if (form.deadline.trim()) payload.append("deadline", form.deadline.trim());
    images.forEach((entry) => payload.append("images", entry.file));

    setSubmitting(true);
    try {
      await createCustomProjectRequestApi(payload);
      toast.success("Your custom project request has been submitted");
      resetForm();
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="container-pad py-10 md:py-14">
      <div className="mx-auto max-w-5xl space-y-5">
        <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand">Custom Project Request</p>
          <h1 className="mt-2 font-display text-4xl text-ink md:text-5xl">Tell us what you want us to build</h1>
          <p className="mt-4 text-sm text-muted md:text-base">
            Share your custom idea and reference images. Our team will review your request and send a quotation.
          </p>
          {isAuthenticated ? (
            <Link to="/my-requests" className="mt-4 inline-flex text-sm font-semibold text-brand hover:underline">
              View my submitted requests
            </Link>
          ) : null}
        </header>

        <form onSubmit={handleSubmit} className="grid gap-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="grid gap-3">
            <label className="text-sm font-semibold text-ink" htmlFor="description">
              Product description *
            </label>
            <textarea
              id="description"
              value={form.description}
              onChange={setField("description")}
              rows={6}
              placeholder="Describe your idea, preferred material, style, and finish..."
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand"
              required
            />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <label className="text-sm">
              <span className="mb-1 block font-semibold text-ink">Specifications (optional)</span>
              <input
                value={form.specifications}
                onChange={setField("specifications")}
                placeholder="Size, material, color"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-brand"
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-semibold text-ink">Budget (optional)</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.budget}
                onChange={setField("budget")}
                placeholder="50000"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-brand"
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-semibold text-ink">Deadline (optional)</span>
              <input
                type="date"
                value={form.deadline}
                onChange={setField("deadline")}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-brand"
              />
            </label>
          </div>

          <div className="grid gap-3">
            <label className="text-sm font-semibold text-ink" htmlFor="images">
              Reference images (optional, up to {maxImages})
            </label>
            <input
              id="images"
              type="file"
              accept="image/*"
              multiple
              onChange={onFileChange}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            />

            {images.length ? (
              <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
                {images.map((entry, index) => (
                  <div key={`${entry.file.name}-${index}`} className="relative overflow-hidden rounded-lg border border-slate-200">
                    <img src={entry.previewUrl} alt={`Preview ${index + 1}`} className="h-28 w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeImageAt(index)}
                      className="absolute right-1 top-1 rounded bg-black/70 px-2 py-1 text-xs font-semibold text-white"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          <div className="h-px bg-slate-200" />

          <div className="grid gap-4 md:grid-cols-3">
            <label className="text-sm">
              <span className="mb-1 block font-semibold text-ink">Full name *</span>
              <input
                value={form.name}
                onChange={setField("name")}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-brand"
                required
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-semibold text-ink">Email *</span>
              <input
                type="email"
                value={form.email}
                onChange={setField("email")}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-brand"
                required
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-semibold text-ink">Mobile number *</span>
              <input
                value={form.mobile}
                onChange={setField("mobile")}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-brand"
                required
              />
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={!canSubmit}
              className="rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              {submitting ? "Submitting request..." : "Submit request"}
            </button>
            <p className="text-xs text-muted">Admin will review and respond with quotation status.</p>
          </div>
        </form>
      </div>
    </section>
  );
}

export default CustomProjectPage;
