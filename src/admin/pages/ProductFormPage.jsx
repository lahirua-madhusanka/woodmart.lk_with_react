import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import ProductForm from "../components/ProductForm";
import Loader from "../components/Loader";
import {
  createProduct,
  getCategories,
  getProductById,
  uploadProductImages,
  updateProduct,
} from "../services/productsService";
import { getApiErrorMessage } from "../../services/apiClient";

const MAX_PRODUCT_IMAGES = 6;

function ProductFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(Boolean(id));
  const [saving, setSaving] = useState(false);

  const isEdit = useMemo(() => Boolean(id), [id]);

  useEffect(() => {
    const load = async () => {
      try {
        const categoriesData = await getCategories();
        setCategories(categoriesData || []);

        if (id) {
          const productData = await getProductById(id);
          setProduct(productData);
        }
      } catch (error) {
        toast.error(getApiErrorMessage(error));
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id]);

  const handleSubmit = async (payload) => {
    try {
      setSaving(true);

      const uploadedImages = payload.imageFiles?.length
        ? await uploadProductImages(payload.imageFiles)
        : [];

      const finalImages = [...(payload.existingImages || []), ...uploadedImages];

      if (finalImages.length < 1) {
        toast.error("At least one product image is required.");
        return;
      }

      if (finalImages.length > MAX_PRODUCT_IMAGES) {
        toast.error(`You can add up to ${MAX_PRODUCT_IMAGES} images only.`);
        return;
      }

      const variationFiles = (payload.variations || []).filter((variation) => variation.imageFile);
      const uploadedVariationImages = [];
      if (variationFiles.length) {
        const batchSize = MAX_PRODUCT_IMAGES;
        for (let index = 0; index < variationFiles.length; index += batchSize) {
          const batch = variationFiles.slice(index, index + batchSize).map((variation) => variation.imageFile);
          const uploaded = await uploadProductImages(batch);
          uploadedVariationImages.push(...uploaded);
        }
      }

      let variationUploadIndex = 0;
      const finalVariations = (payload.variations || []).map((variation) => {
        const uploadedImage = variation.imageFile ? uploadedVariationImages[variationUploadIndex++] : "";
        return {
          id: variation.id || undefined,
          name: variation.name,
          price: variation.price,
          discountedPrice: variation.discountedPrice ?? null,
          cost: variation.cost,
          stock: variation.stock,
          sku: variation.sku || null,
          imageUrl: variation.imageUrl || uploadedImage || null,
        };
      });

      const requestPayload = {
        name: payload.name,
        description: payload.description,
        category: payload.category,
        brand: payload.brand,
        status: payload.status,
        images: finalImages,
        variations: finalVariations,
      };

      if (isEdit) {
        await updateProduct(id, requestPayload);
        toast.success("Product updated successfully.");
      } else {
        await createProduct(requestPayload);
        toast.success("Product created successfully.");
      }

      navigate("/admin/products");
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <Loader label="Loading product..." />;
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-ink">{isEdit ? "Edit Product" : "Add Product"}</h1>
        <p className="text-sm text-muted">Create and update catalog products from one place.</p>
      </div>
      <ProductForm
        initialValues={product}
        categories={categories}
        onSubmit={handleSubmit}
        onCancel={() => navigate("/admin/products")}
        submitLabel={isEdit ? "Update Product" : "Create Product"}
        loading={saving}
      />
    </div>
  );
}

export default ProductFormPage;
