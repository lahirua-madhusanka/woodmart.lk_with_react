import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { useAuth } from "./AuthContext";
import { products as fallbackProducts } from "../data/products";
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
  const [products, setProducts] = useState(fallbackProducts);
  const [cartItems, setCartItems] = useState({});
  const [wishlist, setWishlist] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const getProductId = useCallback((product) => String(product._id || product.id), []);

  const cartFromApi = useCallback((cartResponse) => {
    const next = {};
    for (const item of cartResponse.items || []) {
      next[String(item.productId)] = item.quantity;
    }
    return next;
  }, []);

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
        if (Array.isArray(data) && data.length) {
          setProducts(data);
        }
      } catch {
        // Keep local fallback data when API is unavailable.
      } finally {
        setLoadingProducts(false);
      }
    };

    loadProducts();
  }, []);

  useEffect(() => {
    const syncUserCollections = async () => {
      if (!isAuthenticated) {
        setCartItems({});
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

  const addToCart = async (productId, quantity = 1) => {
    const key = String(productId);

    if (!isAuthenticated) {
      toast.info("Please sign in to add products to cart");
      return;
    }

    try {
      const cart = await addToCartApi({ productId: key, quantity });
      setCartItems(cartFromApi(cart));
      toast.success("Added to cart");
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    }
  };

  const updateCartItem = async (productId, quantity) => {
    const key = String(productId);

    if (!isAuthenticated) {
      return;
    }

    try {
      const cart = await updateCartApi({ productId: key, quantity });
      setCartItems(cartFromApi(cart));
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    }
  };

  const removeFromCart = async (productId) => {
    const key = String(productId);
    if (!isAuthenticated) {
      return;
    }

    try {
      const cart = await removeCartApi({ productId: key });
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
      Object.entries(cartItems)
        .map(([id, quantity]) => {
          const product = products.find((item) => getProductId(item) === String(id));
          if (!product) return null;
          const listPrice = Number(product.price || 0);
          const unitPrice = Number(product.discountPrice ?? product.price ?? 0);
          const unitDiscountAmount = Math.max(0, listPrice - unitPrice);
          const unitShippingPrice = Number(product.shippingPrice || 0);
          const quantityValue = Number(quantity || 0);
          return {
            ...product,
            productId: getProductId(product),
            quantity: quantityValue,
            listPrice,
            unitPrice,
            unitDiscountAmount,
            unitShippingPrice,
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
    () => Object.values(cartItems).reduce((sum, value) => sum + value, 0),
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