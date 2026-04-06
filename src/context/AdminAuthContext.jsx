import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import adminApiClient from "../admin/services/adminApiClient";
import { getApiErrorMessage } from "../services/apiClient";
import { ADMIN_SESSION_KEY } from "../constants/sessionKeys";

const AdminAuthContext = createContext(null);

export function AdminAuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(ADMIN_SESSION_KEY) || "");
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAdminProfile = async () => {
      if (!token) {
        setUser(null);
        setLoading(false);
        return;
      }

      try {
        const { data } = await adminApiClient.get("/auth/profile");
        if (data?.user?.role !== "admin") {
          localStorage.removeItem(ADMIN_SESSION_KEY);
          setToken("");
          setUser(null);
        } else {
          setUser(data.user);
        }
      } catch {
        localStorage.removeItem(ADMIN_SESSION_KEY);
        setToken("");
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    loadAdminProfile();
  }, [token]);

  const login = async (payload) => {
    try {
      const { data } = await adminApiClient.post("/auth/login", payload);
      if (data?.user?.role !== "admin") {
        throw new Error("Admin access required");
      }
      localStorage.setItem(ADMIN_SESSION_KEY, data.token);
      setToken(data.token);
      setUser(data.user);
      toast.success("Admin login successful");
      return data.user;
    } catch (error) {
      toast.error(getApiErrorMessage(error));
      throw error;
    }
  };

  const logout = async () => {
    try {
      await adminApiClient.post("/auth/logout");
    } catch {
      // Ignore API logout failures during local cleanup.
    }

    localStorage.removeItem(ADMIN_SESSION_KEY);
    setToken("");
    setUser(null);
    toast.info("Admin logged out");
  };

  const refreshProfile = async () => {
    if (!token) return null;
    const { data } = await adminApiClient.get("/auth/profile");
    if (data?.user?.role !== "admin") {
      throw new Error("Admin access required");
    }
    setUser(data.user);
    return data.user;
  };

  const value = useMemo(
    () => ({
      token,
      user,
      loading,
      isAuthenticated: Boolean(token && user),
      login,
      logout,
      refreshProfile,
    }),
    [token, user, loading]
  );

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error("useAdminAuth must be used within AdminAuthProvider");
  }
  return context;
}
