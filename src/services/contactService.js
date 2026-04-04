import apiClient from "./apiClient";

export const submitContactInquiryApi = async (payload) => {
  const { data } = await apiClient.post("/contact", payload);
  return data;
};
