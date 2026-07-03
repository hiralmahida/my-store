// Compact star-rating display used on product cards and the detail page.

export default function RatingStars({
  rating,
  count,
  size = "sm",
}: {
  rating: number;
  count?: number;
  size?: "sm" | "md";
}) {
  const full = Math.round(rating);
  return (
    <span className="inline-flex items-center gap-1">
      <span className={size === "md" ? "text-base" : "text-xs"} aria-hidden="true">
        {[1, 2, 3, 4, 5].map((i) => (
          <span key={i} className={i <= full ? "text-amber-400" : "text-slate-300"}>
            ★
          </span>
        ))}
      </span>
      <span className={`${size === "md" ? "text-sm" : "text-xs"} text-slate-500`}>
        {rating.toFixed(1)}
        {count != null ? ` (${count})` : ""}
      </span>
    </span>
  );
}
