// Store settings: a single row holding basic store details and the storefront
// promo banner. Read from the storefront (promo banner, footer) and the admin
// Settings page; written only from the admin (see app/admin/actions.ts).

import type { StoreSetting } from "@/app/generated/prisma/client";
import { prisma } from "@/src/lib/prisma";
import { withDbRetry } from "@/src/lib/db";

// The fixed primary key for the singleton settings row (matches the schema
// default), so there is always exactly one row.
export const SETTINGS_ID = "singleton";

/**
 * The store settings, creating the singleton row on first access so callers
 * never have to handle a missing row.
 */
export async function getStoreSettings(): Promise<StoreSetting> {
  return withDbRetry(() =>
    prisma.storeSetting.upsert({
      where: { id: SETTINGS_ID },
      create: { id: SETTINGS_ID },
      update: {},
    })
  );
}
