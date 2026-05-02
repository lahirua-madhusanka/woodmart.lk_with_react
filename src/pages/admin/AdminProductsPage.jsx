import { Plus, Search, SquarePen, Trash2 } from "lucide-react";
import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import StatusBadge from "../../components/admin/StatusBadge";
import { getApiErrorMessage } from "../../services/apiClient";
import {
  deleteAdminProductApi,
  getAdminCategoriesApi,
  getAdminProductsApi,
} from "../../services/adminApi/productsService";
import { getProductPricing } from "../../utils/pricing";

const DataTable = lazy(() => import("../../components/admin/DataTable"));
const ConfirmModal = lazy(() => import("../../components/admin/ConfirmModal"));

function AdminProductsPage() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [selectedId, setSelectedId] = useState("");
  const navigate = useNavigate();

  const loadProducts = async () => {
    setLoading(true);
    try {
      const [productsData, categoriesData] = await Promise.all([
        getAdminProductsApi(),
        getAdminCategoriesApi(),
      ]);
      setProducts(productsData || []);
      setCategories(categoriesData || []);
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
      const matchCategory = category === "All" ? true : item.category === category;
      const matchText = lowered
        ? item.name.toLowerCase().includes(lowered) ||
          item.description.toLowerCase().includes(lowered)
        : true;
      return matchCategory && matchText;
    });
  }, [category, products, query]);

  const deleteProduct = async () => {
    if (!selectedId) return;
    try {
      await deleteAdminProductApi(selectedId);
      setProducts((prev) => prev.filter((item) => item._id !== selectedId));
      toast.success("Product deleted");
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setSelectedId("");
    }
  };

  const getTotalStock = (product) =>
    (Array.isArray(product?.variations) ? product.variations : [])
      .reduce((sum, variation) => sum + Number(variation?.stock || 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center rounded-lg border border-slate-300 bg-white px-3 py-2">
            <Search size={15} className="text-muted" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search products"
              className="ml-2 bg-transparent text-sm outline-none"
            />
          </label>
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          >
            <option value="All">All Categories</option>
            {categories.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>

        <Link to="/admin/products/new" className="inline-flex items-center gap-1 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white">
          <Plus size={15} /> Add Product
        </Link>
      </div>

      {loading ? (
        <div className="rounded-xl bg-white p-10 text-center text-muted">Loading products...</div>
      ) : (
        <Suspense fallback={<div className="rounded-xl bg-white p-10 text-center text-muted">Loading table...</div>}>
          <DataTable
            rows={filtered}
            columns={[
            {
              key: "name",
              label: "Product",
              render: (row) => (
                <div>
                  <p className="font-semibold text-ink">{row.name}</p>
                  <p className="text-xs text-muted">{row._id}</p>
                </div>
              ),
            },
            {
              key: "category",
              label: "Category",
            },
            {
              key: "price",
              label: "Price",
              render: (row) => {
                const pricing = getProductPricing(row);
                return `Rs. ${Number(pricing.finalPrice || 0).toFixed(2)}`;
              },
            },
            {
              key: "stock",
              label: "Stock",
              render: (row) => getTotalStock(row) || row.stock || 0,
            },
            {
              key: "rating",
              label: "Rating",
              render: (row) => Number(row.rating || 0).toFixed(1),
            },
            {
              key: "status",
              label: "Status",
              render: (row) => {
                const totalStock = getTotalStock(row) || row.stock || 0;
                return <StatusBadge value={totalStock <= 10 ? "low" : "active"} />;
              },
            },
            {
              key: "actions",
              label: "Actions",
              render: (row) => (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => navigate(`/admin/products/edit/${row._id}`)}
                    className="rounded-md border border-slate-300 p-2 text-slate-700 hover:border-brand hover:text-brand"
                  >
                    <SquarePen size={14} />
                  </button>
                  <button
                    onClick={() => setSelectedId(row._id)}
                    className="rounded-md border border-red-200 p-2 text-red-600 hover:bg-red-50"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ),
            },
            ]}
            emptyText="No products found"
          />
        </Suspense>
      )}

      <Suspense fallback={null}>
        <ConfirmModal
          open={Boolean(selectedId)}
          title="Delete product"
          description="This action cannot be undone. Are you sure you want to remove this product?"
          onConfirm={deleteProduct}
          onClose={() => setSelectedId("")}
          confirmText="Delete"
        />
      </Suspense>
    </div>
  );
}

export default AdminProductsPage;
