import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import {
  changePasswordApi,
  loginApi,
  logoutApi,
  profileApi,
  registerApi,
  resendVerificationApi,
  updateProfileApi,
  verifyEmailApi,
} from "../services/authService";
import { getApiErrorMessage } from "../services/apiClient";
import { USER_SESSION_KEY } from "../constants/sessionKeys";
import { IDLE_TIMEOUT_MS, IDLE_WARNING_MS } from "../constants/sessionTimeouts";
import useAutoLogout from "../hooks/useAutoLogout";

const UserAuthContext = createContext(null);

export function UserAuthProvider({ children }) {
  const navigate = useNavigate();
  const [token, setToken] = useState(() => localStorage.getItem(USER_SESSION_KEY) || "");
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authCheckFailed, setAuthCheckFailed] = useState(false);

  const clearUserStorage = useCallback(() => {
    localStorage.removeItem(USER_SESSION_KEY);
    sessionStorage.removeItem(USER_SESSION_KEY);
  }, []);

  const clearUserSessionState = useCallback(() => {
    clearUserStorage();
    setToken("");
    setUser(null);
  }, [clearUserStorage]);

  useEffect(() => {
    const loadProfile = async () => {
      if (!token) {
        setUser(null);
        setLoading(false);
        return;
      }

      try {
        setAuthCheckFailed(false);
        const response = await profileApi();
        setUser(response.user);
      } catch (error) {
        const status = error?.response?.status;
        if (status === 401 || status === 403) {
          clearUserSessionState();
          setAuthCheckFailed(false);
        } else {
          setAuthCheckFailed(true);
        }
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [token]);

  const refreshProfile = async () => {
    if (!token) return null;
    setAuthCheckFailed(false);
    const response = await profileApi();
    setUser(response.user);
    return response.user;
  };

  const register = async (payload) => {
    try {
      const response = await registerApi(payload);
      if (response.token) {
        localStorage.setItem(USER_SESSION_KEY, response.token);
        setToken(response.token);
      }
      if (response.token && response.user) {
        setUser(response.user);
      }

      if (response.requiresVerification) {
        toast.success(response.message || "Registration successful. Please verify your email.");
      } else {
        toast.success(response.message || "Registration successful");
      }

      return response;
    } catch (error) {
      const message = getApiErrorMessage(error);
      toast.error(message);
      throw error;
    }
  };

  const login = async (payload) => {
    try {
      const response = await loginApi(payload);
      localStorage.setItem(USER_SESSION_KEY, response.token);
      setToken(response.token);
      setUser(response.user);
      toast.success("Login successful");
      return response.user;
    } catch (error) {
      const message = getApiErrorMessage(error);
      toast.error(message);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await logoutApi();
    } catch {
      // Ignore logout API failures during local cleanup.
    }
    clearUserSessionState();
    toast.info("Logged out");
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
      await logoutApi();
    } catch {
      // Ignore logout API failures during local cleanup.
    }

    clearUserSessionState();
    toast.info("Session expired due to inactivity");
    navigate("/auth", { replace: true });
  }, [clearUserSessionState, navigate]);

  useAutoLogout({
    enabled: Boolean(token && user),
    idleTimeoutMs: IDLE_TIMEOUT_MS,
    warningBeforeMs: IDLE_WARNING_MS,
    onIdleTimeout: handleIdleLogout,
    onWarning: handleIdleWarning,
    onBeforeUnload: clearUserStorage,
  });

  const updateProfile = async (payload) => {
    try {
      const response = await updateProfileApi(payload);
      setUser(response.user);
      toast.success("Profile updated");
      return response.user;
    } catch (error) {
      toast.error(getApiErrorMessage(error));
      throw error;
    }
  };

  const changePassword = async (payload) => {
    try {
      const response = await changePasswordApi(payload);
      toast.success(response.message || "Password updated");
      return response;
    } catch (error) {
      toast.error(getApiErrorMessage(error));
      throw error;
    }
  };

  const verifyEmail = async (payload) => {
    try {
      const response = await verifyEmailApi(payload);
      toast.success(response.message || "Email verified successfully");
      return response;
    } catch (error) {
      toast.error(getApiErrorMessage(error));
      throw error;
    }
  };

  const resendVerification = async (payload) => {
    try {
      const response = await resendVerificationApi(payload);
      toast.info(response.message || "Verification email sent");
      return response;
    } catch (error) {
      toast.error(getApiErrorMessage(error));
      throw error;
    }
  };

  const value = useMemo(
    () => ({
      user,
      token,
      loading,
      authCheckFailed,
      isAuthenticated: Boolean(user && token),
      register,
      login,
      logout,
      refreshProfile,
      updateProfile,
      changePassword,
      verifyEmail,
      resendVerification,
    }),
    [user, token, loading, authCheckFailed]
  );

  return <UserAuthContext.Provider value={value}>{children}</UserAuthContext.Provider>;
}

export function useUserAuth() {
  const context = useContext(UserAuthContext);
  if (!context) {
    throw new Error("useUserAuth must be used within UserAuthProvider");
  }
  return context;
}
