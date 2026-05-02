import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, BadgePercent, ChevronLeft, ChevronRight } from "lucide-react";
import RoutePrefetchLink from "../common/RoutePrefetchLink";
import { useStorefrontSettings } from "../../context/StorefrontSettingsContext";

const DEFAULT_HERO_IMAGE =
  "https://images.unsplash.com/photo-1493666438817-866a91353ca9?auto=format&fit=crop&w=1200&q=80";

const AUTOPLAY_MS = 5000;

const normalizeSlides = (settings) => {
  const source = Array.isArray(settings?.heroSlides) ? settings.heroSlides : [];
  const slides = source
    .filter(Boolean)
    .filter((slide) => String(slide?.status || "active").toLowerCase() !== "inactive")
    .slice(0, 3)
    .map((slide, index) => ({
      id: String(slide?.id || `hero-slide-${index + 1}`),
      imageUrl: String(slide?.imageUrl || "").trim() || DEFAULT_HERO_IMAGE,
      title: String(slide?.title || settings?.heroTitle || "Craft your space with timeless pieces."),
      subtitle: String(slide?.subtitle || settings?.heroSubtitle || "").trim(),
      buttonText: String(slide?.buttonText || "Shop Now").trim() || "Shop Now",
      buttonLink: String(slide?.buttonLink || "/shop").trim() || "/shop",
      displayOrder: Number.isFinite(Number(slide?.displayOrder)) ? Number(slide.displayOrder) : index + 1,
    }))
    .sort((a, b) => a.displayOrder - b.displayOrder);

  if (slides.length) return slides;

  return [
    {
      id: "hero-fallback-1",
      imageUrl: settings?.heroImage || DEFAULT_HERO_IMAGE,
      title: settings?.heroTitle || "Craft your space with timeless pieces.",
      subtitle:
        settings?.heroSubtitle ||
        "Discover premium furniture, decor, and lifestyle objects inspired by natural materials and modern living.",
      buttonText: settings?.heroPrimaryButtonText || "Shop Now",
      buttonLink: settings?.heroPrimaryButtonLink || "/shop",
      displayOrder: 1,
    },
  ];
};

