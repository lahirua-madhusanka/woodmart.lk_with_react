import { get, patch, post } from "./adminApi";

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
  const response = await patch(`/admin/contact-messages/${id}/status`, { status });
  return response?.data;
};

export const getContactInquiryById = async (id) => {
  const response = await get(`/admin/contact-messages/${id}`);
  return response?.data;
};

export const replyToContactInquiry = async (id, payload) => {
  const response = await post(`/admin/contact-messages/${id}/reply`, payload);
  return response?.data;
};
