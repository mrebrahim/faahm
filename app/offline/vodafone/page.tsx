import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

/**
 * Legacy route — Vodafone Cash now lives on the combined Egyptian
 * payments page (/offline/egp) alongside InstaPay, and Barq moved to
 * its own /offline/barq page. This stub keeps old links working by
 * defaulting them to the Egyptian page.
 */
export default function LegacyVodafoneRedirect({
  searchParams,
}: {
  searchParams: { plan?: string };
}) {
  const plan = searchParams.plan ?? 'monthly';
  redirect(`/offline/egp?plan=${encodeURIComponent(plan)}`);
}
