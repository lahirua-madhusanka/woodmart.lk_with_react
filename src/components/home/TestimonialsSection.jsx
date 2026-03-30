import { Star } from "lucide-react";

function TestimonialsSection({ testimonials = [] }) {
  return (
    <section className="container-pad py-10">
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-brand">Testimonials</p>
        <h2 className="font-display text-3xl font-bold text-ink">What customers are saying</h2>
      </div>

      {testimonials.length ? (
        <div className="grid gap-4 md:grid-cols-2">
          {testimonials.map((item) => (
            <article key={item.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm leading-relaxed text-muted">"{item.quote}"</p>

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <p className="text-sm font-semibold text-ink">{item.name}</p>
                {item.productName ? (
                  <span className="text-xs text-muted">on {item.productName}</span>
                ) : null}
                {item.rating > 0 ? (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-500">
                    <Star size={12} fill="currentColor" />
                    {item.rating.toFixed(1)}
                  </span>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-sm text-muted">
          No customer reviews yet. Be the first to share your feedback after a purchase.
        </div>
      )}
    </section>
  );
}

export default TestimonialsSection;
