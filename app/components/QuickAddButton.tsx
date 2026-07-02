// A compact "add to cart" button that floats in the corner of a product card.
//
// Adds the product (quantity 1) via the addToCart server action without leaving
// the grid, and briefly flips to a check mark to confirm. The header cart badge
// also updates (the action revalidates the layout). Rendered as a sibling of
// the card's link (not inside it) so clicking it never triggers navigation.

"use client";

import { useEffect, useState, useTransition } from "react";
import { addToCart } from "@/app/cart/actions";

export default function QuickAddButton({
  productId,
  disabled = false,
}: {
  productId: string;
  disabled?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [added, setAdded] = useState(false);

  // Reset the confirmation check after a moment.
  useEffect(() => {
    if (!added) return;
    const t = setTimeout(() => setAdded(false), 1500);
    return () => clearTimeout(t);
  }, [added]);

  if (disabled) {
    return (
      <span
        className="absolute bottom-3 left-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-300"
        title="Out of stock"
        aria-label="Out of stock"
      >
        <CartIcon className="h-4 w-4" />
      </span>
    );
  }

  const handleClick = (e: React.MouseEvent) => {
    // The card is a link; keep this click local to the button.
    e.preventDefault();
    e.stopPropagation();
    startTransition(async () => {
      await addToCart(productId);
      setAdded(true);
    });
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      aria-label="Add to cart"
      title="Add to cart"
      className={`absolute bottom-3 left-3 z-10 flex h-9 w-9 items-center justify-center rounded-full shadow-sm transition disabled:opacity-70 ${
        added ? "bg-green-600 text-white" : "bg-blue-600 text-white hover:bg-blue-700"
      }`}
    >
      {added ? <CheckIcon className="h-4 w-4" /> : <CartIcon className="h-4 w-4" />}
    </button>
  );
}

function CartIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="9" cy="21" r="1" />
      <circle cx="20" cy="21" r="1" />
      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}
