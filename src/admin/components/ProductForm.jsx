import { useEffect, useMemo, useRef, useState } from "react";

const MAX_PRODUCT_IMAGES = 6;

const defaultForm = {
  name: "",
  description: "",
  category: "",
  price: "",
  discountPrice: "",
  productCost: "",
  shippingPrice: "",
  stock: "",
  sku: "",
  brand: "",
  featured: false,
  status: "active",
};

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
  const selectedFilesRef = useRef([]);

  const clearSelectedFiles = () => {
    selectedFilesRef.current.forEach((item) => URL.revokeObjectURL(item.previewUrl));
    selectedFilesRef.current = [];
    setSelectedFiles([]);
  };

  useEffect(() => {
    const next = {
      ...defaultForm,
      ...initialValues,
      price: initialValues?.price ?? "",
      discountPrice: initialValues?.discountPrice ?? "",
      productCost: initialValues?.productCost ?? "",
      shippingPrice: initialValues?.shippingPrice ?? "",
      stock: initialValues?.stock ?? initialValues?.countInStock ?? "",
      sku: initialValues?.sku ?? "",
      brand: initialValues?.brand ?? "",
      featured: Boolean(initialValues?.featured),
      status: initialValues?.status || "active",
    };

    setFormState(next);
    setExistingImages(Array.isArray(initialValues?.images) ? initialValues.images : []);
    clearSelectedFiles();
    setImageError("");
  }, [initialValues]);

  useEffect(() => {
    selectedFilesRef.current = selectedFiles;
  }, [selectedFiles]);

  useEffect(() => {
    return () => {
      clearSelectedFiles();
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

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!formState.name.trim()) {
      setImageError("Product name is required.");
      return;
    }

    if (formState.price === "" || Number(formState.price) < 0) {
      setImageError("Price is required.");
      return;
    }

    if (formState.stock === "" || Number(formState.stock) < 0) {
      setImageError("Stock is required.");
      return;
    }

    if (formState.productCost === "" || Number(formState.productCost) < 0) {
      setImageError("Product cost must be a non-negative value.");
      return;
    }

    if (formState.shippingPrice === "" || Number(formState.shippingPrice) < 0) {
      setImageError("Shipping price must be a non-negative value.");
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

    if (
      formState.discountPrice !== "" &&
      Number(formState.discountPrice) > Number(formState.price)
    ) {
      setImageError("Discount price cannot be greater than price.");
      return;
    }

    setImageError("");

    onSubmit({
      name: formState.name.trim(),
      description: formState.description.trim(),
      category: formState.category.trim(),
      price: Number(formState.price),
      discountPrice:
        formState.discountPrice === "" ? null : Number(formState.discountPrice),
      productCost: Number(formState.productCost),
      shippingPrice: Number(formState.shippingPrice),
      stock: Number(formState.stock),
      sku: formState.sku.trim() || null,
      brand: formState.brand.trim(),
      featured: Boolean(formState.featured),
      status: formState.status,
      existingImages,
      imageFiles: selectedFiles.map((item) => item.file),
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
          Price
          <input
            name="price"
            type="number"
            min="0"
            step="0.01"
            value={formState.price}
            onChange={handleInputChange}
            required
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </label>

        <label className="text-sm text-muted">
          Discount Price
          <input
            name="discountPrice"
            type="number"
            min="0"
            step="0.01"
            value={formState.discountPrice}
            onChange={handleInputChange}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </label>

        <label className="text-sm text-muted">
          Product Cost
          <input
            name="productCost"
            type="number"
            min="0"
            step="0.01"
            value={formState.productCost}
            onChange={handleInputChange}
            required
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </label>

        <label className="text-sm text-muted">
          Shipping Price
          <input
            name="shippingPrice"
            type="number"
            min="0"
            step="0.01"
            value={formState.shippingPrice}
            onChange={handleInputChange}
            required
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </label>

        <label className="text-sm text-muted">
          Stock Quantity
          <input
            name="stock"
            type="number"
            min="0"
            value={formState.stock}
            onChange={handleInputChange}
            required
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </label>

        <label className="text-sm text-muted">
          SKU
          <input
            name="sku"
            value={formState.sku}
            onChange={handleInputChange}
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

      <label className="mt-4 inline-flex items-center gap-2 text-sm text-muted">
        <input
          name="featured"
          type="checkbox"
          checked={Boolean(formState.featured)}
          onChange={handleInputChange}
          className="h-4 w-4 rounded border-slate-300"
        />
        Featured product
      </label>

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
