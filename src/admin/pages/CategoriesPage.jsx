import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "react-toastify";
import { getApiErrorMessage } from "../../services/apiClient";
import EmptyState from "../components/EmptyState";
import Loader from "../components/Loader";
import { createCategory, deleteCategory, getCategories } from "../services/categoriesService";

function CategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newCategory, setNewCategory] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState("");

  const loadCategories = async () => {
    setLoading(true);
    try {
      const data = await getCategories();
      setCategories(Array.isArray(data) ? data : []);
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const handleAddCategory = async (event) => {
    event.preventDefault();
    const trimmed = newCategory.trim();
    if (!trimmed) return;

    try {
      setSaving(true);
      await createCategory({ name: trimmed });
      await loadCategories();
      setNewCategory("");
      toast.success("Category added.");
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCategory = async (item) => {
    const id = item.id || item._id;
    if (!id || item.legacy) {
      toast.error("Run the latest database schema to manage categories directly.");
      return;
    }

    try {
      setDeletingId(id);
      await deleteCategory(id);
      await loadCategories();
      toast.success("Category deleted.");
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setDeletingId("");
    }
  };

  if (loading) {
    return <Loader label="Loading categories..." />;
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h1 className="text-xl font-semibold text-ink">Categories</h1>
        <p className="mt-1 text-sm text-muted">Create categories first, then assign them while adding products.</p>

        <form onSubmit={handleAddCategory} className="mt-4 flex flex-col gap-3 sm:flex-row">
          <input
            value={newCategory}
            onChange={(event) => setNewCategory(event.target.value)}
            placeholder="Enter new category name"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {saving ? "Adding..." : "Add Category"}
          </button>
        </form>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        {!categories.length ? (
          <EmptyState title="No categories available" />
        ) : (
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => {
              const value = category.name || category;
              const id = category.id || category._id || value;
              const isDeleting = deletingId === id;

              return (
                <div key={id} className="inline-flex items-center gap-1 rounded-full bg-brand-light px-3 py-1 text-sm font-semibold text-brand-dark">
                  <span>{value}</span>
                  <button
                    type="button"
                    onClick={() => handleDeleteCategory(category)}
                    disabled={isDeleting}
                    className="ml-1 rounded-full p-1 text-brand-dark/80 hover:bg-white/60 hover:text-brand-dark disabled:opacity-50"
                    title="Delete category"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default CategoriesPage;
