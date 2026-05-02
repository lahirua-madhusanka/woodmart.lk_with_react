import { useEffect } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

/**
 * Scrolls to top on every route change (path, search, or hash#-less changes).
 * Skips scroll on browser back/forward (POP) so users return to their previous
 * scroll position naturally.
 *
 * Place once inside <BrowserRouter>, e.g. at the top of <App />.
 */
function ScrollToTop({ behavior = "auto" }) {
  const { pathname, search } = useLocation();
  const navigationType = useNavigationType(); // "PUSH" | "REPLACE" | "POP"

  useEffect(() => {
    if (navigationType === "POP") return;

    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const effectiveBehavior = prefersReducedMotion ? "auto" : behavior;

    const scroll = () => {
      try {
        window.scrollTo({ top: 0, left: 0, behavior: effectiveBehavior });
      } catch {
        window.scrollTo(0, 0);
      }
      if (document.documentElement) document.documentElement.scrollTop = 0;
      if (document.body) document.body.scrollTop = 0;
    };

    // Run now and again after the next frame, so it works even when the
    // destination page is lazy-loaded via Suspense (content arrives later).
    scroll();
    const raf = requestAnimationFrame(scroll);
    const timeout = setTimeout(scroll, 0);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timeout);
    };
  }, [pathname, search, behavior, navigationType]);

  return null;
}

export default ScrollToTop;
