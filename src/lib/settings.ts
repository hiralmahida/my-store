// Store settings: a single row holding basic store details and the storefront
// promo banner. Read from the storefront (promo banner, footer) and the admin
// Settings page; written only from the admin (see app/admin/actions.ts).

import type { StoreSetting } from "@/app/generated/prisma/client";
import { prisma } from "@/src/lib/prisma";
import { withDbRetry } from "@/src/lib/db";

// The fixed primary key for the singleton settings row (matches the schema
// default), so there is always exactly one row.
export const SETTINGS_ID = "singleton";

/** A Postgres/Prisma unique-constraint violation (duplicate key). */
function isUniqueConstraintError(error: unknown): boolean {
  return (error as { code?: unknown } | null)?.code === "P2002";
}

/**
 * The store settings, creating the singleton row on first access so callers
 * never have to handle a missing row.
 *
 * Race-safe by design: `upsert` is a SELECT-then-INSERT (not an atomic
 * `ON CONFLICT`), so on a fresh DB concurrent RSC renders would all miss and
 * then collide on the unique `id` (P2002). Instead we read first, and if the
 * row is missing we try to create it while tolerating a concurrent creator —
 * a P2002 just means someone else won the race, so we re-read their row.
 * (The seed also inserts this row, so the create path normally never runs.)
 */
export async function getStoreSettings(): Promise<StoreSetting> {
  const existing = await withDbRetry(() =>
    prisma.storeSetting.findUnique({ where: { id: SETTINGS_ID } })
  );
  if (existing) return existing;

  try {
    return await withDbRetry(() =>
      prisma.storeSetting.create({ data: { id: SETTINGS_ID } })
    );
  } catch (error) {
    // Another request created it between our read and create — re-read it.
    if (isUniqueConstraintError(error)) {
      const row = await withDbRetry(() =>
        prisma.storeSetting.findUnique({ where: { id: SETTINGS_ID } })
      );
      if (row) return row;
    }
    throw error;
  }
}
