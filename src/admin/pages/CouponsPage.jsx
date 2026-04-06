import { Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import ConfirmDeleteModal from "../components/ConfirmDeleteModal";
import DataTable from "../components/DataTable";
import EmptyState from "../components/EmptyState";
import Loader from "../components/Loader";
import StatusBadge from "../components/StatusBadge";
import { getApiErrorMessage } from "../../services/apiClient";
import {
  createCoupon,
  deleteCoupon,
  getCoupons,
  updateCoupon,
} from "../services/couponsService";

const initialForm = {
  code: "",
  title: "",
  discountType: "percentage",
  discountValue: 0,
  minimumOrderAmount: 0,
  maximumDiscountAmount: "",
  scopeType: "all",
  applicableProductIdsText: "",
  applicableCategoriesText: "",
  startDate: "",
  endDate: "",
  status: "active",
  totalUsageLimit: "",
  perUserUsageLimit: "",
};

const toCsvText = (values = []) => (Array.isArray(values) ? values.join(", ") : "");

const parseCsvText = (value = "") =>
  String(value || "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

function CouponsPage() {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState("");
  const [form, setForm] = useState(initialForm);

  const loadCoupons = async () => {
    setLoading(true);
    try {
      const data = await getCoupons();
      setCoupons(Array.isArray(data) ? data : []);
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCoupons();
  }, []);

  const resetForm = () => {
    setForm(initialForm);
    setEditingId("");
  };

  const setField = (key) => (event) => {
    const value = event.target.value;
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const buildPayload = (source) => ({
    code: String(source.code || "").trim().toUpperCase(),
    title: String(source.title || "").trim(),
    discountType: source.discountType,
    discountValue: Number(source.discountValue || 0),
    minimumOrderAmount: Number(source.minimumOrderAmount || 0),
    maximumDiscountAmount:
      source.maximumDiscountAmount === "" || source.maximumDiscountAmount == null
        ? null
        : Number(source.maximumDiscountAmount || 0),
    scopeType: source.scopeType,
    applicableProductIds: source.scopeType === "products" ? parseCsvText(source.applicableProductIdsText) : [],
    applicableCategories: source.scopeType === "categories" ? parseCsvText(source.applicableCategoriesText) : [],
    startDate: source.startDate || null,
    endDate: source.endDate || null,
    status: source.status,
    totalUsageLimit: source.totalUsageLimit === "" ? null : Number(source.totalUsageLimit || 0),
    perUserUsageLimit: source.perUserUsageLimit === "" ? null : Number(source.perUserUsageLimit || 0),
  });

  const startEdit = (coupon) => {
    setEditingId(coupon.id);
    setForm({
      code: coupon.code || "",
      title: coupon.title || "",
      discountType: coupon.discountType || "percentage",
      discountValue: String(coupon.discountValue || 0),
      minimumOrderAmount: String(coupon.minimumOrderAmount || 0),
      maximumDiscountAmount: coupon.maximumDiscountAmount == null ? "" : String(coupon.maximumDiscountAmount),
      scopeType: coupon.scopeType || "all",
      applicableProductIdsText: toCsvText(coupon.applicableProductIds),
      applicableCategoriesText: toCsvText(coupon.applicableCategories),
      startDate: coupon.startDate || "",
      endDate: coupon.endDate || "",
      status: coupon.status || "inactive",
      totalUsageLimit: coupon.totalUsageLimit == null ? "" : String(coupon.totalUsageLimit),
      perUserUsageLimit: coupon.perUserUsageLimit == null ? "" : String(coupon.perUserUsageLimit),
    });
  };

  const saveCoupon = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const payload = buildPayload(form);

      if (editingId) {
        const updated = await updateCoupon(editingId, payload);
        setCoupons((prev) => prev.map((entry) => (entry.id === editingId ? updated : entry)));
        toast.success("Coupon updated successfully");
      } else {
        const created = await createCoupon(payload);
        setCoupons((prev) => [created, ...prev]);
        toast.success("Coupon created successfully");
      }

      resetForm();
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (coupon) => {
    try {
      const updated = await updateCoupon(coupon.id, {
        code: coupon.code,
        title: coupon.title,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        minimumOrderAmount: coupon.minimumOrderAmount,
        maximumDiscountAmount: coupon.maximumDiscountAmount,
        scopeType: coupon.scopeType,
        applicableProductIds: coupon.applicableProductIds || [],
        applicableCategories: coupon.applicableCategories || [],
        startDate: coupon.startDate,
        endDate: coupon.endDate,
        status: coupon.status === "active" ? "inactive" : "active",
        totalUsageLimit: coupon.totalUsageLimit,
        perUserUsageLimit: coupon.perUserUsageLimit,
      });
      setCoupons((prev) => prev.map((entry) => (entry.id === coupon.id ? updated : entry)));
      toast.success("Coupon status updated");
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteCoupon(deleteId);
      setCoupons((prev) => prev.filter((entry) => entry.id !== deleteId));
      setDeleteId("");
      toast.success("Coupon deleted");
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return <Loader label="Loading coupons..." />;
  }

  return (
    <div className="space-y-5">
      <form onSubmit={saveCoupon} className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-6">
        <input value={form.code} onChange={setField("code")} required placeholder="Coupon code" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        <input value={form.title} onChange={setField("title")} required placeholder="Coupon title" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        <select value={form.discountType} onChange={setField("discountType")} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
          <option value="percentage">Percentage</option>
          <option value="fixed">Fixed</option>
        </select>
        <input value={form.discountValue} onChange={setField("discountValue")} type="number" step="0.01" min="0.01" required placeholder="Discount value" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        <input value={form.minimumOrderAmount} onChange={setField("minimumOrderAmount")} type="number" step="0.01" min="0" required placeholder="Minimum order" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        <input value={form.maximumDiscountAmount} onChange={setField("maximumDiscountAmount")} type="number" step="0.01" min="0" placeholder="Max discount (optional)" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        <select value={form.scopeType} onChange={setField("scopeType")} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
          <option value="all">All products</option>
          <option value="products">Selected products</option>
          <option value="categories">Selected categories</option>
        </select>
        <input value={form.applicableProductIdsText} onChange={setField("applicableProductIdsText")} placeholder="Product IDs (comma separated)" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        <input value={form.applicableCategoriesText} onChange={setField("applicableCategoriesText")} placeholder="Categories (comma separated)" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        <input value={form.startDate} onChange={setField("startDate")} type="date" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        <input value={form.endDate} onChange={setField("endDate")} type="date" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        <select value={form.status} onChange={setField("status")} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <input value={form.totalUsageLimit} onChange={setField("totalUsageLimit")} type="number" min="1" placeholder="Total usage limit" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        <input value={form.perUserUsageLimit} onChange={setField("perUserUsageLimit")} type="number" min="1" placeholder="Per-user usage limit" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        <button type="submit" disabled={saving} className="inline-flex items-center justify-center gap-1 rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-white disabled:opacity-60">
          <Plus size={14} />
          {saving ? "Saving..." : editingId ? "Update Coupon" : "Add Coupon"}
        </button>
        {editingId ? (
          <button type="button" onClick={resetForm} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700">
            Cancel Edit
          </button>
        ) : null}
      </form>

      <DataTable
        rowKey="id"
        rows={coupons}
        columns={[
          { key: "title", title: "Title" },
          { key: "code", title: "Code" },
          {
            key: "discount",
            title: "Discount",
            render: (row) =>
              row.discountType === "percentage"
                ? `${row.discountValue}%`
                : `Rs. ${Number(row.discountValue || 0).toFixed(2)}`,
          },
          {
            key: "minimumOrderAmount",
            title: "Minimum",
            render: (row) => `Rs. ${Number(row.minimumOrderAmount || 0).toFixed(2)}`,
          },
          {
            key: "scopeType",
            title: "Scope",
            render: (row) => row.scopeType,
          },
          {
            key: "usage",
            title: "Usage",
            render: (row) => (
              <div className="text-xs text-muted">
                <p>Total: {row.usageCount || 0}{row.totalUsageLimit ? ` / ${row.totalUsageLimit}` : ""}</p>
                <p>Users: {row.uniqueUsersUsed || 0}</p>
              </div>
            ),
          },
          {
            key: "status",
            title: "Status",
            render: (row) => <StatusBadge value={row.isExpired ? "expired" : row.status} />,
          },
          {
            key: "validity",
            title: "Validity",
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
        emptyFallback={<EmptyState title="No coupons available" />}
      />

      <ConfirmDeleteModal
        open={Boolean(deleteId)}
        title="Delete Coupon"
        message="The selected coupon will be permanently removed."
        onConfirm={handleDelete}
        onClose={() => setDeleteId("")}
        loading={deleting}
      />
    </div>
  );
}

export default CouponsPage;
