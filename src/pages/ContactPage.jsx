import { Clock3, Mail, MapPin, Phone } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useStorefrontSettings } from "../context/StorefrontSettingsContext";
import { getApiErrorMessage } from "../services/apiClient";
import { submitContactInquiryApi } from "../services/contactService";

const splitName = (name = "") => {
  const normalized = String(name || "").trim().replace(/\s+/g, " ");
  if (!normalized) {
    return { firstName: "", lastName: "" };
  }

  const [firstName, ...rest] = normalized.split(" ");
  return {
    firstName: firstName || "",
    lastName: rest.join(" "),
  };
};

function ContactPage() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const { settings } = useStorefrontSettings();
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    subject: "",
    message: "",
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitState, setSubmitState] = useState({ type: "", message: "" });
  const [touchedIdentity, setTouchedIdentity] = useState({
    firstName: false,
    lastName: false,
    email: false,
  });

  const identityDefaults = useMemo(() => {
    const nameParts = splitName(user?.name || "");
    return {
      firstName: String(user?.firstName || nameParts.firstName || "").trim(),
      lastName: String(user?.lastName || nameParts.lastName || "").trim(),
      email: String(user?.email || "").trim().toLowerCase(),
    };
  }, [user]);

  useEffect(() => {
    if (authLoading || !isAuthenticated) {
      return;
    }

    setForm((prev) => ({
      ...prev,
      firstName: touchedIdentity.firstName ? prev.firstName : prev.firstName || identityDefaults.firstName,
      lastName: touchedIdentity.lastName ? prev.lastName : prev.lastName || identityDefaults.lastName,
      email: touchedIdentity.email ? prev.email : prev.email || identityDefaults.email,
    }));
  }, [authLoading, identityDefaults, isAuthenticated, touchedIdentity.email, touchedIdentity.firstName, touchedIdentity.lastName]);

  const storeInfo = useMemo(
    () => ({
      storeName: settings.storeName || "Woodmart.lk",
      address: settings.storeAddress || "224 Artisan Street, New York",
      phone: settings.contactNumber || "+1 (212) 555-0193",
      email: settings.supportEmail || "support@woodmart.lk",
      businessHours: settings.businessHours || "Mon - Sat, 9:00 AM - 7:00 PM",
      supportNote:
        settings.supportNote ||
        "Visit our showroom or contact our team for personalized recommendations.",
      imageUrl:
        settings.contactImageUrl ||
        "https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1000&q=80",
    }),
    [settings]
  );

  const setField = (key) => (event) => {
    const value = event.target.value;
    if (key === "firstName" || key === "lastName" || key === "email") {
      setTouchedIdentity((prev) => ({ ...prev, [key]: true }));
    }
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const validate = () => {
    const next = {};
    if (!form.firstName.trim()) next.firstName = "First name is required";
    if (!form.lastName.trim()) next.lastName = "Last name is required";
    if (!form.email.trim()) {
      next.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      next.email = "Enter a valid email address";
    }
    if (!form.subject.trim()) next.subject = "Subject is required";
    if (!form.message.trim()) next.message = "Message is required";
    return next;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting) return;

    const validationErrors = validate();
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length) return;

    setSubmitting(true);
    setSubmitState({ type: "", message: "" });

    try {
      const response = await submitContactInquiryApi({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim().toLowerCase(),
        subject: form.subject.trim(),
        message: form.message.trim(),
      });

      setSubmitState({
        type: "success",
        message: response?.message || "Message sent successfully.",
      });
      setForm((prev) => ({
        firstName: isAuthenticated ? prev.firstName : "",
        lastName: isAuthenticated ? prev.lastName : "",
        email: isAuthenticated ? prev.email : "",
        subject: "",
        message: "",
      }));
      setErrors({});
    } catch (error) {
      setSubmitState({
        type: "error",
        message: getApiErrorMessage(error),
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="container-pad py-10">
      <div className="mb-8 text-center">
        <p className="text-xs font-semibold uppercase tracking-wider text-brand">Contact</p>
        <h1 className="font-display text-4xl font-bold">We are here to help</h1>
        <p className="mx-auto mt-2 max-w-xl text-sm text-muted">
          Reach out for product guidance, order support, or partnership inquiries.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
        <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm">
              <span className="mb-1 block font-semibold">First Name</span>
              <input
                value={form.firstName}
                onChange={setField("firstName")}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-brand"
              />
              {errors.firstName ? <span className="mt-1 block text-xs text-red-600">{errors.firstName}</span> : null}
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-semibold">Last Name</span>
              <input
                value={form.lastName}
                onChange={setField("lastName")}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-brand"
              />
              {errors.lastName ? <span className="mt-1 block text-xs text-red-600">{errors.lastName}</span> : null}
            </label>
          </div>

          <label className="text-sm">
            <span className="mb-1 block font-semibold">Email</span>
            <input
              type="email"
              value={form.email}
              onChange={setField("email")}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-brand"
            />
            {errors.email ? <span className="mt-1 block text-xs text-red-600">{errors.email}</span> : null}
          </label>

          <label className="text-sm">
            <span className="mb-1 block font-semibold">Subject</span>
            <input
              value={form.subject}
              onChange={setField("subject")}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-brand"
            />
            {errors.subject ? <span className="mt-1 block text-xs text-red-600">{errors.subject}</span> : null}
          </label>

          <label className="text-sm">
            <span className="mb-1 block font-semibold">Message</span>
            <textarea
              rows="6"
              value={form.message}
              onChange={setField("message")}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-brand"
            />
            {errors.message ? <span className="mt-1 block text-xs text-red-600">{errors.message}</span> : null}
          </label>

          {submitState.message ? (
            <div
              className={`rounded-lg px-3 py-2 text-sm ${
                submitState.type === "success"
                  ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border border-rose-200 bg-rose-50 text-rose-700"
              }`}
            >
              {submitState.message}
            </div>
          ) : null}

          <button type="submit" disabled={submitting} className="btn-primary disabled:cursor-not-allowed disabled:opacity-60">
            {submitting ? "Sending..." : "Send Message"}
          </button>
        </form>

        <aside className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div>
            <h2 className="text-xl font-semibold text-ink">Store Information</h2>
            <p className="mt-1 text-sm font-medium text-brand-dark">{storeInfo.storeName}</p>
          </div>
          <p className="text-sm leading-relaxed text-muted">{storeInfo.supportNote}</p>
          <div className="space-y-3 rounded-lg border border-slate-100 bg-slate-50 p-4 text-sm text-muted">
            <p className="inline-flex items-start gap-2 leading-relaxed"><MapPin size={16} className="mt-0.5 text-brand" />{storeInfo.address}</p>
            <p className="inline-flex items-center gap-2"><Phone size={16} className="text-brand" />{storeInfo.phone}</p>
            <p className="inline-flex items-center gap-2"><Mail size={16} className="text-brand" />{storeInfo.email}</p>
            <p className="inline-flex items-center gap-2"><Clock3 size={16} className="text-brand" />{storeInfo.businessHours}</p>
          </div>
          <div className="overflow-hidden rounded-xl border border-slate-200">
            <img
              src={storeInfo.imageUrl}
              alt="Store studio"
              className="h-56 w-full object-cover"
            />
          </div>
        </aside>
      </div>
    </section>
  );
}

export default ContactPage;