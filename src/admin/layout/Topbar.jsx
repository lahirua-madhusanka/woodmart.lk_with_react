import { LogOut, Menu } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAdminAuth } from "../../context/AdminAuthContext";

function Topbar({ onToggleMobile }) {
  const { logout } = useAdminAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/admin/login");
  };

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="flex h-16 items-center justify-between px-4 lg:px-6">
        <button
          type="button"
          onClick={onToggleMobile}
          className="inline-flex rounded-lg border border-slate-300 p-2 text-slate-700 lg:hidden"
        >
          <Menu size={18} />
        </button>
        <Link to="/" className="text-sm font-semibold text-brand-dark">
          Back to Storefront
        </Link>
        <button
          type="button"
          onClick={handleLogout}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-ink"
        >
          <LogOut size={16} />
          Logout
        </button>
      </div>
    </header>
  );
}

export default Topbar;