function HeroSection() {
  const { settings } = useStorefrontSettings();
  const slides = useMemo(() => normalizeSlides(settings), [settings]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchStartXRef = useRef(0);

  useEffect(() => {
    setActiveIndex((previous) => {
      if (slides.length <= 1) return 0;
      return previous >= slides.length ? 0 : previous;
    });
  }, [slides.length]);

  useEffect(() => {
    if (slides.length <= 1 || paused) return undefined;

    const intervalId = window.setInterval(() => {
      setActiveIndex((previous) => (previous + 1) % slides.length);
    }, AUTOPLAY_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [paused, slides.length]);

  const goPrev = () => {
    setActiveIndex((previous) => (previous - 1 + slides.length) % slides.length);
  };

  const goNext = () => {
    setActiveIndex((previous) => (previous + 1) % slides.length);
  };

  const activeSlide = slides[activeIndex] || slides[0];
  const activeSlideImageUrl = useMemo(() => {
    const baseUrl = activeSlide?.imageUrl;
    if (!baseUrl) return "";

    const settingsVersion = Number(
      settings?.settingsVersion || (settings?.updatedAt ? new Date(settings.updatedAt).getTime() : 0)
    );

    if (!Number.isFinite(settingsVersion) || settingsVersion <= 0) {
      return baseUrl;
    }

    return `${baseUrl}${baseUrl.includes("?") ? "&" : "?"}v=${settingsVersion}`;
  }, [activeSlide?.imageUrl, settings?.settingsVersion, settings?.updatedAt]);

  const onTouchStart = (event) => {
    touchStartXRef.current = event.changedTouches?.[0]?.clientX || 0;
  };

  const onTouchEnd = (event) => {
    const touchEndX = event.changedTouches?.[0]?.clientX || 0;
    const deltaX = touchEndX - touchStartXRef.current;
    if (Math.abs(deltaX) < 40 || slides.length <= 1) return;
    if (deltaX < 0) {
      goNext();
    } else {
      goPrev();
    }
  };

  const floatingControlMotion = {
    y: [0, -1.2, 0],
    transition: {
      duration: 5.2,
      repeat: Infinity,
      ease: "easeInOut",
    },
  };

  return (
    <section className="container-pad py-6 sm:py-8 md:py-10 lg:py-12">
      <div
        className="relative isolate overflow-hidden rounded-[1.75rem] border border-slate-200/70 shadow-premium sm:rounded-[2rem]"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <AnimatePresence mode="wait">
          <motion.img
            key={activeSlide.id}
            src={activeSlideImageUrl || activeSlide.imageUrl}
            alt={activeSlide.title || "Premium living room setup"}
            loading="eager"
            fetchPriority="high"
            decoding="async"
            initial={{ opacity: 0.15, scale: 1.08, x: 8 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0.15, scale: 1.04, x: -8 }}
            transition={{ duration: 1.05, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-0 h-full w-full object-cover"
            onError={(event) => {
              event.currentTarget.src = DEFAULT_HERO_IMAGE;
            }}
          />
        </AnimatePresence>

        <div className="absolute inset-0 bg-gradient-to-r from-[#2e241a]/64 via-[#3f3122]/36 to-[#70553b]/10" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,245,231,0.22),transparent_44%),linear-gradient(180deg,transparent_34%,rgba(33,23,15,0.2)_100%)]" />

        <div className="relative flex min-h-[410px] items-center px-4 py-9 sm:min-h-[500px] sm:px-7 md:min-h-[560px] md:px-10 md:py-12 lg:min-h-[610px] lg:px-12 lg:py-14">
          <AnimatePresence mode="wait">
            <motion.div
              key={`content-${activeSlide.id}`}
              initial="hidden"
              animate="visible"
              exit="exit"
              variants={{
                hidden: { opacity: 0 },
                visible: {
                  opacity: 1,
                  transition: { staggerChildren: 0.14, delayChildren: 0.08 },
                },
                exit: {
                  opacity: 0,
                  transition: { duration: 0.35, ease: [0.4, 0, 0.2, 1] },
                },
              }}
              className="max-w-[33rem] space-y-4 rounded-[1.1rem] border border-[#f0dfc9]/55 bg-[#f8f0e4]/58 p-4 shadow-[0_12px_28px_rgba(40,29,18,0.12)] backdrop-blur-[2px] sm:space-y-4.5 sm:p-5 md:max-w-[34rem] md:p-6"
            >
              <motion.span
                variants={{
                  hidden: { opacity: 0, x: -32 },
                  visible: { opacity: 1, x: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } },
                  exit: { opacity: 0, x: -16, transition: { duration: 0.3 } },
                }}
                className="inline-flex items-center gap-1.5 rounded-full border border-[#d8bc99]/65 bg-[#fcf4e8]/78 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#6f5338] shadow-sm sm:px-3 sm:text-[10px]"
              >
                <BadgePercent size={14} /> New Season Offer up to 35% Off
              </motion.span>

              <motion.h1
                variants={{
                  hidden: { opacity: 0, x: -48 },
                  visible: { opacity: 1, x: 0, transition: { duration: 0.85, ease: [0.22, 1, 0.36, 1] } },
                  exit: { opacity: 0, x: -24, transition: { duration: 0.3 } },
                }}
                className="max-w-3xl font-display text-[clamp(1.6rem,3.6vw,3.15rem)] font-semibold leading-[1.08] tracking-[-0.02em] text-[#2f2318]"
              >
                {activeSlide.title}
              </motion.h1>

              <motion.p
                variants={{
                  hidden: { opacity: 0, x: -40 },
                  visible: { opacity: 1, x: 0, transition: { duration: 0.85, ease: [0.22, 1, 0.36, 1] } },
                  exit: { opacity: 0, x: -20, transition: { duration: 0.3 } },
                }}
                className="max-w-2xl rounded-xl border border-[#eddcc6]/70 bg-[#fff8ef]/66 px-4 py-3 text-[0.92rem] font-normal leading-relaxed text-[#2f2318] sm:px-5 sm:py-3.5 md:text-[0.97rem]"
              >
                {activeSlide.subtitle}
              </motion.p>

              <motion.div
                variants={{
                  hidden: { opacity: 0, x: -36 },
                  visible: { opacity: 1, x: 0, transition: { duration: 0.85, ease: [0.22, 1, 0.36, 1] } },
                  exit: { opacity: 0, x: -18, transition: { duration: 0.3 } },
                }}
                className="flex flex-wrap items-center gap-2.5 pt-0.5 sm:gap-3"
              >
                <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }} transition={{ type: "spring", stiffness: 320, damping: 22 }}>
                  <RoutePrefetchLink
                    routeKey="shop"
                    to={activeSlide.buttonLink || "/shop"}
                    className="inline-flex min-h-10 items-center gap-2 rounded-full bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(9,89,164,0.2)] transition duration-300 hover:bg-brand-dark hover:shadow-[0_12px_24px_rgba(9,89,164,0.28)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2f2318]/35 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
                  >
                    {activeSlide.buttonText || "Shop Now"} <ArrowRight size={16} />
                  </RoutePrefetchLink>
                </motion.div>

                {settings.heroSecondaryButtonText ? (
                  <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }} transition={{ type: "spring", stiffness: 320, damping: 22 }}>
                    <RoutePrefetchLink
                      routeKey="shop"
                      to={settings.heroSecondaryButtonLink || "/shop"}
                      className="inline-flex min-h-10 items-center rounded-full border border-[#caae8a] bg-[#f9efe2]/72 px-4 py-2.5 text-sm font-medium text-[#5f4b3a] transition duration-300 hover:border-[#ba9a75] hover:bg-[#f7ead9]"
                    >
                      {settings.heroSecondaryButtonText}
                    </RoutePrefetchLink>
                  </motion.div>
                ) : null}
              </motion.div>
            </motion.div>
          </AnimatePresence>

          {slides.length > 1 ? (
            <>
              <motion.button
                type="button"
                onClick={goPrev}
                aria-label="Previous hero slide"
                animate={floatingControlMotion}
                whileHover={{ scale: 1.06 }}
                whileTap={{ scale: 0.96 }}
                className="absolute left-3 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-[#f0dfc9]/72 bg-[#f9efe3]/78 text-[#5f4b3a] shadow-[0_6px_14px_rgba(40,29,18,0.12)] transition duration-300 hover:bg-[#fff5ea] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2f2318]/30 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent sm:h-11 sm:w-11"
              >
                <ChevronLeft size={18} />
              </motion.button>
              <motion.button
                type="button"
                onClick={goNext}
                aria-label="Next hero slide"
                animate={{ ...floatingControlMotion, y: [0, 2, 0] }}
                whileHover={{ scale: 1.06 }}
                whileTap={{ scale: 0.96 }}
                className="absolute right-3 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-[#f0dfc9]/72 bg-[#f9efe3]/78 text-[#5f4b3a] shadow-[0_6px_14px_rgba(40,29,18,0.12)] transition duration-300 hover:bg-[#fff5ea] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2f2318]/30 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent sm:h-11 sm:w-11"
              >
                <ChevronRight size={18} />
              </motion.button>

              <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-[#f0dfc9]/70 bg-[#f9efe3]/72 px-2.5 py-1.5 shadow-[0_6px_16px_rgba(40,29,18,0.1)]">
                {slides.map((slide, index) => (
                  <button
                    key={slide.id}
                    type="button"
                    aria-label={`Go to hero slide ${index + 1}`}
                    onClick={() => setActiveIndex(index)}
                    className={`h-2 rounded-full transition-all duration-300 ${
                      index === activeIndex
                        ? "w-6.5 bg-[#8f6d4b]"
                        : "w-2 bg-[#cbb59c] hover:bg-[#b29677]"
                    }`}
                  />
                ))}
              </div>

              <div className="absolute right-4 top-4 rounded-full border border-[#f0dfc9]/70 bg-[#f9efe3]/72 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#6f543a] shadow-[0_5px_14px_rgba(40,29,18,0.1)]">
                {String(activeIndex + 1).padStart(2, "0")} / {String(slides.length).padStart(2, "0")}
              </div>
            </>
          ) : null}
        </div>
      </div>
    </section>
  );
}

export default HeroSection;