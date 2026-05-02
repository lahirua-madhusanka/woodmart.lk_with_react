import ProductCard from "./ProductCard";

function ProductGrid({ products, emptyMessage = "No products found with the current filters." }) {
  if (!products.length) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-muted">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:gap-6 grid-cols-2 md:grid-cols-2 lg:grid-cols-4">
      {products.map((product) => (
        <ProductCard key={product._id || product.id} product={product} />
      ))}
    </div>
  );
}

export default ProductGrid;