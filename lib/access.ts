import { createServiceClient } from '@/lib/supabase/server';

export type SubscriptionRow = {
  id: string;
  plan: 'monthly' | 'yearly';
  status: 'active' | 'cancelled' | 'expired' | 'paused' | 'trialing';
  current_period_end: string;
  cancelled_at: string | null;
  stripe_subscription_id: string | null;
  stripe_customer_id: string | null;
};

/**
 * Active = status 'active' or 'trialing' AND current_period_end in the future.
 * Mirrors the SQL `user_has_active_subscription` helper so we can use it in
 * Server Components without an extra round trip.
 */
export async function getActiveSubscription(userId: string): Promise<SubscriptionRow | null> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from('subscriptions')
    .select(
      'id, plan, status, current_period_end, cancelled_at, stripe_subscription_id, stripe_customer_id'
    )
    .eq('user_id', userId)
    .in('status', ['active', 'trialing'])
    .gt('current_period_end', new Date().toISOString())
    .order('current_period_end', { ascending: false })
    .limit(1)
    .maybeSingle();

  return (data as SubscriptionRow | null) ?? null;
}

export async function hasActiveSubscription(userId: string | null | undefined): Promise<boolean> {
  if (!userId) return false;
  const sub = await getActiveSubscription(userId);
  return !!sub;
}
