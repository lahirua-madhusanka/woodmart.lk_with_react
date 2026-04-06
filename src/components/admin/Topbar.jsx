import { LogOut, Menu } from "lucide-react";
import { useAdminAuth } from "../../context/AdminAuthContext";

function Topbar({ onToggleSidebar, title = "Admin Dashboard" }) {
  const { logout, user } = useAdminAuth();

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 lg:px-6">
      <div className="flex items-center gap-2">
        <button
          onClick={onToggleSidebar}
          className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
          aria-label="Toggle sidebar"
        >
          <Menu size={18} />
        </button>
        <h1 className="text-lg font-semibold text-ink">{title}</h1>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden text-right text-xs sm:block">
          <p className="font-semibold text-ink">{user?.name}</p>
          <p className="text-muted">{user?.email}</p>
        </div>
        <button
          onClick={logout}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:border-brand hover:text-brand"
        >
          <LogOut size={14} /> Logout
        </button>
      </div>
    </header>
  );
}

export default Topbar;
