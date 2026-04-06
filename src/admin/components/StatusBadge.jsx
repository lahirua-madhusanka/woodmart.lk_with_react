const colorMap = {
  active: "bg-emerald-100 text-emerald-700",
  inactive: "bg-slate-100 text-slate-700",
  pending: "bg-amber-100 text-amber-700",
  paid: "bg-emerald-100 text-emerald-700",
  failed: "bg-red-100 text-red-700",
  confirmed: "bg-sky-100 text-sky-700",
  created: "bg-slate-100 text-slate-700",
  processing: "bg-indigo-100 text-indigo-700",
  packed: "bg-violet-100 text-violet-700",
  shipped: "bg-cyan-100 text-cyan-700",
  out_for_delivery: "bg-blue-100 text-blue-700",
  delivered: "bg-green-100 text-green-700",
  cancelled: "bg-rose-100 text-rose-700",
  returned: "bg-orange-100 text-orange-700",
  expired: "bg-amber-100 text-amber-700",
  admin: "bg-brand-light text-brand-dark",
  user: "bg-slate-100 text-slate-700",
  low: "bg-red-100 text-red-700",
};

function StatusBadge({ value }) {
  const normalized = String(value || "").toLowerCase();
  const classes = colorMap[normalized] || "bg-slate-100 text-slate-700";

  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${classes}`}>
      {value}
    </span>
  );
}

export default StatusBadge;
