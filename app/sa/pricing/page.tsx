import { redirect } from 'next/navigation';
import { setRegionCookie } from '@/lib/region';

export const metadata = {
  title: 'الأسعار — فاهم! السعودية',
  description:
    'اشتراك واحد بسيط بيفتحلك كل كورسات فاهم — 39 ر.س/شهر أو 149 ر.س/سنة.',
};

export const dynamic = 'force-dynamic';

/**
 * Saudi-funnel entry point. Stamps the sticky region cookie so every
 * subsequent /pricing → /checkout → /api/checkout call stays in SAR
 * (and grabs the SAR Stripe price IDs), then forwards to the main
 * pricing page with ?region=sa for the explicit, in-URL signal that
 * downstream pages rely on.
 *
 * Ads / Saudi-market referrals should link straight here so the visitor
 * sees riyals from the first paint, not after a flicker.
 */
export default async function SaudiPricingEntry() {
  setRegionCookie('sa');
  redirect('/pricing?region=sa');
}
