import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import adminApiClient from "../admin/services/adminApiClient";
import { getApiErrorMessage } from "../services/apiClient";
import { ADMIN_SESSION_KEY } from "../constants/sessionKeys";
import { IDLE_TIMEOUT_MS, IDLE_WARNING_MS } from "../constants/sessionTimeouts";
import useAutoLogout from "../hooks/useAutoLogout";

const AdminAuthContext = createContext(null);

export function AdminAuthProvider({ children }) {
  const navigate = useNavigate();
  const [token, setToken] = useState(() => localStorage.getItem(ADMIN_SESSION_KEY) || "");
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const clearAdminStorage = useCallback(() => {
    localStorage.removeItem(ADMIN_SESSION_KEY);
    sessionStorage.removeItem(ADMIN_SESSION_KEY);
  }, []);

  const clearAdminSessionState = useCallback(() => {
    clearAdminStorage();
    setToken("");
    setUser(null);
  }, [clearAdminStorage]);

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
          clearAdminSessionState();
        } else {
          setUser(data.user);
        }
      } catch {
        clearAdminSessionState();
      } finally {
        setLoading(false);
      }
    };

    loadAdminProfile();
  }, [clearAdminSessionState, token]);

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

    clearAdminSessionState();
    toast.info("Admin logged out");
  };

  const handleIdleWarning = useCallback(() => {
    const warningSeconds = Math.max(Math.round(IDLE_WARNING_MS / 1000), 1);
    const warningMinutes = Math.max(Math.ceil(warningSeconds / 60), 1);
    toast.warning(`You will be logged out in ${warningMinutes} minute due to inactivity`, {
      autoClose: 4000,
    });
  }, []);

  const handleIdleLogout = useCallback(async () => {
    try {
      await adminApiClient.post("/auth/logout");
    } catch {
      // Ignore API logout failures during local cleanup.
    }

    clearAdminSessionState();
    toast.info("Session expired due to inactivity");
    navigate("/admin/login", { replace: true });
  }, [clearAdminSessionState, navigate]);

  useAutoLogout({
    enabled: Boolean(token && user),
    idleTimeoutMs: IDLE_TIMEOUT_MS,
    warningBeforeMs: IDLE_WARNING_MS,
    onIdleTimeout: handleIdleLogout,
    onWarning: handleIdleWarning,
    onBeforeUnload: clearAdminStorage,
  });

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
