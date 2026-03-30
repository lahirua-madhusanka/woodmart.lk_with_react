import { Mail, MapPin, Phone } from "lucide-react";
import { NavLink } from "react-router-dom";
import { useStorefrontSettings } from "../../context/StorefrontSettingsContext";

function Footer() {
  const { settings } = useStorefrontSettings();

  return (
    <footer className="mt-16 border-t border-slate-200 bg-white">
      <div className="container-pad grid gap-10 py-12 md:grid-cols-2 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <NavLink to="/" className="font-display text-2xl font-bold text-brand">
            {settings.storeName}
          </NavLink>
          <p className="mt-4 max-w-md text-sm text-muted">
            Premium wooden and lifestyle essentials designed for curated homes.
            Crafted with quality materials and timeless details.
          </p>
          <div className="mt-5 flex items-center gap-2 text-slate-600">
            <a href="#" className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold transition hover:bg-brand hover:text-white">
              IG
            </a>
            <a href="#" className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold transition hover:bg-brand hover:text-white">
              FB
            </a>
            <a href="#" className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold transition hover:bg-brand hover:text-white">
              X
            </a>
          </div>
        </div>

        <div>
          <h4 className="font-semibold text-ink">Quick Links</h4>
          <ul className="mt-4 space-y-2 text-sm text-muted">
            <li><NavLink to="/shop" className="hover:text-brand">Shop All</NavLink></li>
            <li><NavLink to="/about" className="hover:text-brand">About</NavLink></li>
            <li><NavLink to="/contact" className="hover:text-brand">Contact</NavLink></li>
            <li><NavLink to="/auth" className="hover:text-brand">My Account</NavLink></li>
          </ul>
        </div>

        <div>
          <h4 className="font-semibold text-ink">Customer Service</h4>
          <ul className="mt-4 space-y-2 text-sm text-muted">
            <li><a href="#" className="hover:text-brand">Shipping Policy</a></li>
            <li><a href="#" className="hover:text-brand">Returns & Refunds</a></li>
            <li><a href="#" className="hover:text-brand">Order Tracking</a></li>
            <li><a href="#" className="hover:text-brand">FAQ</a></li>
          </ul>
        </div>

        <div>
          <h4 className="font-semibold text-ink">Get in Touch</h4>
          <ul className="mt-4 space-y-3 text-sm text-muted">
            <li className="inline-flex items-start gap-2">
              <MapPin size={16} className="mt-0.5" /> {settings.storeAddress || "224 Artisan Street, New York"}
            </li>
            <li className="inline-flex items-center gap-2">
              <Phone size={16} /> {settings.contactNumber || "+1 (212) 555-0193"}
            </li>
            <li className="inline-flex items-center gap-2">
              <Mail size={16} /> {settings.supportEmail || "support@atelieroak.com"}
            </li>
          </ul>
          <div className="mt-5 rounded-lg bg-brand-light p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-brand-dark">
              Weekly Updates
            </p>
            <div className="flex rounded-lg border border-slate-200 bg-white p-1">
              <input
                type="email"
                placeholder="Email address"
                className="w-full border-none px-2 text-sm outline-none"
              />
              <button className="rounded-md bg-brand px-3 py-2 text-xs font-semibold text-white">
                Join
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="border-t border-slate-200 py-4">
        <p className="container-pad text-xs text-muted">
          Copyright {new Date().getFullYear()} {settings.storeName}. All rights reserved.
        </p>
      </div>
    </footer>
  );
}

export default Footer;