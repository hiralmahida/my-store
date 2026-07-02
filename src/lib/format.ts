// Small formatting helpers shared across the UI.

// Prisma stores `price` as a Decimal, which arrives in JS as a Decimal object
// (or string/number). We accept all of those and render a clean QAR amount,
// e.g. 3499 -> "QAR 3,499.00".
export function formatQAR(amount: number | string | { toString(): string }): string {
  const value = Number(amount.toString());
  return `QAR ${value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
