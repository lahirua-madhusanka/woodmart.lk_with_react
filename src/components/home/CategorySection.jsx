import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

function CategorySection({ categories }) {
  return (
    <section className="container-pad py-10">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-brand">
            Featured Categories
          </p>
          <h2 className="font-display text-3xl font-bold text-ink">Shop by lifestyle</h2>
        </div>
        <Link to="/shop" className="hidden items-center gap-1 text-sm font-semibold text-brand md:inline-flex">
          Explore All <ArrowRight size={15} />
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {categories.map((category, index) => (
          <motion.article
            key={category.id}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.06 }}
            className="group overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
          >
            <div className="overflow-hidden">
              {category.image ? (
                <img
                  src={category.image}
                  alt={category.name}
                  loading="lazy"
                  decoding="async"
                  className="h-44 w-full object-cover transition duration-500 group-hover:scale-105"
                />
              ) : (
                <div className="h-44 w-full bg-slate-100" />
              )}
            </div>
            <div className="p-4">
              <h3 className="text-lg font-semibold">{category.name}</h3>
              <p className="text-sm text-muted">
                {category.count || 0} {(category.count || 0) === 1 ? "product" : "products"}
              </p>
            </div>
          </motion.article>
        ))}
      </div>
    </section>
  );
}

export default CategorySection;