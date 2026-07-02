// A responsive grid of product cards, with a friendly empty state.
// Presentational Server Component.

import ProductCard from "./ProductCard";
import type { ProductCardData } from "@/src/lib/products";

export default function ProductGrid({
  products,
  emptyMessage = "No products match your filters.",
}: {
  products: ProductCardData[];
  emptyMessage?: string;
}) {
  if (products.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
        <p className="font-medium text-slate-900">{emptyMessage}</p>
        <p className="mt-1 text-sm text-slate-500">
          Try removing a filter or widening your price range.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
