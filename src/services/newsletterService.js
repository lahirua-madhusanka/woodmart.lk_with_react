import apiClient from "./apiClient";

export const subscribeNewsletterApi = async (payload) => {
  const { data } = await apiClient.post("/newsletter/subscribe", payload);
  return data;
};

export const unsubscribeNewsletterApi = async (payload) => {
  const { data } = await apiClient.post("/newsletter/unsubscribe", payload);
  return data;
};
