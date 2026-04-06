const navItems = [
  { key: "dashboard", label: "Dashboard" },
  { key: "orders", label: "My Orders" },
  { key: "addresses", label: "My Addresses" },
  { key: "settings", label: "Account Settings" },
  { key: "wishlist", label: "Wishlist" },
  { key: "cart", label: "Cart" },
];

function AccountSidebar({ activeTab, onTabChange, user, onLogout }) {
  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-slate-50 p-3">
        <p className="text-sm text-muted">Signed in as</p>
        <p className="mt-1 font-semibold text-ink">{user?.name || user?.email || "User"}</p>
        <p className="text-xs text-muted">{user?.email || ""}</p>
      </div>

      <nav className="space-y-1">
        {navItems.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => onTabChange(item.key)}
            className={`w-full rounded-lg px-3 py-2 text-left text-sm font-semibold transition ${
              activeTab === item.key
                ? "bg-brand text-white"
                : "text-ink hover:bg-slate-100"
            }`}
          >
            {item.label}
          </button>
        ))}

        <button
          type="button"
          onClick={onLogout}
          className="w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-red-600 transition hover:bg-red-50"
        >
          Logout
        </button>
      </nav>
    </div>
  );
}

export default AccountSidebar;
