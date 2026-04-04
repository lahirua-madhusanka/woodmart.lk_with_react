function BrandLogosSection() {
  const assurances = [
    {
      title: "Island-wide delivery",
      description: "Fast delivery in 3-7 working days with secure packaging.",
    },
    {
      title: "Quality-first materials",
      description: "Each piece is inspected before dispatch for finish and durability.",
    },
    {
      title: "Secure checkout",
      description: "Encrypted payment flow and verified order confirmations.",
    },
    {
      title: "Human support",
      description: "Real support team available for delivery and product guidance.",
    },
  ];

  const credibilityStats = [
    { label: "Orders Delivered", value: "10,000+" },
    { label: "Customer Rating", value: "4.8 / 5" },
    { label: "Repeat Buyers", value: "62%" },
    { label: "Support Response", value: "< 24 hrs" },
  ];

  return (
    <section className="container-pad py-8">
      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-6 sm:px-6">
        <p className="text-center text-xs font-semibold uppercase tracking-widest text-muted">
          Shop with confidence
        </p>
        <h3 className="mt-2 text-center font-display text-2xl font-bold text-slate-900">
          Built for trust from checkout to delivery
        </h3>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {assurances.map((item) => (
            <article key={item.title} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <h4 className="text-sm font-semibold text-slate-900">{item.title}</h4>
              <p className="mt-2 text-xs leading-relaxed text-slate-600">{item.description}</p>
            </article>
          ))}
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {credibilityStats.map((item) => (
            <div key={item.label} className="rounded-lg bg-brand-light px-3 py-3 text-center">
              <p className="text-lg font-bold text-brand-dark">{item.value}</p>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                {item.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default BrandLogosSection;
