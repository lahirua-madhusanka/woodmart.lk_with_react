import axios from "axios";
import { USER_SESSION_KEY } from "../constants/sessionKeys";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem(USER_SESSION_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const getApiErrorMessage = (error) => {
  if (error?.response?.data?.errors?.length) {
    return error.response.data.errors[0].message;
  }
  return error?.response?.data?.message || error.message || "Something went wrong";
};

export default apiClient;
