import { useCallback, useEffect, useRef } from "react";

const DEFAULT_ACTIVITY_EVENTS = ["mousemove", "keydown", "click", "scroll"];

export default function useAutoLogout({
  enabled,
  idleTimeoutMs,
  warningBeforeMs = 0,
  onIdleTimeout,
  onWarning,
  onBeforeUnload,
  activityEvents = DEFAULT_ACTIVITY_EVENTS,
}) {
  const idleTimerRef = useRef(null);
  const warningTimerRef = useRef(null);
  const warningShownRef = useRef(false);

  const clearTimers = useCallback(() => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }

    if (warningTimerRef.current) {
      clearTimeout(warningTimerRef.current);
      warningTimerRef.current = null;
    }
  }, []);

  const resetTimers = useCallback(() => {
    if (!enabled) return;

    clearTimers();
    warningShownRef.current = false;

    if (warningBeforeMs > 0 && warningBeforeMs < idleTimeoutMs && typeof onWarning === "function") {
      warningTimerRef.current = setTimeout(() => {
        if (warningShownRef.current) return;
        warningShownRef.current = true;
        onWarning();
      }, idleTimeoutMs - warningBeforeMs);
    }

    idleTimerRef.current = setTimeout(() => {
      onIdleTimeout();
    }, idleTimeoutMs);
  }, [clearTimers, enabled, idleTimeoutMs, onIdleTimeout, onWarning, warningBeforeMs]);

  useEffect(() => {
    if (!enabled) {
      clearTimers();
      return undefined;
    }

    const handleActivity = () => {
      resetTimers();
    };

    activityEvents.forEach((eventName) => {
      window.addEventListener(eventName, handleActivity);
    });

    resetTimers();

    return () => {
      activityEvents.forEach((eventName) => {
        window.removeEventListener(eventName, handleActivity);
      });
      clearTimers();
    };
  }, [activityEvents, clearTimers, enabled, resetTimers]);

  useEffect(() => {
    if (!enabled || typeof onBeforeUnload !== "function") {
      return undefined;
    }

    const handleBeforeUnload = () => {
      onBeforeUnload();
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("pagehide", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("pagehide", handleBeforeUnload);
    };
  }, [enabled, onBeforeUnload]);
}
