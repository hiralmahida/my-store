// The "Add to Cart" button. A Client Component: it calls the addToCart server
// action inside a transition and shows inline feedback. The cart itself is
// DB-backed (see app/cart/actions.ts); this just triggers the mutation.

"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { addToCart } from "@/app/cart/actions";
import { useToast } from "@/app/components/ToastProvider";

export default function AddToCartButton({
  productId,
  disabled = false,
  size = "full",
}: {
  productId: string;
  disabled?: boolean;
  size?: "full" | "compact";
}) {
  const [isPending, startTransition] = useTransition();
  const [added, setAdded] = useState(false);
  const toast = useToast();

  if (disabled) {
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

  const handleClick = () => {
    startTransition(async () => {
      await addToCart(productId);
      setAdded(true);
      toast("Added to cart 🛒");
    });
  };

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className={`w-full rounded-lg bg-blue-600 px-4 text-center font-semibold text-white transition hover:bg-blue-700 disabled:opacity-70 ${
          size === "compact" ? "py-2 text-xs" : "py-3 text-sm"
        }`}
      >
        {isPending ? "Adding…" : added ? "Add another" : "Add to Cart"}
      </button>
      {added && (
        <p role="status" className="mt-2 text-center text-sm text-slate-500">
          ✓ Added.{" "}
          <Link href="/cart" className="font-medium text-blue-600 hover:underline">
            View cart
          </Link>
        </p>
      )}
    </div>
  );
}
