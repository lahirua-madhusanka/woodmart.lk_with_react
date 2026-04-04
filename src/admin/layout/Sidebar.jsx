import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Package,
  PlusSquare,
  Tags,
  ShoppingBag,
  FolderKanban,
  LineChart,
  MessageSquare,
  Mail,
  Users,
  Star,
  Image,
  TicketPercent,
  Settings,
} from "lucide-react";
import { useChatRealtime } from "../../context/ChatRealtimeContext";

const links = [
  { to: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/admin/products", label: "Products", icon: Package },
  { to: "/admin/products/add", label: "Add Product", icon: PlusSquare },
  { to: "/admin/categories", label: "Categories", icon: Tags },
  { to: "/admin/orders", label: "Orders", icon: ShoppingBag },
  { to: "/admin/custom-requests", label: "Custom Requests", icon: FolderKanban },
  { to: "/admin/profit", label: "Profit Report", icon: LineChart },
  { to: "/admin/messages", label: "Messages", icon: MessageSquare },
  { to: "/admin/contact", label: "Contact Inbox", icon: Mail },
  { to: "/admin/customers", label: "Customers", icon: Users },
  { to: "/admin/reviews", label: "Reviews", icon: Star },
  { to: "/admin/banners", label: "Banners", icon: Image },
  { to: "/admin/coupons", label: "Coupons", icon: TicketPercent },
  { to: "/admin/settings", label: "Settings", icon: Settings },
];

function Sidebar() {
  const { adminUnreadCount } = useChatRealtime();

  return (
    <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white p-4 lg:block">
      <div className="rounded-lg bg-brand px-3 py-2 text-sm font-bold text-white">Admin Panel</div>
      <nav className="mt-4 space-y-1">
        {links.map((link) => {
          const Icon = link.icon;

          return (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                  isActive ? "bg-brand-light text-brand-dark" : "text-slate-600 hover:bg-slate-100"
                }`
              }
            >
              <Icon size={16} />
              <span className="flex-1">{link.label}</span>
              {link.to === "/admin/messages" && adminUnreadCount > 0 ? (
                <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-brand px-1.5 text-[10px] font-bold text-white">
                  {adminUnreadCount}
                </span>
              ) : null}
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}

export default Sidebar;
