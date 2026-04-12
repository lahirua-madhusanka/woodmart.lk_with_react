import { Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import ConfirmDeleteModal from "../components/ConfirmDeleteModal";
import DataTable from "../components/DataTable";
import EmptyState from "../components/EmptyState";
import Loader from "../components/Loader";
import StatusBadge from "../components/StatusBadge";
import { getApiErrorMessage } from "../../services/apiClient";
import { getProducts } from "../services/productsService";
import {
  createAdminPromotion,
  deleteAdminPromotion,
  getAdminPromotionById,
  getAdminPromotions,
  replaceAdminPromotionProducts,
  updateAdminPromotion,
} from "../services/promotionsService";

const initialForm = {
  title: "",
  slug: "",
  description: "",
  status: "active",
  startDate: "",
  endDate: "",
};

const PRODUCT_PLACEHOLDER =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80"><rect width="80" height="80" fill="#f1f5f9"/><rect x="16" y="18" width="48" height="34" rx="4" fill="#cbd5e1"/><circle cx="30" cy="30" r="5" fill="#94a3b8"/><path d="M20 48l10-10 9 9 7-7 14 14H20z" fill="#e2e8f0"/><rect x="20" y="57" width="40" height="6" rx="3" fill="#cbd5e1"/></svg>'
  );

const toSlug = (value = "") =>
  String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 120);

