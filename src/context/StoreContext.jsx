import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { useAuth } from "./AuthContext";
import { getProductPricing, getVariationPricing } from "../utils/pricing";
import {
  addToCartApi,
  getCartApi,
  removeCartApi,
  updateCartApi,
} from "../services/cartService";
import { getApiErrorMessage } from "../services/apiClient";
import { getProductsApi } from "../services/productService";
import {
  addWishlistApi,
  getWishlistApi,
  removeWishlistApi,
} from "../services/wishlistService";

const StoreContext = createContext(null);

export function StoreProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [products, setProducts] = useState([]);
  const [cartItems, setCartItems] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const getProductId = useCallback((product) => String(product._id || product.id), []);

  const cartFromApi = useCallback((cartResponse) =>
    Array.isArray(cartResponse?.items) ? cartResponse.items : [],
  []);

  const wishlistFromApi = useCallback(
    (wishlistResponse) =>
      (wishlistResponse || []).map((product) => String(product._id || product.id)),
    []
  );

  useEffect(() => {
    const loadProducts = async () => {
      setLoadingProducts(true);
      try {
        const data = await getProductsApi();
        setProducts(Array.isArray(data) ? data : []);
      } catch {
        setProducts([]);
      } finally {
        setLoadingProducts(false);
      }
    };

    loadProducts();
  }, []);

  useEffect(() => {
    const syncUserCollections = async () => {
      if (!isAuthenticated) {
        setCartItems([]);
        setWishlist([]);
        return;
      }

      setSyncing(true);
      try {
        const [cart, wishlistItems] = await Promise.all([getCartApi(), getWishlistApi()]);
        setCartItems(cartFromApi(cart));
        setWishlist(wishlistFromApi(wishlistItems));
      } catch (error) {
        toast.error(getApiErrorMessage(error));
      } finally {
        setSyncing(false);
      }
    };

    syncUserCollections();
  }, [cartFromApi, isAuthenticated, wishlistFromApi]);

  const addToCart = async (productId, quantity = 1, variation = null) => {
    const key = String(productId);
    const product = products.find((item) => getProductId(item) === key);
    const hasVariations = Boolean(product?.variations?.length);
    const variationId = variation?.id || null;

    if (!isAuthenticated) {
      toast.info("Please sign in to add products to cart");
      return;
    }

    if (hasVariations && !variationId) {
      toast.info("Please select a variation before adding to cart");
      return;
    }

    try {
      const cart = await addToCartApi({ productId: key, quantity, variationId });
      setCartItems(cartFromApi(cart));
      toast.success("Added to cart");
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    }
  };

  const updateCartItem = async (productId, variationId, quantity) => {
    const key = String(productId);

    if (!isAuthenticated) {
      return;
    }

    try {
      const cart = await updateCartApi({ productId: key, variationId: variationId || null, quantity });
      setCartItems(cartFromApi(cart));
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    }
  };

  const removeFromCart = async (productId, variationId) => {
    const key = String(productId);
    if (!isAuthenticated) {
      return;
    }

    try {
      const cart = await removeCartApi({ productId: key, variationId: variationId || null });
      setCartItems(cartFromApi(cart));
      toast.info("Item removed");
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    }
  };

  const toggleWishlist = async (productId) => {
    const key = String(productId);

    if (!isAuthenticated) {
      toast.info("Please sign in to use wishlist");
      return;
    }

    try {
      const next = wishlist.includes(key)
        ? await removeWishlistApi({ productId: key })
        : await addWishlistApi({ productId: key });

      setWishlist(wishlistFromApi(next));
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    }
  };

  const moveWishlistToCart = async (productId) => {
    await addToCart(productId, 1);
    await toggleWishlist(productId);
  };

  const cartDetailedItems = useMemo(
    () =>
      cartItems
        .map((entry) => {
          const product = products.find((item) => getProductId(item) === String(entry.productId));
          if (!product) return null;
          const variation = entry.variation || null;
          const pricing = variation ? getVariationPricing(variation, { product }) : getProductPricing(product);
          const listPrice = Number(pricing.originalPrice || 0);
          const unitPrice = Number(pricing.finalPrice || listPrice || 0);
          const unitDiscountAmount = Math.max(0, listPrice - unitPrice);
          const unitShippingPrice = Number(product.shippingPrice || 0);
          const quantityValue = Number(entry.quantity || 0);
          return {
            ...product,
            productId: getProductId(product),
            variationId: entry.variationId || null,
            variation,
            quantity: quantityValue,
            listPrice,
            unitPrice,
            variationPrice: listPrice,
            finalPrice: unitPrice,
            unitDiscountAmount,
            unitShippingPrice,
            discountPercentage: Number(pricing.discountPercentage || 0),
            promotionActive: Boolean(pricing.promotionActive),
            promotion: pricing.promotion || null,
            subtotal: quantityValue * unitPrice,
            shippingSubtotal: quantityValue * unitShippingPrice,
            discountSubtotal: quantityValue * unitDiscountAmount,
            lineTotal: quantityValue * (unitPrice + unitShippingPrice),
          };
        })
        .filter(Boolean),
    [cartItems, getProductId, products]
  );

  const cartCount = useMemo(
    () => cartItems.reduce((sum, item) => sum + Number(item.quantity || 0), 0),
    [cartItems]
  );

  const cartSubtotal = useMemo(
    () => cartDetailedItems.reduce((sum, item) => sum + item.subtotal, 0),
    [cartDetailedItems]
  );

  const cartShippingTotal = useMemo(
    () => cartDetailedItems.reduce((sum, item) => sum + Number(item.shippingSubtotal || 0), 0),
    [cartDetailedItems]
  );

  const cartDiscountTotal = useMemo(
    () => cartDetailedItems.reduce((sum, item) => sum + Number(item.discountSubtotal || 0), 0),
    [cartDetailedItems]
  );

  const wishlistItems = useMemo(
    () => products.filter((product) => wishlist.includes(getProductId(product))),
    [getProductId, products, wishlist]
  );

  const value = {
    cartItems,
    cartDetailedItems,
    cartCount,
    cartSubtotal,
    cartShippingTotal,
    cartDiscountTotal,
    products,
    loadingProducts,
    syncing,
    getProductId,
    wishlist,
    wishlistItems,
    addToCart,
    updateCartItem,
    removeFromCart,
    toggleWishlist,
    moveWishlistToCart,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error("useStore must be used within StoreProvider");
  }
  return context;
}