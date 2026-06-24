import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

/**
 * Legacy route — InstaPay used to be its own page, but visitors now
 * see InstaPay + Vodafone Cash on the same combined Egyptian-payments
 * page (/offline/egp). This stub keeps old links working.
 */
export default function LegacyInstapayRedirect({
  searchParams,
}: {
  searchParams: { plan?: string };
}) {
  const plan = searchParams.plan ?? 'monthly';
  redirect(`/offline/egp?plan=${encodeURIComponent(plan)}`);
}
