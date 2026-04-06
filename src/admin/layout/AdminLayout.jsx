import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

const mobileLinks = [
  { to: "/admin/dashboard", label: "Dashboard" },
  { to: "/admin/products", label: "Products" },
  { to: "/admin/categories", label: "Categories" },
  { to: "/admin/orders", label: "Orders" },
  { to: "/admin/custom-requests", label: "Custom Requests" },
  { to: "/admin/profit", label: "Profit Report" },
  { to: "/admin/messages", label: "Messages" },
  { to: "/admin/customers", label: "Customers" },
  { to: "/admin/reviews", label: "Reviews" },
  { to: "/admin/banners", label: "Banners" },
  { to: "/admin/coupons", label: "Coupons" },
  { to: "/admin/settings", label: "Settings" },
];

function AdminLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 text-ink">
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex w-full min-w-0 flex-col">
          <Topbar onToggleMobile={() => setMobileOpen((prev) => !prev)} />
          {mobileOpen ? (
            <div className="border-b border-slate-200 bg-white p-3 lg:hidden">
              <nav className="grid grid-cols-2 gap-2">
                {mobileLinks.map((link) => (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    onClick={() => setMobileOpen(false)}
                    className={({ isActive }) =>
                      `rounded-lg px-3 py-2 text-sm font-medium ${
                        isActive ? "bg-brand-light text-brand-dark" : "bg-slate-100 text-slate-700"
                      }`
                    }
                  >
                    {link.label}
                  </NavLink>
                ))}
              </nav>
            </div>
          ) : null}
          <main className="w-full px-4 py-5 lg:px-6">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}

export default AdminLayout;
