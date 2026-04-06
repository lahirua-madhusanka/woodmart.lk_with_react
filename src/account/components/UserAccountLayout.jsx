function UserAccountLayout({ sidebar, children }) {
  return (
    <section className="container-pad py-10">
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-brand">My Account</p>
        <h1 className="font-display text-3xl font-bold text-ink">Account Center</h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <aside className="h-fit rounded-xl border border-slate-200 bg-white p-4 shadow-sm">{sidebar}</aside>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">{children}</div>
      </div>
    </section>
  );
}

export default UserAccountLayout;
