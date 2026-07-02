// A heart toggle that saves/removes a product from the wishlist. Client
// Component: it optimistically flips its own label, then calls the
// toggleWishlist server action (which revalidates the real state).

"use client";

import { useState, useTransition } from "react";
import { toggleWishlist } from "@/app/cart/actions";

export default function WishlistButton({
  productId,
  initialWishlisted,
  size = "full",
}: {
  productId: string;
  initialWishlisted: boolean;
  size?: "full" | "compact";
}) {
  const [wishlisted, setWishlisted] = useState(initialWishlisted);
  const [isPending, startTransition] = useTransition();

  const handleClick = () => {
    // Optimistic flip; the server action reconciles the true state.
    setWishlisted((prev) => !prev);
    startTransition(async () => {
      await toggleWishlist(productId);
    });
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      aria-pressed={wishlisted}
      className={`inline-flex w-full items-center justify-center gap-2 rounded-lg border font-semibold transition disabled:opacity-70 ${
        wishlisted
          ? "border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100"
          : "border-slate-200 text-slate-700 hover:bg-slate-50"
      } ${size === "compact" ? "px-3 py-2 text-xs" : "px-4 py-3 text-sm"}`}
    >
      <HeartIcon filled={wishlisted} className={size === "compact" ? "h-4 w-4" : "h-5 w-5"} />
      {wishlisted ? "Saved" : "Save"}
    </button>
  );
}

function HeartIcon({ filled, className }: { filled: boolean; className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z" />
    </svg>
  );
}
