import axios from "axios";
import { ADMIN_SESSION_KEY } from "../../constants/sessionKeys";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const adminApiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

adminApiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem(ADMIN_SESSION_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default adminApiClient;