function PromotionsPage() {
  const [promotions, setPromotions] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState("");
  const [deleteId, setDeleteId] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState(initialForm);

  const [selectedPromotion, setSelectedPromotion] = useState(null);
  const [productRows, setProductRows] = useState([]);
  const [savingProducts, setSavingProducts] = useState(false);

  const productOptions = useMemo(
    () => (Array.isArray(products) ? products : []).map((product) => ({
      id: product._id || product.id,
      name: product.name,
      price: Number(product.price || 0),
      imageUrl: (Array.isArray(product.images) && product.images[0]) || product.image || "",
    })),
    [products]
  );

  const productById = useMemo(
    () => new Map(productOptions.map((option) => [String(option.id), option])),
    [productOptions]
  );

  const assignedProductToPromotion = useMemo(() => {
    const map = new Map();
    for (const promotion of promotions) {
      if (!promotion?.id || promotion.id === selectedPromotion?.id) {
        continue;
      }
      const ids = Array.isArray(promotion.productIds) ? promotion.productIds : [];
      for (const productId of ids) {
        if (!map.has(productId)) {
          map.set(productId, promotion.title || "Another promotion");
        }
      }
    }
    return map;
  }, [promotions, selectedPromotion?.id]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [promotionsData, productsData] = await Promise.all([getAdminPromotions(), getProducts()]);
      setPromotions(Array.isArray(promotionsData) ? promotionsData : []);
      setProducts(Array.isArray(productsData) ? productsData : []);
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const resetForm = () => {
    setEditingId("");
    setForm(initialForm);
  };

  const copyPromotionUrl = async (promotion) => {
    const slug = String(promotion?.slug || "").trim();
    if (!slug) {
      toast.error("Promotion slug is missing");
      return;
    }

    const url = `${window.location.origin}/promotion/${encodeURIComponent(slug)}`;

    try {
      await navigator.clipboard.writeText(url);
      toast.success("Promotion URL copied");
      return;
    } catch {
      // Fallback for environments without clipboard permissions.
    }

    try {
      const helper = document.createElement("textarea");
      helper.value = url;
      helper.setAttribute("readonly", "");
      helper.style.position = "fixed";
      helper.style.left = "-9999px";
      document.body.appendChild(helper);
      helper.select();
      const copied = document.execCommand("copy");
      document.body.removeChild(helper);

      if (copied) {
        toast.success("Promotion URL copied");
      } else {
        toast.info("Copy not supported. URL: " + url);
      }
    } catch {
      toast.info("Copy not supported. URL: " + url);
    }
  };

  const handleFieldChange = (field) => (event) => {
    const value = event.target.value;
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === "title" && !String(prev.slug || "").trim()) {
        next.slug = toSlug(value);
      }
      return next;
    });
  };

  const savePromotion = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const payload = {
        title: form.title,
        slug: form.slug || toSlug(form.title),
        description: form.description || null,
        status: form.status,
        startDate: form.startDate || null,
        endDate: form.endDate || null,
      };

      if (editingId) {
        await updateAdminPromotion(editingId, payload);
        toast.success("Promotion updated");
      } else {
        await createAdminPromotion(payload);
        toast.success("Promotion created");
      }

      await loadData();
      resetForm();
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (promotion) => {
    setEditingId(promotion.id);
    setForm({
      title: promotion.title || "",
      slug: promotion.slug || "",
      description: promotion.description || "",
      status: promotion.status || "inactive",
      startDate: promotion.startDate || "",
      endDate: promotion.endDate || "",
    });
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await deleteAdminPromotion(deleteId);
      await loadData();
      if (selectedPromotion?.id === deleteId) {
        setSelectedPromotion(null);
        setProductRows([]);
      }
      setDeleteId("");
      toast.success("Promotion deleted");
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setDeleting(false);
    }
  };

  const openProductManager = async (promotionId) => {
    try {
      const details = await getAdminPromotionById(promotionId);
      setSelectedPromotion(details);
      setProductRows(
        (details?.products || []).map((item) => ({
          productId: item.productId,
          discountPercentage: Number(item.discountPercentage || 0),
        }))
      );
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    }
  };

  const addProductRow = () => {
    setProductRows((prev) => [...prev, { productId: "", discountPercentage: 10 }]);
  };

  const addProductFromCatalog = (productId) => {
    const normalizedId = String(productId || "").trim();
    if (!normalizedId) return;

    const assignedPromotionTitle = assignedProductToPromotion.get(normalizedId);
    if (assignedPromotionTitle) {
      toast.error(`A product can belong to only one promotion. Already in: ${assignedPromotionTitle}`);
      return;
    }

    if (productRows.some((row) => String(row.productId || "") === normalizedId)) {
      toast.error("This product is already selected in this promotion");
      return;
    }

    setProductRows((prev) => [...prev, { productId: normalizedId, discountPercentage: 10 }]);
  };

  const updateProductRow = (index, key, value) => {
    setProductRows((prev) =>
      prev.map((row, rowIndex) => (rowIndex === index ? { ...row, [key]: value } : row))
    );
  };

  const removeProductRow = (index) => {
    setProductRows((prev) => prev.filter((_, rowIndex) => rowIndex !== index));
  };

  const savePromotionProducts = async () => {
    if (!selectedPromotion?.id) return;

    const cleanedRows = productRows
      .filter((row) => row.productId)
      .map((row) => ({
        productId: row.productId,
        discountPercentage: Number(row.discountPercentage || 0),
      }));

    if (cleanedRows.some((row) => !Number.isFinite(row.discountPercentage) || row.discountPercentage <= 0 || row.discountPercentage > 95)) {
      toast.error("Each discount percentage must be between 1 and 95");
      return;
    }

    const seen = new Set();
    for (const row of cleanedRows) {
      if (seen.has(row.productId)) {
        toast.error("Duplicate products are not allowed in one promotion");
        return;
      }
      seen.add(row.productId);

      const assignedPromotionTitle = assignedProductToPromotion.get(row.productId);
      if (assignedPromotionTitle) {
        toast.error(`A product can belong to only one promotion. Already in: ${assignedPromotionTitle}`);
        return;
      }
    }

    setSavingProducts(true);
    try {
      const updated = await replaceAdminPromotionProducts(selectedPromotion.id, cleanedRows);
      setSelectedPromotion(updated);
      setProductRows(
        (updated?.products || []).map((item) => ({
          productId: item.productId,
          discountPercentage: Number(item.discountPercentage || 0),
        }))
      );
      await loadData();
      toast.success("Promotion products updated");
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setSavingProducts(false);
    }
  };

  if (loading) {
    return <Loader label="Loading promotions..." />;
  }

  return (
    <div className="space-y-5">
      <form onSubmit={savePromotion} className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-6">
        <input value={form.title} onChange={handleFieldChange("title")} required placeholder="Promotion title" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        <input value={form.slug} onChange={handleFieldChange("slug")} required placeholder="Slug" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        <select value={form.status} onChange={handleFieldChange("status")} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <input type="date" value={form.startDate} onChange={handleFieldChange("startDate")} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        <input type="date" value={form.endDate} onChange={handleFieldChange("endDate")} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />

        <textarea value={form.description} onChange={handleFieldChange("description")} rows={3} placeholder="Description (optional)" className="md:col-span-6 rounded-lg border border-slate-300 px-3 py-2 text-sm" />

        <div className="md:col-span-6 flex flex-wrap items-center gap-2">
          <button type="submit" disabled={saving} className="inline-flex items-center gap-1 rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-white disabled:opacity-60">
            <Plus size={14} />
            {saving ? "Saving..." : editingId ? "Update Promotion" : "Create Promotion"}
          </button>
          {editingId ? (
            <button type="button" onClick={resetForm} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700">
              Cancel Edit
            </button>
          ) : null}
        </div>
      </form>

      <DataTable
        rowKey="id"
        rows={promotions}
        columns={[
          { key: "title", title: "Title" },
          { key: "slug", title: "Slug" },
          {
            key: "status",
            title: "Status",
            render: (row) => <StatusBadge value={row.status} />,
          },
          {
            key: "productCount",
            title: "Products",
            render: (row) => Number(row.productCount || 0),
          },
          {
            key: "dateWindow",
            title: "Date Window",
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
                <button type="button" onClick={() => startEdit(row)} className="rounded-md border border-slate-300 p-2 text-slate-700">
                  <Pencil size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => copyPromotionUrl(row)}
                  className="rounded-md border border-slate-300 px-2 py-1 text-xs"
                >
                  Copy URL
                </button>
                <button type="button" onClick={() => openProductManager(row.id)} className="rounded-md border border-slate-300 px-2 py-1 text-xs">
                  Products
                </button>
                <button type="button" onClick={() => setDeleteId(row.id)} className="rounded-md border border-red-200 p-2 text-red-600">
                  <Trash2 size={13} />
                </button>
              </div>
            ),
          },
        ]}
        emptyFallback={<EmptyState title="No promotions available" />}
      />

      {selectedPromotion ? (
        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-ink">Promotion Products: {selectedPromotion.title}</h2>
            <button type="button" onClick={addProductRow} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700">
              Add Product
            </button>
          </div>

          <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Available Products</p>
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {productOptions.map((option) => {
                const assignedPromotionTitle = assignedProductToPromotion.get(option.id);
                const disabled = Boolean(assignedPromotionTitle);
                const selectedInCurrent = productRows.some((row) => String(row.productId || "") === String(option.id));

                return (
                  <button
                    key={`catalog-${option.id}`}
                    type="button"
                    disabled={disabled || selectedInCurrent}
                    onClick={() => addProductFromCatalog(option.id)}
                    className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-2 text-left transition hover:border-brand disabled:cursor-not-allowed disabled:opacity-55"
                  >
                    <img
                      src={option.imageUrl || PRODUCT_PLACEHOLDER}
                      alt={option.name}
                      className="h-11 w-11 rounded-md border border-slate-200 object-cover"
                      onError={(event) => {
                        event.currentTarget.src = PRODUCT_PLACEHOLDER;
                      }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-ink">{option.name}</p>
                      {disabled ? (
                        <p className="truncate text-xs text-red-600">Already in: {assignedPromotionTitle}</p>
                      ) : selectedInCurrent ? (
                        <p className="text-xs text-emerald-700">Already selected</p>
                      ) : (
                        <p className="text-xs text-muted">Click to add</p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            {productRows.map((row, index) => (
              <div key={`${row.productId}-${index}`} className="grid gap-3 rounded-lg border border-slate-200 bg-white p-3 md:grid-cols-[1fr_170px_auto]">
                <div>
                  {row.productId ? (
                  <div className="mb-2 flex items-center gap-3">
                    <img
                      src={productById.get(String(row.productId || ""))?.imageUrl || PRODUCT_PLACEHOLDER}
                      alt={productById.get(String(row.productId || ""))?.name || "Selected product"}
                      className="h-12 w-12 rounded-md border border-slate-200 object-cover"
                      onError={(event) => {
                        event.currentTarget.src = PRODUCT_PLACEHOLDER;
                      }}
                    />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-ink">
                        {productById.get(String(row.productId || ""))?.name || "No product selected"}
                      </p>
                      <p className="text-xs text-muted">Selected product</p>
                    </div>
                  </div>
                  ) : null}

                  {row.productId ? (
                    <input type="hidden" value={row.productId} readOnly />
                  ) : (
                    <select
                      value={row.productId}
                      onChange={(event) => updateProductRow(index, "productId", event.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    >
                      <option value="">Select product</option>
                      {productOptions.map((option) => (
                        <option key={option.id} value={option.id} disabled={Boolean(assignedProductToPromotion.get(option.id))}>
                          {option.name} ({option.id.slice(-6).toUpperCase()})
                          {assignedProductToPromotion.get(option.id)
                            ? ` - already in ${assignedProductToPromotion.get(option.id)}`
                            : ""}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <input
                  type="number"
                  min="1"
                  max="95"
                  value={row.discountPercentage}
                  onChange={(event) => updateProductRow(index, "discountPercentage", Number(event.target.value || 0))}
                  className="h-fit rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Discount %"
                />

                <button type="button" onClick={() => removeProductRow(index)} className="h-fit rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-600">
                  Remove
                </button>
              </div>
            ))}
          </div>

          <div className="mt-4 flex justify-end">
            <button type="button" onClick={savePromotionProducts} disabled={savingProducts} className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
              {savingProducts ? "Saving..." : "Save Promotion Products"}
            </button>
          </div>
        </section>
      ) : null}

      <ConfirmDeleteModal
        open={Boolean(deleteId)}
        title="Delete Promotion"
        message="This promotion will be permanently removed."
        onConfirm={handleDelete}
        onClose={() => setDeleteId("")}
        loading={deleting}
      />
    </div>
  );
}

export default PromotionsPage;
