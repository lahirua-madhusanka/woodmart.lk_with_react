import apiClient from "./apiClient";

export const getProductsApi = async () => {
  const { data } = await apiClient.get("/products");
  return data;
};

export const searchProductsApi = async (query) => {
  const { data } = await apiClient.get("/products", {
    params: { q: query },
  });
  return data;
};

export const getProductByIdApi = async (id) => {
  const { data } = await apiClient.get(`/products/${id}`);
  return data;
};

export const addProductReviewApi = async (id, payload) => {
  const { data } = await apiClient.post(`/products/${id}/reviews`, payload);
  return data;
};

export const updateProductReviewApi = async (id, payload) => {
  const { data } = await apiClient.put(`/products/${id}/reviews/me`, payload);
  return data;
};

export const getReviewEligibilityApi = async (id) => {
  const { data } = await apiClient.get(`/products/${id}/reviews/eligibility`);
  return data;
};
