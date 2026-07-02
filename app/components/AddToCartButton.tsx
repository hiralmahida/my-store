// The product page's primary call-to-action.
//
// The cart itself is the next build phase, so rather than fake an "added to
// cart" flow, this button honestly tells the shopper the feature is coming.
// It's a real, functional Client Component (it reacts to clicks and gives
// feedback) — not a placeholder stub.

"use client";

import { useState } from "react";

export default function AddToCartButton({
  disabled = false,
}: {
  disabled?: boolean;
}) {
  const [clicked, setClicked] = useState(false);

  if (disabled) {
    return (
      <button
        type="button"
        disabled
        className="w-full cursor-not-allowed rounded-lg bg-slate-200 px-6 py-3 text-center text-sm font-semibold text-slate-500"
      >
        Out of stock
      </button>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setClicked(true)}
        className="w-full rounded-lg bg-blue-600 px-6 py-3 text-center text-sm font-semibold text-white transition hover:bg-blue-700"
      >
        Add to Cart
      </button>
      {clicked && (
        <p
          role="status"
          className="mt-2 text-center text-sm text-slate-500"
        >
          🛒 Cart &amp; checkout arrive in the next build phase.
        </p>
      )}
    </div>
  );
}
