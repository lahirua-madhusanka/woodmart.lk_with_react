import apiClient from "./apiClient";

export const getMyInquiries = async () => {
  const response = await apiClient.get("/contact/my-inquiries");
  return response?.data || [];
};

export const deleteMyInquiry = async (id) => {
  const response = await apiClient.delete(`/contact/my-inquiries/${id}`);
  return response?.data;
};
