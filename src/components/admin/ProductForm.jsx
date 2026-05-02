import { useEffect, useMemo, useState } from "react";

const baseForm = {
  name: "",
  description: "",
  category: "",
  imagesRaw: "",
};

const createEmptyVariation = () => ({
  name: "",
  price: "",
  discountedPrice: "",
  cost: "",
  stock: "",
  sku: "",
  imageUrl: "",
});

function ProductForm({
  initialValues,
  categories = [],
  onSubmit,
  submitLabel = "Save Product",
  saving = false,
}) {
  const [form, setForm] = useState(baseForm);
  const [errors, setErrors] = useState({});
  const [variations, setVariations] = useState([]);
  const [variationError, setVariationError] = useState("");

  useEffect(() => {
    if (!initialValues) {
      setForm(baseForm);
      setVariations([]);
      return;
    }

    setForm({
      name: initialValues.name || "",
      description: initialValues.description || "",
      category: initialValues.category || "",
      imagesRaw: (initialValues.images || []).join("\n"),
    });

    setVariations(
      Array.isArray(initialValues?.variations)
        ? initialValues.variations.map((variation) => ({
            ...createEmptyVariation(),
            name: variation.name || variation.variation_name || "",
            price: variation.price == null ? "" : String(variation.price),
            discountedPrice:
              (variation.discountedPrice ?? variation.discounted_price) == null
                ? ""
                : String(variation.discountedPrice ?? variation.discounted_price),
            cost: variation.cost == null ? "" : String(variation.cost),
            stock: variation.stock == null ? "" : String(variation.stock),
            sku: variation.sku || "",
            imageUrl: variation.imageUrl || variation.image_url || "",
          }))
        : []
    );
  }, [initialValues]);

  const imagePreview = useMemo(
    () => form.imagesRaw.split("\n").map((line) => line.trim()).filter(Boolean),
    [form.imagesRaw]
  );

  const setField = (key) => (event) => {
    setForm((prev) => ({ ...prev, [key]: event.target.value }));
  };

  const addVariation = () => {
    setVariations((prev) => [...prev, createEmptyVariation()]);
  };

  const updateVariation = (index, field, value) => {
    setVariations((prev) =>
      prev.map((variation, idx) => (idx === index ? { ...variation, [field]: value } : variation))
    );
  };

  const removeVariation = (index) => {
    setVariations((prev) => prev.filter((_, idx) => idx !== index));
  };

  const validate = () => {
    const next = {};
    let variationErrorMessage = "";
    if (!form.name.trim()) next.name = "Name is required";
    if (!form.description.trim()) next.description = "Description is required";
    if (!form.category.trim()) next.category = "Category is required";
    if (!variations.length) {
      variationErrorMessage = "At least one variation is required.";
    }

    const invalidName = variations.some((variation) => !String(variation.name || "").trim());
    if (invalidName) {
      variationErrorMessage = "Variation name is required.";
    }

    const invalidPrice = variations.some((variation) => {
      const parsed = Number(variation.price);
      return !Number.isFinite(parsed) || parsed < 0;
    });
    if (invalidPrice) {
      variationErrorMessage = "Variation price is required.";
    }

    const invalidStock = variations.some((variation) => {
      const parsed = Number(variation.stock);
      return !Number.isFinite(parsed) || parsed < 0;
    });
    if (invalidStock) {
      variationErrorMessage = "Variation stock is required.";
    }

    const invalidCost = variations.some((variation) => {
      const parsed = Number(variation.cost);
      return !Number.isFinite(parsed) || parsed < 0;
    });
    if (invalidCost) {
      variationErrorMessage = "Variation cost is required.";
    }

    const invalidDiscount = variations.some((variation) => {
      if (variation.discountedPrice === "" || variation.discountedPrice == null) return false;
      const discounted = Number(variation.discountedPrice);
      const price = Number(variation.price);
      return !Number.isFinite(discounted) || discounted < 0 || discounted > price;
    });
    if (invalidDiscount) {
      variationErrorMessage = "Variation discount must be less than or equal to price.";
    }

    const skuValues = variations
      .map((variation) => String(variation.sku || "").trim())
      .filter(Boolean);
    const uniqueSkus = new Set(skuValues);
    if (uniqueSkus.size !== skuValues.length) {
      variationErrorMessage = "Variation SKU values must be unique.";
    }

    setVariationError(variationErrorMessage);
    setErrors(next);
    return Object.keys(next).length === 0 && !variationErrorMessage;
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!validate()) return;

    onSubmit({
      name: form.name.trim(),
      description: form.description.trim(),
      category: form.category.trim(),
      images: imagePreview,
      variations: variations.map((variation) => ({
        name: String(variation.name || "").trim(),
        price: Number(variation.price),
        discountedPrice:
          variation.discountedPrice === "" || variation.discountedPrice == null
            ? null
            : Number(variation.discountedPrice),
        cost: Number(variation.cost),
        stock: Number(variation.stock),
        sku: String(variation.sku || "").trim() || null,
        imageUrl: String(variation.imageUrl || "").trim() || null,
      })),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="grid gap-4 rounded-xl border border-slate-200 bg-white p-5">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="text-sm">
          <span className="mb-1 block font-semibold">Product Name</span>
          <input value={form.name} onChange={setField("name")} className="w-full rounded-lg border border-slate-300 px-3 py-2" />
          {errors.name ? <span className="mt-1 block text-xs text-red-600">{errors.name}</span> : null}
        </label>

        <label className="text-sm">
          <span className="mb-1 block font-semibold">Category</span>
          <input list="category-options" value={form.category} onChange={setField("category")} className="w-full rounded-lg border border-slate-300 px-3 py-2" />
          <datalist id="category-options">
            {categories.map((category) => (
              <option key={category} value={category} />
            ))}
          </datalist>
          {errors.category ? <span className="mt-1 block text-xs text-red-600">{errors.category}</span> : null}
        </label>
      </div>

      <label className="text-sm">
        <span className="mb-1 block font-semibold">Description</span>
        <textarea value={form.description} onChange={setField("description")} rows={4} className="w-full rounded-lg border border-slate-300 px-3 py-2" />
        {errors.description ? <span className="mt-1 block text-xs text-red-600">{errors.description}</span> : null}
      </label>

      <label className="text-sm">
        <span className="mb-1 block font-semibold">Images (one URL per line)</span>
        <textarea value={form.imagesRaw} onChange={setField("imagesRaw")} rows={4} className="w-full rounded-lg border border-slate-300 px-3 py-2" />
      </label>

      {!!imagePreview.length && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {imagePreview.slice(0, 4).map((image) => (
            <img key={image} src={image} alt="preview" className="h-24 w-full rounded-lg border border-slate-200 object-cover" />
          ))}
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold">Variations</h3>
            <p className="text-xs text-muted">Add at least one variation with pricing and stock.</p>
          </div>
          <button
            type="button"
            onClick={addVariation}
            className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700"
          >
            Add variation
          </button>
        </div>

        {variationError ? <p className="mt-3 text-sm font-medium text-red-600">{variationError}</p> : null}

        {!variations.length ? (
          <p className="mt-3 text-sm text-muted">No variations added yet.</p>
        ) : (
          <div className="mt-4 space-y-4">
            {variations.map((variation, index) => (
              <div
                key={`variation-${index}`}
                className="grid gap-3 rounded-lg border border-slate-200 p-3 md:grid-cols-[1.1fr_0.8fr_0.8fr_0.8fr_0.8fr_0.8fr_1fr_auto]"
              >
                <label className="text-sm">
                  <span className="mb-1 block font-semibold">Name</span>
                  <input value={variation.name} onChange={(event) => updateVariation(index, "name", event.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2" />
                </label>
                <label className="text-sm">
                  <span className="mb-1 block font-semibold">Price</span>
                  <input type="number" min="0" step="0.01" value={variation.price} onChange={(event) => updateVariation(index, "price", event.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2" />
                </label>
                <label className="text-sm">
                  <span className="mb-1 block font-semibold">Discount</span>
                  <input type="number" min="0" step="0.01" value={variation.discountedPrice} onChange={(event) => updateVariation(index, "discountedPrice", event.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2" />
                </label>
                <label className="text-sm">
                  <span className="mb-1 block font-semibold">Cost</span>
                  <input type="number" min="0" step="0.01" value={variation.cost} onChange={(event) => updateVariation(index, "cost", event.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2" />
                </label>
                <label className="text-sm">
                  <span className="mb-1 block font-semibold">Stock</span>
                  <input type="number" min="0" value={variation.stock} onChange={(event) => updateVariation(index, "stock", event.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2" />
                </label>
                <label className="text-sm">
                  <span className="mb-1 block font-semibold">SKU</span>
                  <input value={variation.sku} onChange={(event) => updateVariation(index, "sku", event.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2" />
                </label>
                <label className="text-sm">
                  <span className="mb-1 block font-semibold">Image URL</span>
                  <input value={variation.imageUrl} onChange={(event) => updateVariation(index, "imageUrl", event.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2" />
                </label>
                <button type="button" onClick={() => removeVariation(index)} className="rounded-lg border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-600">
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <button disabled={saving} className="rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-70">
          {saving ? "Saving..." : submitLabel}
        </button>
      </div>
    </form>
  );
}

export default ProductForm;
