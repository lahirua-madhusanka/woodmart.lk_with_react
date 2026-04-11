import { Pencil, Plus, Trash2, Upload } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import ConfirmDeleteModal from "../components/ConfirmDeleteModal";
import DataTable from "../components/DataTable";
import EmptyState from "../components/EmptyState";
import Loader from "../components/Loader";
import StatusBadge from "../components/StatusBadge";
import { getApiErrorMessage } from "../../services/apiClient";
import {
  createBanner,
  deleteBanner,
  getBanners,
  uploadBannerImage,
  updateBanner,
} from "../services/bannersService";

const sectionOptions = [
  { value: "promo_strip", label: "Promo Strip" },
  { value: "category_promo", label: "Category Promo" },
  { value: "featured_section", label: "Featured Section" },
  { value: "secondary_banner", label: "Secondary Banner" },
];

const initialForm = {
  title: "",
  subtitle: "",
  imageUrl: "",
  buttonText: "",
  buttonLink: "/shop",
  section: "promo_strip",
  displayOrder: 0,
  status: "active",
  startDate: "",
  endDate: "",
};

function BannersPage() {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [editingId, setEditingId] = useState("");
  const [form, setForm] = useState(initialForm);

  const loadBanners = async () => {
    setLoading(true);
    try {
      const data = await getBanners();
      setBanners(Array.isArray(data) ? data : []);
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBanners();
  }, []);

  const resetForm = () => {
    setForm(initialForm);
    setEditingId("");
  };

  const handleInput = (key) => (event) => {
    const value = event.target.value;
    setForm((prev) => ({
      ...prev,
      [key]: key === "displayOrder" ? Number(value || 0) : value,
    }));
  };

  const startEdit = (banner) => {
    setEditingId(banner.id);
    setForm({
      title: banner.title || "",
      subtitle: banner.subtitle || "",
      imageUrl: banner.imageUrl || "",
      buttonText: banner.buttonText || "",
      buttonLink: banner.buttonLink || "/shop",
      section: banner.section || "promo_strip",
      displayOrder: Number(banner.displayOrder || 0),
      status: banner.status || "inactive",
      startDate: banner.startDate || "",
      endDate: banner.endDate || "",
    });
  };

  const saveBanner = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const payload = {
        title: form.title,
        subtitle: form.subtitle,
        imageUrl: form.imageUrl,
        buttonText: form.buttonText,
        buttonLink: form.buttonLink,
        section: form.section,
        displayOrder: Number(form.displayOrder || 0),
        status: form.status,
        startDate: form.startDate || null,
        endDate: form.endDate || null,
      };

      if (editingId) {
        await updateBanner(editingId, payload);
        toast.success("Banner updated successfully");
      } else {
        await createBanner(payload);
        toast.success("Banner created successfully");
      }

      await loadBanners();
      resetForm();
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (banner) => {
    try {
      await updateBanner(banner.id, {
        title: banner.title,
        subtitle: banner.subtitle,
        imageUrl: banner.imageUrl,
        buttonText: banner.buttonText,
        buttonLink: banner.buttonLink,
        section: banner.section,
        displayOrder: Number(banner.displayOrder || 0),
        status: banner.status === "active" ? "inactive" : "active",
        startDate: banner.startDate,
        endDate: banner.endDate,
      });
      await loadBanners();
      toast.success("Banner status updated");
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    }
  };

  const handleImageUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const response = await uploadBannerImage(file);
      setForm((prev) => ({ ...prev, imageUrl: response?.imageUrl || prev.imageUrl }));
      toast.success(response?.message || "Banner image uploaded");
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setUploadingImage(false);
      event.target.value = "";
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteBanner(deleteId);
      await loadBanners();
      setDeleteId("");
      toast.success("Banner deleted");
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return <Loader label="Loading banners..." />;
  }

  return (
    <div className="space-y-5">
      <form onSubmit={saveBanner} className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-6">
        <input
          required
          value={form.title}
          onChange={handleInput("title")}
          placeholder="Banner title"
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <input
          value={form.subtitle}
          onChange={handleInput("subtitle")}
          placeholder="Subtitle"
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <select
          value={form.section}
          onChange={handleInput("section")}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          {sectionOptions.map((section) => (
            <option key={section.value} value={section.value}>
              {section.label}
            </option>
          ))}
        </select>
        <input
          value={form.buttonText}
          onChange={handleInput("buttonText")}
          placeholder="Button text"
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <input
          value={form.buttonLink}
          onChange={handleInput("buttonLink")}
          placeholder="Button link"
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <input
          type="number"
          min="0"
          value={form.displayOrder}
          onChange={handleInput("displayOrder")}
          placeholder="Display order"
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />

        <select
          value={form.status}
          onChange={handleInput("status")}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>

        <input
          type="date"
          value={form.startDate}
          onChange={handleInput("startDate")}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />

        <input
          type="date"
          value={form.endDate}
          onChange={handleInput("endDate")}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />

        <div className="md:col-span-2 flex items-center gap-2">
          <input
            type="text"
            value={form.imageUrl}
            onChange={handleInput("imageUrl")}
            required
            placeholder="Image URL (auto-filled after upload)"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <label className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700">
            <Upload size={14} />
            {uploadingImage ? "Uploading..." : "Upload"}
            <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
          </label>
        </div>

        <div className="md:col-span-6 flex flex-wrap items-center gap-2">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-1 rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            <Plus size={14} />
            {saving ? "Saving..." : editingId ? "Update Banner" : "Add Banner"}
          </button>
          {editingId ? (
            <button
              type="button"
              onClick={resetForm}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700"
            >
              Cancel Edit
            </button>
          ) : null}
        </div>

        {form.imageUrl ? (
          <div className="md:col-span-6 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Preview</p>
            <img src={form.imageUrl} alt="Banner preview" className="h-36 w-full rounded-lg object-cover" loading="lazy" />
          </div>
        ) : null}
      </form>

      <DataTable
        rowKey="id"
        rows={banners}
        columns={[
          {
            key: "banner",
            title: "Banner",
            render: (row) => (
              <div className="flex items-center gap-3">
                <img src={row.imageUrl} alt={row.title} className="h-10 w-16 rounded-md object-cover" loading="lazy" />
                <div>
                  <p className="font-semibold text-ink">{row.title}</p>
                  <p className="text-xs text-muted">{row.subtitle}</p>
                </div>
              </div>
            ),
          },
          { key: "section", title: "Section" },
          { key: "displayOrder", title: "Order" },
          {
            key: "status",
            title: "Status",
            render: (row) => <StatusBadge value={row.status} />,
          },
          {
            key: "schedule",
            title: "Schedule",
            render: (row) => (
              <div className="text-xs text-muted">
                <p>Start: {row.startDate || "-"}</p>
                <p>End: {row.endDate || "-"}</p>
              </div>
            ),
          },
          {
            key: "actions",
            title: "Actions",
            render: (row) => (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => startEdit(row)}
                  className="rounded-md border border-slate-300 p-2 text-slate-700"
                >
                  <Pencil size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => toggleStatus(row)}
                  className="rounded-md border border-slate-300 px-2 py-1 text-xs"
                >
                  {row.status === "active" ? "Disable" : "Enable"}
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteId(row.id)}
                  className="rounded-md border border-red-200 p-2 text-red-600"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ),
          },
        ]}
        emptyFallback={<EmptyState title="No banners configured" />}
      />

      <ConfirmDeleteModal
        open={Boolean(deleteId)}
        title="Delete Banner"
        message="This banner will be permanently deleted."
        onConfirm={handleDelete}
        onClose={() => setDeleteId("")}
        loading={deleting}
      />
    </div>
  );
}

export default BannersPage;
