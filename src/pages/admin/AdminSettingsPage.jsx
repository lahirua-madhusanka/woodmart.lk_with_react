import { useState } from "react";
import { toast } from "react-toastify";

function AdminSettingsPage() {
  const [settings, setSettings] = useState({
    storeName: "Woodmart.lk",
    supportEmail: "support@woodmart.lk",
    lowStockThreshold: 10,
    allowGuestCheckout: false,
  });

  const setField = (key) => (event) => {
    const value = event.target.type === "checkbox" ? event.target.checked : event.target.value;
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const save = (event) => {
    event.preventDefault();
    toast.success("Settings saved (demo UI)");
  };

  return (
    <form onSubmit={save} className="grid gap-4 rounded-xl border border-slate-200 bg-white p-5 md:grid-cols-2">
      <label className="text-sm">
        <span className="mb-1 block font-semibold">Store Name</span>
        <input value={settings.storeName} onChange={setField("storeName")} className="w-full rounded-lg border border-slate-300 px-3 py-2" />
      </label>

      <label className="text-sm">
        <span className="mb-1 block font-semibold">Support Email</span>
        <input value={settings.supportEmail} onChange={setField("supportEmail")} className="w-full rounded-lg border border-slate-300 px-3 py-2" />
      </label>

      <label className="text-sm">
        <span className="mb-1 block font-semibold">Low Stock Threshold</span>
        <input type="number" value={settings.lowStockThreshold} onChange={setField("lowStockThreshold")} className="w-full rounded-lg border border-slate-300 px-3 py-2" />
      </label>

      <label className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-ink">
        <input type="checkbox" checked={settings.allowGuestCheckout} onChange={setField("allowGuestCheckout")} className="accent-brand" />
        Allow guest checkout
      </label>

      <div className="md:col-span-2">
        <button className="rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white">Save Settings</button>
      </div>
    </form>
  );
}

export default AdminSettingsPage;
