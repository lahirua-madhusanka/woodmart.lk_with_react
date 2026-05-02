import { Edit, Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import ConfirmDeleteModal from "../components/ConfirmDeleteModal";
import DataTable from "../components/DataTable";
import EmptyState from "../components/EmptyState";
import FilterDropdown from "../components/FilterDropdown";
import Loader from "../components/Loader";
import SearchBar from "../components/SearchBar";
import StatusBadge from "../components/StatusBadge";
import { getApiErrorMessage } from "../../services/apiClient";
import usePagination from "../hooks/usePagination";
import {
  deleteProduct,
  getCategories,
  getProducts,
} from "../services/productsService";
import { getProductPricing } from "../../utils/pricing";

function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const navigate = useNavigate();

  const loadProducts = async () => {
    setLoading(true);
    try {
      const [productsData, categoriesData] = await Promise.all([getProducts(), getCategories()]);
      setProducts(Array.isArray(productsData) ? productsData : []);
      setCategories((Array.isArray(categoriesData) ? categoriesData : []).map((item) => item.name || item));
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const filtered = useMemo(() => {
    const lowered = query.toLowerCase().trim();
    return products.filter((item) => {
      const byCategory = category === "all" ? true : item.category === category;
      const byQuery = lowered
        ? item.name?.toLowerCase().includes(lowered) || item.description?.toLowerCase().includes(lowered)
        : true;
      return byCategory && byQuery;
    });
  }, [products, category, query]);

  const { page, totalPages, data, setPage } = usePagination(filtered, 8);

  const getTotalStock = (product) =>
    (Array.isArray(product?.variations) ? product.variations : [])
      .reduce((sum, variation) => sum + Number(variation?.stock || 0), 0);

  const handleDelete = async () => {
    const targetId = deleteTarget?._id;
    if (!targetId) return;

    setDeleting(true);
    try {
      await deleteProduct(targetId);
      await loadProducts();
      setDeleteTarget(null);
      toast.success("Product deleted");
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return <Loader label="Loading products..." />;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <SearchBar value={query} onChange={setQuery} placeholder="Search products" />
          <FilterDropdown
            value={category}
            onChange={setCategory}
            label="Category"
            options={[
              { value: "all", label: "All categories" },
              ...categories.map((item) => ({ value: item, label: item })),
            ]}
          />
        </div>
        <Link
          to="/admin/products/add"
          className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white"
        >
          <Plus size={15} />
          Add Product
        </Link>
      </div>

      <DataTable
        rowKey="_id"
        rows={data}
        columns={[
          {
            key: "product",
            title: "Product",
            render: (row) => (
              <div className="flex items-center gap-3">
                <img
                  src={row.image || row.images?.[0] || "https://via.placeholder.com/80x80?text=No+Image"}
                  alt={row.name}
                  className="h-10 w-10 rounded-md border border-slate-200 object-cover"
                  loading="lazy"
                />
                <div>
                  <p className="font-semibold text-ink">{row.name}</p>
                  <p className="text-xs text-muted">{row.slug || row._id}</p>
                </div>
              </div>
            ),
          },
          { key: "category", title: "Category" },
          {
            key: "price",
            title: "Price",
            render: (row) => {
              const pricing = getProductPricing(row);
              return `Rs. ${Number(pricing.finalPrice || 0).toFixed(2)}`;
            },
          },
          {
            key: "discountPrice",
            title: "Discount",
            render: (row) => {
              const pricing = getProductPricing(row);
              if (!pricing.hasDiscount) return "-";
              return `Rs. ${Number(pricing.finalPrice || 0).toFixed(2)}`;
            },
          },
          {
            key: "productCost",
            title: "Cost",
            render: (row) => {
              const variations = Array.isArray(row?.variations) ? row.variations : [];
              if (!variations.length) return "-";
              const minCost = variations.reduce((acc, variation) => {
                const cost = Number(variation?.cost ?? 0);
                if (!Number.isFinite(cost)) return acc;
                return acc == null ? cost : Math.min(acc, cost);
              }, null);
              return minCost == null ? "-" : `Rs. ${minCost.toFixed(2)}`;
            },
          },
          {
            key: "shippingPrice",
            title: "Shipping",
            render: (row) => `Rs. ${Number(row.shippingPrice || 0).toFixed(2)}`,
          },
          {
            key: "stock",
            title: "Stock",
            render: (row) => getTotalStock(row),
          },
          {
            key: "status",
            title: "Status",
            render: (row) => (
              <StatusBadge value={getTotalStock(row) <= 10 ? "low" : "active"} />
            ),
          },
          {
            key: "actions",
            title: "Actions",
            render: (row) => (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => navigate(`/admin/products/edit/${row._id}`)}
                  className="rounded-md border border-slate-300 p-2 text-slate-700 hover:border-brand hover:text-brand"
                >
                  <Edit size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteTarget({ _id: row._id, name: row.name })}
                  className="rounded-md border border-red-200 p-2 text-red-600 hover:bg-red-50"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ),
          },
        ]}
        emptyFallback={<EmptyState title="No products found" />}
      />

      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => setPage(page - 1)}
          disabled={page <= 1}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm disabled:opacity-40"
        >
          Prev
        </button>
        <span className="text-sm text-muted">
          Page {page} of {totalPages}
        </span>
        <button
          type="button"
          onClick={() => setPage(page + 1)}
          disabled={page >= totalPages}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm disabled:opacity-40"
        >
          Next
        </button>
      </div>

      <ConfirmDeleteModal
        open={Boolean(deleteTarget)}
        title="Delete Product"
        message={`Are you sure you want to delete this product${
          deleteTarget?.name ? `: ${deleteTarget.name}` : ""
        }? This action cannot be undone.`}
        confirmText="Delete Product"
        cancelText="Cancel"
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
        loading={deleting}
      />
    </div>
  );
}

export default ProductsPage;
