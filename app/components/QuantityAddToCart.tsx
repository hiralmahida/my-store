// Quantity stepper + Add to Cart for the product detail page.
//
// Lets the customer choose how many to add (clamped to available stock) and
// passes that quantity to the addToCart server action.

"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { addToCart } from "@/app/cart/actions";

export default function QuantityAddToCart({
  productId,
  stock,
}: {
  productId: string;
  stock: number;
}) {
  const [qty, setQty] = useState(1);
  const [pending, startTransition] = useTransition();
  const [added, setAdded] = useState(0); // quantity last added (0 = none)

  if (stock <= 0) {
    return (
      <button
        type="button"
        disabled
        className="w-full cursor-not-allowed rounded-lg bg-slate-200 px-4 py-2.5 text-center text-sm font-semibold text-slate-500"
      >
        Out of stock
      </button>
    );
  }

  const setClamped = (n: number) => setQty(Math.min(stock, Math.max(1, n)));

  const handleAdd = () => {
    startTransition(async () => {
      await addToCart(productId, qty);
      setAdded(qty);
    });
  };

  const stepBtn =
    "flex h-10 w-10 items-center justify-center text-lg text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-300";

  return (
    <div>
      <div className="flex items-center gap-3">
        <div className="inline-flex items-center rounded-lg border border-slate-200">
          <button
            type="button"
            onClick={() => setClamped(qty - 1)}
            disabled={qty <= 1}
            aria-label="Decrease quantity"
            className={stepBtn}
          >
            −
          </button>
          <span className="w-10 text-center text-sm font-medium text-slate-900" aria-live="polite">
            {qty}
          </span>
          <button
            type="button"
            onClick={() => setClamped(qty + 1)}
            disabled={qty >= stock}
            aria-label="Increase quantity"
            className={stepBtn}
          >
            +
          </button>
        </div>

        <button
          type="button"
          onClick={handleAdd}
          disabled={pending}
          className="flex-1 rounded-lg bg-blue-600 px-4 py-2.5 text-center text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-70"
        >
          {pending ? "Adding…" : "Add to Cart"}
        </button>
      </div>

      {stock <= 5 && (
        <p className="mt-2 text-xs font-medium text-amber-600">Only {stock} left in stock</p>
      )}

      {added > 0 && (
        <p role="status" className="mt-2 text-sm text-slate-500">
          ✓ Added {added} to cart.{" "}
          <Link href="/cart" className="font-medium text-blue-600 hover:underline">
            View cart
          </Link>
        </p>
      )}
    </div>
  );
}
