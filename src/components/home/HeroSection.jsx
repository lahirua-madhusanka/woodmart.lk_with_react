import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, BadgePercent } from "lucide-react";
import RoutePrefetchLink from "../common/RoutePrefetchLink";
import { useStorefrontSettings } from "../../context/StorefrontSettingsContext";

const DEFAULT_HERO_IMAGE =
  "https://images.unsplash.com/photo-1493666438817-866a91353ca9?auto=format&fit=crop&w=1200&q=80";

function HeroSection() {
  const { settings } = useStorefrontSettings();
  const [heroImageSrc, setHeroImageSrc] = useState(settings.heroImage || DEFAULT_HERO_IMAGE);

  useEffect(() => {
    setHeroImageSrc(settings.heroImage || DEFAULT_HERO_IMAGE);
  }, [settings.heroImage]);

  return (
    <section className="container-pad py-8 md:py-12">
      <div className="relative overflow-hidden rounded-[2rem] border border-slate-200/70 shadow-premium">
        <img
          src={heroImageSrc}
          alt={settings.heroTitle || "Premium living room setup"}
          loading="eager"
          fetchPriority="high"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover"
          onError={() => {
            setHeroImageSrc(DEFAULT_HERO_IMAGE);
          }}
        />

        <div className="relative px-5 py-10 sm:px-7 md:px-10 md:py-12 lg:px-12 lg:py-16">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55 }}
            className="max-w-xl space-y-6"
          >
            <span className="inline-flex items-center gap-2 rounded-full bg-brand-light px-3 py-1 text-xs font-semibold uppercase tracking-wide text-brand-dark">
              <BadgePercent size={14} /> New Season Offer up to 35% Off
            </span>

            <h1 className="font-display text-4xl font-bold leading-[1.05] text-brand-dark md:text-5xl lg:text-6xl">
              {settings.heroTitle}
            </h1>

            <p className="max-w-lg rounded-xl bg-white/78 px-4 py-3 text-sm font-medium text-brand-dark shadow-sm backdrop-blur-[1px] md:text-base">
              {settings.heroSubtitle}
            </p>

            <div className="flex flex-wrap gap-3 pt-1">
              <RoutePrefetchLink
                routeKey="shop"
                to={settings.heroPrimaryButtonLink || "/shop"}
                className="inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-dark"
              >
                {settings.heroPrimaryButtonText || "Shop Now"} <ArrowRight size={16} />
              </RoutePrefetchLink>
              <RoutePrefetchLink
                routeKey="shop"
                to={settings.heroSecondaryButtonLink || "/shop"}
                className="inline-flex items-center rounded-xl border border-brand/45 bg-white/75 px-5 py-3 text-sm font-semibold text-brand transition hover:bg-brand-light"
              >
                {settings.heroSecondaryButtonText || "View Collection"}
              </RoutePrefetchLink>
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
}

export default HeroSection;