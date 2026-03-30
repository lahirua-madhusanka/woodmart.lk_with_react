import {
  Heart,
  Menu,
  Search,
  ShoppingBag,
  UserCircle2,
  X,
} from "lucide-react";
import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import RoutePrefetchLink from "../common/RoutePrefetchLink";
import { usePrefetchOnHover, usePrefetchTrigger } from "../../hooks/usePrefetchOnHover";
import { useAuth } from "../../context/AuthContext";
import { useStorefrontSettings } from "../../context/StorefrontSettingsContext";
import { useStore } from "../../context/StoreContext";

const menuLinks = [
  { to: "/", label: "Home" },
  { to: "/shop", label: "Shop" },
  { to: "/custom-project", label: "Custom Project" },
  { to: "/about", label: "About" },
  { to: "/contact", label: "Contact" },
];

function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const navigate = useNavigate();
  const { isAuthenticated, logout, user } = useAuth();
  const { settings } = useStorefrontSettings();
  const { cartCount, wishlist } = useStore();
  const cartPrefetch = usePrefetchOnHover("cart");
  const wishlistPrefetch = usePrefetchOnHover("wishlist");
  const authPrefetch = usePrefetchOnHover("auth", { allow: !isAuthenticated });
  const shopPrefetch = usePrefetchOnHover("shop");
  const customProjectPrefetch = usePrefetchOnHover("customProject");
  const triggerAuthPrefetch = usePrefetchTrigger("auth", { allow: !isAuthenticated, immediate: true });

  const handleSearch = (event) => {
    event.preventDefault();
    const query = searchText.trim();
    navigate(query ? `/shop?q=${encodeURIComponent(query)}` : "/shop");
    setMobileOpen(false);
  };

  const navLinkClass = ({ isActive }) =>
    `text-sm font-semibold transition ${
      isActive ? "text-brand" : "text-ink hover:text-brand"
    }`;

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 backdrop-blur">
      <div className="container-pad py-4">
        <div className="flex items-center gap-3 lg:gap-6">
          <button
            className="inline-flex rounded-md p-2 text-ink lg:hidden"
            onClick={() => setMobileOpen((prev) => !prev)}
            aria-label="Toggle navigation"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          <NavLink to="/" className="shrink-0 font-display text-2xl font-bold text-brand">
            {settings.storeName}
          </NavLink>

          <nav className="hidden items-center gap-6 xl:gap-7 lg:flex">
          {menuLinks.map((link) => (
            link.to === "/shop" ? (
              <NavLink key={link.to} to={link.to} className={navLinkClass} {...shopPrefetch}>
                {link.label}
              </NavLink>
            ) : link.to === "/custom-project" ? (
              <NavLink key={link.to} to={link.to} className={navLinkClass} {...customProjectPrefetch}>
                {link.label}
              </NavLink>
            ) : (
              <NavLink key={link.to} to={link.to} className={navLinkClass}>
                {link.label}
              </NavLink>
            )
          ))}
          </nav>

          <div className="ml-auto hidden items-center gap-3 md:flex">
            <form onSubmit={handleSearch}>
              <label className="flex min-w-64 lg:min-w-72 items-center rounded-lg border border-slate-300 bg-slate-50 px-3 py-2">
                <Search size={16} className="text-slate-500" />
                <input
                  type="text"
                  value={searchText}
                  onChange={(event) => setSearchText(event.target.value)}
                  placeholder="Search products..."
                  className="ml-2 w-full bg-transparent text-sm outline-none"
                />
              </label>
            </form>

            <RoutePrefetchLink
              routeKey="wishlist"
              to="/wishlist"
              className="relative rounded-full p-2 text-slate-700 transition hover:bg-slate-100 hover:text-brand"
              aria-label="Wishlist"
              {...wishlistPrefetch}
            >
              <Heart size={20} />
              {wishlist.length > 0 && (
                <span className="absolute -right-0.5 -top-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-brand text-[10px] font-bold text-white">
                  {wishlist.length}
                </span>
              )}
            </RoutePrefetchLink>

            <RoutePrefetchLink
              routeKey="cart"
              to="/cart"
              className="relative rounded-full p-2 text-slate-700 transition hover:bg-slate-100 hover:text-brand"
              aria-label="Cart"
              {...cartPrefetch}
            >
              <ShoppingBag size={20} />
              {cartCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-slate-900">
                  {cartCount}
                </span>
              )}
            </RoutePrefetchLink>

            <NavLink
              to={isAuthenticated ? "/account" : "/auth"}
              className="rounded-full p-2 text-slate-700 transition hover:bg-slate-100 hover:text-brand"
              aria-label="Account"
              title={isAuthenticated ? "My Account" : "Login"}
              onMouseEnter={triggerAuthPrefetch}
              onFocus={triggerAuthPrefetch}
              {...(!isAuthenticated ? authPrefetch : {})}
            >
              <UserCircle2 size={22} />
            </NavLink>
          </div>
        </div>
      </div>

      {mobileOpen && (
        <div className="border-t border-slate-200 bg-white lg:hidden">
          <div className="container-pad space-y-4 py-4">
            <form onSubmit={handleSearch}>
              <label className="flex items-center rounded-lg border border-slate-300 bg-slate-50 px-3 py-2">
                <Search size={16} className="text-slate-500" />
                <input
                  type="text"
                  value={searchText}
                  onChange={(event) => setSearchText(event.target.value)}
                  placeholder="Search products..."
                  className="ml-2 w-full bg-transparent text-sm outline-none"
                />
              </label>
            </form>

            <div className="flex items-center gap-2">
              <RoutePrefetchLink
                routeKey="wishlist"
                to="/wishlist"
                onClick={() => setMobileOpen(false)}
                className="relative rounded-full p-2 text-slate-700 transition hover:bg-slate-100 hover:text-brand"
                aria-label="Wishlist"
                {...wishlistPrefetch}
              >
                <Heart size={20} />
                {wishlist.length > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-brand text-[10px] font-bold text-white">
                    {wishlist.length}
                  </span>
                )}
              </RoutePrefetchLink>

              <RoutePrefetchLink
                routeKey="cart"
                to="/cart"
                onClick={() => setMobileOpen(false)}
                className="relative rounded-full p-2 text-slate-700 transition hover:bg-slate-100 hover:text-brand"
                aria-label="Cart"
                {...cartPrefetch}
              >
                <ShoppingBag size={20} />
                {cartCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-slate-900">
                    {cartCount}
                  </span>
                )}
              </RoutePrefetchLink>

              <NavLink
                to={isAuthenticated ? "/account" : "/auth"}
                onClick={() => setMobileOpen(false)}
                className="rounded-full p-2 text-slate-700 transition hover:bg-slate-100 hover:text-brand"
                aria-label="Account"
                title={isAuthenticated ? "My Account" : "Login"}
                onMouseEnter={triggerAuthPrefetch}
                onFocus={triggerAuthPrefetch}
                {...(!isAuthenticated ? authPrefetch : {})}
              >
                <UserCircle2 size={22} />
              </NavLink>
            </div>

            <nav className="grid gap-3">
              {menuLinks.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  className={navLinkClass}
                  onClick={() => setMobileOpen(false)}
                  {...(link.to === "/shop"
                    ? shopPrefetch
                    : link.to === "/custom-project"
                    ? customProjectPrefetch
                    : {})}
                >
                  {link.label}
                </NavLink>
              ))}
              {isAuthenticated ? (
                <>
                  <NavLink to="/account" onClick={() => setMobileOpen(false)} className={navLinkClass}>
                    My Account
                  </NavLink>
                  {user?.role === "admin" ? (
                    <NavLink to="/admin" onClick={() => setMobileOpen(false)} className={navLinkClass}>
                      Admin Dashboard
                    </NavLink>
                  ) : null}
                  <button
                    onClick={() => {
                      logout();
                      setMobileOpen(false);
                    }}
                    className="text-left text-sm font-semibold text-ink"
                  >
                    Logout {user?.name ? `(${user.name})` : ""}
                  </button>
                </>
              ) : (
                <NavLink to="/auth" onClick={() => setMobileOpen(false)} className={navLinkClass}>
                  Login / Register
                </NavLink>
              )}
            </nav>
          </div>
        </div>
      )}
    </header>
  );
}

export default Navbar;