import { useEffect, useState } from "react";
import RoutePrefetchLink from "../common/RoutePrefetchLink";
import { getStorefrontBannersBySectionApi } from "../../services/storefrontBannersService";

const sectionLabelMap = {
  promo_strip: "Promo Strip",
  category_promo: "Category Promo",
  featured_section: "Featured",
  secondary_banner: "More Offers",
};

function BannerAction({ banner }) {
  if (!banner?.buttonText || !banner?.buttonLink) return null;

  if (banner.buttonLink.startsWith("/")) {
    return (
      <RoutePrefetchLink
        to={banner.buttonLink}
        routeKey="shop"
        className="inline-flex rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
      >
        {banner.buttonText}
      </RoutePrefetchLink>
    );
  }

  return (
    <a
      href={banner.buttonLink}
      target="_blank"
      rel="noreferrer"
      className="inline-flex rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
    >
      {banner.buttonText}
    </a>
  );
}

function StorefrontBannerSection({ section, columns = 2, containerClassName = "" }) {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;

    const load = async () => {
      try {
        const data = await getStorefrontBannersBySectionApi(section);
        if (!ignore) {
          setBanners(Array.isArray(data) ? data : []);
        }
      } catch {
        if (!ignore) {
          setBanners([]);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      ignore = true;
    };
  }, [section]);

  if (loading) {
    return (
      <section className={containerClassName}>
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-muted">
          Loading banners...
        </div>
      </section>
    );
  }

  if (!banners.length) {
    return null;
  }

  return (
    <section className={containerClassName}>
      <div className={`grid gap-4 ${columns === 1 ? "grid-cols-1" : "lg:grid-cols-2"}`}>
        {banners.map((banner) => (
          <article key={banner.id} className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-900 p-6 text-white">
            <img
              src={banner.imageUrl}
              alt={banner.title}
              loading="lazy"
              decoding="async"
              className="absolute inset-0 h-full w-full object-cover opacity-45"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/65 to-transparent" />
            <div className="relative z-10 max-w-md space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-brand-light">
                {sectionLabelMap[banner.section] || sectionLabelMap[section] || "Banner"}
              </p>
              <h3 className="font-display text-3xl font-semibold leading-tight">{banner.title}</h3>
              {banner.subtitle ? <p className="text-sm text-white/90">{banner.subtitle}</p> : null}
              <BannerAction banner={banner} />
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export default StorefrontBannerSection;
