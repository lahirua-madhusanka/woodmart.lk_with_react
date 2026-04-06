import { Link } from "react-router-dom";

function PromoBanner() {
  return (
    <section className="container-pad py-10">
      <div className="grid gap-4 lg:grid-cols-2">
        <article className="relative overflow-hidden rounded-2xl bg-slate-900 p-8 text-white">
          <img
            src="https://images.unsplash.com/photo-1484101403633-562f891dc89a?auto=format&fit=crop&w=1200&q=80"
            alt="Dining collection"
            loading="lazy"
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover opacity-35"
          />
          <div className="relative z-10 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-amber-300">
              Spring Dining Edit
            </p>
            <h3 className="font-display text-3xl font-semibold">Save 25% on dining essentials</h3>
            <Link to="/shop" className="inline-flex rounded-lg border border-white/70 px-4 py-2 text-sm font-semibold hover:bg-white/10">
              Shop Offer
            </Link>
          </div>
        </article>

        <article className="relative overflow-hidden rounded-2xl bg-brand-light p-8">
          <img
            src="https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?auto=format&fit=crop&w=1200&q=80"
            alt="Workspace products"
            loading="lazy"
            decoding="async"
            className="absolute right-0 top-0 h-full w-2/3 object-cover opacity-35"
          />
          <div className="relative z-10 max-w-sm space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-brand-dark">
              Workspace Upgrade
            </p>
            <h3 className="font-display text-3xl font-semibold text-brand-dark">
              Build your calm productive corner
            </h3>
            <Link
              to="/custom-project"
              className="inline-flex rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
            >
              Build your dream
            </Link>
          </div>
        </article>
      </div>
    </section>
  );
}

export default PromoBanner;