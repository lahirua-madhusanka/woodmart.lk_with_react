import { get, put } from "./adminApi";

export const getContactInquiries = async (status = "", search = "") => {
  const params = new URLSearchParams();
  if (status) {
    params.append("status", status);
  }
  if (search) {
    params.append("q", search);
  }
  const query = params.toString() ? `?${params.toString()}` : "";
  const response = await get(`/admin/contact-messages${query}`);
  return response?.data || [];
};

export const updateContactMessageStatus = async (id, status) => {
  const response = await put(`/admin/contact-messages/${id}`, { status });
  return response?.data;
};
