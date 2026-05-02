import { useEffect, useMemo, useRef, useState } from "react";

const MAX_PRODUCT_IMAGES = 6;

const defaultForm = {
  name: "",
  description: "",
  category: "",
  brand: "",
  status: "active",
};

const createEmptyVariation = () => ({
  id: "",
  name: "",
  price: "",
  discountedPrice: "",
  cost: "",
  stock: "",
  sku: "",
  imageUrl: "",
  imageFile: null,
  previewUrl: "",
});

function ProductForm({
  initialValues,
  categories,
  onSubmit,
  onCancel,
  submitLabel = "Save Product",
  loading,
}) {
  const [formState, setFormState] = useState(defaultForm);
  const [existingImages, setExistingImages] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [imageError, setImageError] = useState("");
  const [variations, setVariations] = useState([]);
  const [variationError, setVariationError] = useState("");
  const selectedFilesRef = useRef([]);
  const variationFilesRef = useRef([]);

  const clearSelectedFiles = () => {
    selectedFilesRef.current.forEach((item) => URL.revokeObjectURL(item.previewUrl));
    selectedFilesRef.current = [];
    setSelectedFiles([]);
  };

  useEffect(() => {
    const next = {
      ...defaultForm,
      ...initialValues,
      brand: initialValues?.brand ?? "",
      status: initialValues?.status || "active",
    };

    setFormState(next);
    setExistingImages(Array.isArray(initialValues?.images) ? initialValues.images : []);
    setVariations(
      Array.isArray(initialValues?.variations)
        ? initialValues.variations.map((variation) => ({
            ...createEmptyVariation(),
            id: variation.id || "",
            name: variation.name || variation.variation_name || "",
            price: variation.price == null ? "" : String(variation.price),
            discountedPrice:
              (variation.discountedPrice ?? variation.discounted_price) == null
                ? ""
                : String(variation.discountedPrice ?? variation.discounted_price),
            cost: variation.cost == null ? "" : String(variation.cost),
            stock: variation.stock == null ? "" : String(variation.stock),
            sku: variation.sku || "",
            imageUrl: variation.imageUrl || "",
          }))
        : []
    );
    clearSelectedFiles();
    setImageError("");
    setVariationError("");
  }, [initialValues]);

  useEffect(() => {
    selectedFilesRef.current = selectedFiles;
  }, [selectedFiles]);

  useEffect(() => {
    variationFilesRef.current = variations;
  }, [variations]);

  useEffect(() => {
    return () => {
      clearSelectedFiles();
      variationFilesRef.current.forEach((variation) => {
        if (variation?.previewUrl) {
          URL.revokeObjectURL(variation.previewUrl);
        }
      });
    };
  }, []);

  const totalImageCount = existingImages.length + selectedFiles.length;
  const canAddMoreImages = totalImageCount < MAX_PRODUCT_IMAGES;

  const categoryOptions = useMemo(
    () => categories.map((entry) => (entry?.name ? entry.name : entry)).filter(Boolean),
    [categories]
  );

  const handleInputChange = (event) => {
    const { name, value, type, checked } = event.target;
    setFormState((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleFileSelection = (event) => {
    const incoming = Array.from(event.target.files || []);
    event.target.value = "";

    if (!incoming.length) return;

    const nonImages = incoming.filter((file) => !file.type.startsWith("image/"));
    if (nonImages.length) {
      setImageError("Only image files are allowed.");
      return;
    }

    const remainingSlots = MAX_PRODUCT_IMAGES - (existingImages.length + selectedFiles.length);
    if (incoming.length > remainingSlots) {
      setImageError(`You can add up to ${MAX_PRODUCT_IMAGES} images only.`);
      return;
    }

    const prepared = incoming.map((file) => ({
      file,
      previewUrl: URL.createObjectURL(file),
    }));

    setSelectedFiles((prev) => [...prev, ...prepared]);
    setImageError("");
  };

  const removeExistingImage = (index) => {
    setExistingImages((prev) => prev.filter((_, itemIndex) => itemIndex !== index));
  };

  const removeSelectedFile = (index) => {
    setSelectedFiles((prev) => {
      const target = prev[index];
      if (target) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return prev.filter((_, itemIndex) => itemIndex !== index);
    });
  };

  const addVariation = () => {
    setVariations((prev) => [...prev, createEmptyVariation()]);
  };

  const updateVariation = (index, field, value) => {
    setVariations((prev) =>
      prev.map((variation, idx) => (idx === index ? { ...variation, [field]: value } : variation))
    );
  };

  const handleVariationImage = (index, file) => {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setVariationError("Only image files are allowed for variations.");
      return;
    }

    setVariations((prev) =>
      prev.map((variation, idx) => {
        if (idx !== index) return variation;
        if (variation.previewUrl) {
          URL.revokeObjectURL(variation.previewUrl);
        }
        return {
          ...variation,
          imageFile: file,
          previewUrl: URL.createObjectURL(file),
        };
      })
    );
    setVariationError("");
  };

  const removeVariation = (index) => {
    setVariations((prev) => {
      const target = prev[index];
      if (target?.previewUrl) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return prev.filter((_, idx) => idx !== index);
    });
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!formState.name.trim()) {
      setImageError("Product name is required.");
      return;
    }

    if (existingImages.length + selectedFiles.length < 1) {
      setImageError("At least 1 product image is required.");
      return;
    }

    if (existingImages.length + selectedFiles.length > MAX_PRODUCT_IMAGES) {
      setImageError(`Maximum ${MAX_PRODUCT_IMAGES} images are allowed.`);
      return;
    }

    if (!variations.length) {
      setVariationError("At least one variation is required.");
      return;
    }

    const invalidName = variations.some((variation) => !String(variation.name || "").trim());
    if (invalidName) {
      setVariationError("Variation name is required.");
      return;
    }

    const invalidPrice = variations.some((variation) => {
      const parsed = Number(variation.price);
      return !Number.isFinite(parsed) || parsed < 0;
    });

    if (invalidPrice) {
      setVariationError("Variation price is required.");
      return;
    }

    const invalidStock = variations.some((variation) => {
      const parsed = Number(variation.stock);
      return !Number.isFinite(parsed) || parsed < 0;
    });

    if (invalidStock) {
      setVariationError("Variation stock is required.");
      return;
    }

    const invalidCost = variations.some((variation) => {
      const parsed = Number(variation.cost);
      return !Number.isFinite(parsed) || parsed < 0;
    });

    if (invalidCost) {
      setVariationError("Variation cost is required.");
      return;
    }

    const invalidDiscount = variations.some((variation) => {
      if (variation.discountedPrice === "" || variation.discountedPrice == null) return false;
      const discounted = Number(variation.discountedPrice);
      const price = Number(variation.price);
      return !Number.isFinite(discounted) || discounted < 0 || discounted > price;
    });

    if (invalidDiscount) {
      setVariationError("Variation discount must be less than or equal to price.");
      return;
    }

    const skuValues = variations
      .map((variation) => String(variation.sku || "").trim())
      .filter(Boolean);
    const uniqueSkus = new Set(skuValues);
    if (uniqueSkus.size !== skuValues.length) {
      setVariationError("Variation SKU values must be unique.");
      return;
    }

    setImageError("");
    setVariationError("");

    onSubmit({
      name: formState.name.trim(),
      description: formState.description.trim(),
      category: formState.category.trim(),
      brand: formState.brand.trim(),
      status: formState.status,
      existingImages,
      imageFiles: selectedFiles.map((item) => item.file),
      variations: variations.map((variation) => ({
        id: variation.id,
        name: String(variation.name || "").trim(),
        price: Number(variation.price),
        discountedPrice:
          variation.discountedPrice === "" || variation.discountedPrice == null
            ? null
            : Number(variation.discountedPrice),
        cost: Number(variation.cost),
        stock: Number(variation.stock),
        sku: String(variation.sku || "").trim() || null,
        imageUrl: variation.imageUrl || "",
        imageFile: variation.imageFile || null,
      })),
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
    >
      <div className="grid gap-4 md:grid-cols-2">
        <label className="text-sm text-muted">
          Product Name
          <input
            name="name"
            value={formState.name}
            onChange={handleInputChange}
            required
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </label>

        <label className="text-sm text-muted">
          Category
          <input
            name="category"
            value={formState.category}
            onChange={handleInputChange}
            list="product-categories"
            required
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <datalist id="product-categories">
            {categoryOptions.map((category) => (
              <option key={category} value={category} />
            ))}
          </datalist>
        </label>

        <label className="text-sm text-muted md:col-span-2">
          Description
          <textarea
            name="description"
            value={formState.description}
            onChange={handleInputChange}
            rows={4}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </label>

        <label className="text-sm text-muted">
          Brand
          <input
            name="brand"
            value={formState.brand}
            onChange={handleInputChange}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </label>

        <label className="text-sm text-muted">
          Status
          <select
            name="status"
            value={formState.status}
            onChange={handleInputChange}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="active">Active</option>
            <option value="draft">Draft</option>
            <option value="archived">Archived</option>
          </select>
        </label>
      </div>

      <div className="mt-6 rounded-xl border border-slate-200 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-ink">Product Images</h3>
            <p className="text-xs text-muted">Upload 1 to 6 images. Only image files are accepted.</p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
            {totalImageCount}/{MAX_PRODUCT_IMAGES}
          </span>
        </div>

        <input
          type="file"
          accept="image/*"
          multiple
          disabled={!canAddMoreImages || loading}
          onChange={handleFileSelection}
          className="mt-4 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />

        {imageError ? <p className="mt-3 text-sm font-medium text-red-600">{imageError}</p> : null}

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {existingImages.map((url, index) => (
            <div key={`existing-${url}-${index}`} className="relative">
              <img
                src={url}
                alt={`Product ${index + 1}`}
                className="h-24 w-full rounded-lg border border-slate-200 object-cover"
              />
              <button
                type="button"
                onClick={() => removeExistingImage(index)}
                className="absolute right-1 top-1 rounded bg-black/70 px-2 py-0.5 text-xs font-semibold text-white"
              >
                Remove
              </button>
            </div>
          ))}

          {selectedFiles.map((item, index) => (
            <div key={`new-${item.previewUrl}`} className="relative">
              <img
                src={item.previewUrl}
                alt={item.file.name}
                className="h-24 w-full rounded-lg border border-slate-200 object-cover"
              />
              <button
                type="button"
                onClick={() => removeSelectedFile(index)}
                className="absolute right-1 top-1 rounded bg-black/70 px-2 py-0.5 text-xs font-semibold text-white"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-slate-200 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-ink">Variations</h3>
            <p className="text-xs text-muted">Add size/type options with optional images.</p>
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
              <div key={`variation-${index}`} className="grid gap-3 rounded-lg border border-slate-200 p-3 md:grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr_0.8fr_0.8fr_1fr_auto]">
                <label className="text-sm text-muted">
                  Name
                  <input
                    value={variation.name}
                    onChange={(event) => updateVariation(index, "name", event.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    placeholder="Large / Walnut"
                  />
                </label>

                <label className="text-sm text-muted">
                  Price
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={variation.price}
                    onChange={(event) => updateVariation(index, "price", event.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </label>

                <label className="text-sm text-muted">
                  Discount Price
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={variation.discountedPrice}
                    onChange={(event) => updateVariation(index, "discountedPrice", event.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </label>

                <label className="text-sm text-muted">
                  Cost
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={variation.cost}
                    onChange={(event) => updateVariation(index, "cost", event.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </label>

                <label className="text-sm text-muted">
                  Stock
                  <input
                    type="number"
                    min="0"
                    value={variation.stock}
                    onChange={(event) => updateVariation(index, "stock", event.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </label>

                <label className="text-sm text-muted">
                  SKU
                  <input
                    value={variation.sku}
                    onChange={(event) => updateVariation(index, "sku", event.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    placeholder="Optional"
                  />
                </label>

                <label className="text-sm text-muted">
                  Image
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(event) => handleVariationImage(index, event.target.files?.[0])}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                  {(variation.previewUrl || variation.imageUrl) && (
                    <img
                      src={variation.previewUrl || variation.imageUrl}
                      alt={variation.name || `Variation ${index + 1}`}
                      className="mt-2 h-16 w-16 rounded-lg border border-slate-200 object-cover"
                    />
                  )}
                </label>

                <button
                  type="button"
                  onClick={() => removeVariation(index)}
                  className="rounded-lg border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-600"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-6 flex justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-ink"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {loading ? "Saving..." : submitLabel}
        </button>
      </div>
    </form>
  );
}

export default ProductForm;
