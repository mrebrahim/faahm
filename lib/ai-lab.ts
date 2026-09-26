import { createServiceClient } from '@/lib/supabase/server';
import {
  AI_LAB,
  AI_LAB_FOUNDING,
  AI_LAB_FOUNDING_SEATS,
  AI_LAB_MONTHS,
  type PurchasableProduct,
} from '@/lib/catalog';

/**
 * AI Lab membership.
 *
 * AI Lab is the programme wrapped around the three courses: a 12-week
 * cohort with a weekly live workshop, project review and a certificate.
 * It is sold beside the one-off courses, not above them — buying a
 * course does not include it, and holding it does not hand you the
 * courses. The two are independent on purpose, which is why membership
 * lives in its own table rather than as an `enrollments` row.
 *
 * It is time-boxed rather than recurring: one payment, a year of
 * access, nothing to cancel. That is what lets it exist without
 * dragging the retired subscription machinery back in.
 */

export type AiLabMembership = {
  tier: 'founding' | 'annual' | 'manual';
  startedAt: string;
  expiresAt: string;
  daysLeft: number;
};

export async function getAiLabMembership(
  userId: string | null | undefined
): Promise<AiLabMembership | null> {
  if (!userId) return null;

  const { data } = await createServiceClient()
    .from('ai_lab_members')
    .select('tier, started_at, expires_at')
    .eq('user_id', userId)
    .maybeSingle();

  if (!data) return null;

  const expires = new Date(data.expires_at);
  if (expires.getTime() <= Date.now()) return null;

  return {
    tier: data.tier,
    startedAt: data.started_at,
    expiresAt: data.expires_at,
    daysLeft: Math.ceil((expires.getTime() - Date.now()) / 86_400_000),
  };
}

export async function hasAiLabAccess(
  userId: string | null | undefined
): Promise<boolean> {
  return (await getAiLabMembership(userId)) !== null;
}

/**
 * Founding seats sold so far, and how many are left.
 *
 * Counts every founding row ever written, INCLUDING expired ones — a
 * seat that was sold is spent. Counting only live memberships would
 * quietly re-open seats as they lapsed, and "the first 100" would stop
 * being true.
 */
export async function foundingSeats(): Promise<{
  taken: number;
  left: number;
  soldOut: boolean;
}> {
  const { count } = await createServiceClient()
    .from('ai_lab_members')
    .select('id', { count: 'exact', head: true })
    .eq('tier', 'founding');

  const taken = count ?? 0;
  const left = Math.max(0, AI_LAB_FOUNDING_SEATS - taken);
  return { taken, left, soldOut: left === 0 };
}

/**
 * Which AI Lab product a visitor should be offered right now.
 * Falls back to the standing price once the founding seats are gone.
 */
export async function currentAiLabOffer(): Promise<{
  product: PurchasableProduct;
  seatsLeft: number | null;
}> {
  const seats = await foundingSeats();
  return seats.soldOut
    ? { product: AI_LAB, seatsLeft: null }
    : { product: AI_LAB_FOUNDING, seatsLeft: seats.left };
}

/**
 * Start or extend a membership.
 *
 * Renewal EXTENDS the existing row rather than inserting a second one,
 * so "is this person a member" stays a single lookup and a renewal
 * bought early doesn't throw away the time already paid for. The clock
 * runs from whichever is later: now, or the current expiry.
 */
export async function grantAiLabMembership(args: {
  userId: string;
  tier: 'founding' | 'annual' | 'manual';
  months?: number;
  grantedBy?: string | null;
  notes?: string | null;
}): Promise<{ ok: true; expiresAt: string } | { error: string }> {
  const service = createServiceClient();

  // A founding seat must not be handed out past the cap. Checked here,
  // server-side, rather than only being hidden in the UI.
  if (args.tier === 'founding') {
    const seats = await foundingSeats();
    if (seats.soldOut) {
      return { error: 'عضويات التأسيس خلصت.' };
    }
  }

  const { data: existing } = await service
    .from('ai_lab_members')
    .select('expires_at')
    .eq('user_id', args.userId)
    .maybeSingle();

  const from =
    existing && new Date(existing.expires_at).getTime() > Date.now()
      ? new Date(existing.expires_at)
      : new Date();

  const expires = new Date(from);
  expires.setMonth(expires.getMonth() + (args.months ?? AI_LAB_MONTHS));

  const { error } = await service.from('ai_lab_members').upsert(
    {
      user_id: args.userId,
      tier: args.tier,
      expires_at: expires.toISOString(),
      granted_by: args.grantedBy ?? null,
      notes: args.notes ?? null,
    },
    { onConflict: 'user_id' }
  );

  if (error) {
    console.error('[ai-lab] grant failed', error.message);
    return { error: 'مقدرناش نفعّل العضوية. جرّب تاني.' };
  }

  return { ok: true, expiresAt: expires.toISOString() };
}

/** Maps a catalogue product id onto the tier it sells. */
export function tierForProduct(
  productId: string
): 'founding' | 'annual' | null {
  if (productId === AI_LAB_FOUNDING.id) return 'founding';
  if (productId === AI_LAB.id) return 'annual';
  return null;
}


/**
 * Keep the membership in step with a Stripe subscription.
 *
 * The membership row is the single access check — `expires_at > now()`.
 * Rather than teaching that check about subscriptions, the subscription
 * simply pushes its period end into the row on every renewal webhook.
 * So a lapsed card stops access by itself on the right date, with no
 * cron and no second code path.
 *
 * Called for every AI Lab subscription event: created, updated, renewed
 * and cancelled. A cancellation is not special — Stripe keeps the
 * period end it already paid for, and access ends there.
 */
export async function syncMembershipFromSubscription(args: {
  userId: string;
  periodEnd: string;
  interval: 'month' | 'year';
  stripeSubscriptionId: string;
}): Promise<void> {
  const service = createServiceClient();

  const { error } = await service.from('ai_lab_members').upsert(
    {
      user_id: args.userId,
      tier: 'annual',
      expires_at: args.periodEnd,
      notes: `Stripe subscription ${args.stripeSubscriptionId} (${args.interval})`,
    },
    { onConflict: 'user_id' }
  );

  if (error) {
    // Loud: the customer is paying and this is what opens the door.
    console.error('[ai-lab] subscription sync FAILED', {
      userId: args.userId,
      subscription: args.stripeSubscriptionId,
      error: error.message,
    });
    return;
  }

  console.log(
    `[ai-lab] membership synced user=${args.userId} until=${args.periodEnd}`
  );
}
