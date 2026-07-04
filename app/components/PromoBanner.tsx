// Storefront promo banner. Renders a thin bar at the very top of the store when
// the admin has enabled it in Settings (promoActive + promoText). Server
// component — reads the singleton store settings.

import { getStoreSettings } from "@/src/lib/settings";

export default async function PromoBanner() {
  const settings = await getStoreSettings();
  const text = settings.promoText.trim();
  if (!settings.promoActive || !text) return null;

  return (
    <div className="bg-slate-900 px-4 py-2 text-center text-sm font-medium text-white">
      {text}
    </div>
  );
}
