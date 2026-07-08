import { createServiceClient } from '@/lib/supabase/server';

export type Coupon = {
  id: string;
  code: string;
  discount_type: 'percent' | 'fixed' | 'free_course';
  discount_value: number;
  applies_to: string | null;
  course_id: string | null;
  max_uses: number | null;
  used_count: number;
  expires_at: string | null;
  is_active: boolean;
  description: string | null;
};

export type CouponError =
  | 'not_found'
  | 'inactive'
  | 'expired'
  | 'exhausted'
  | 'already_redeemed';

/**
 * Look up a coupon by its code and apply the common validity checks. Returns
 * either { ok: true, coupon } or { ok: false, reason } — the reason is a
 * machine-readable enum so callers can craft their own copy without leaking
 * internals (e.g. the redemption page ALWAYS shows the same generic "invalid
 * code" message so a visitor can't tell exhausted-from-typo).
 *
 * `userId` is optional — if passed, we also check the per-user cap by looking
 * for an existing redemption row.
 */
export async function validateCouponCode(
  rawCode: string,
  userId?: string | null
): Promise<
  | { ok: true; coupon: Coupon }
  | { ok: false; reason: CouponError }
> {
  const code = rawCode.trim().toUpperCase();
  if (!code || !/^[A-Z0-9_-]{4,20}$/.test(code)) {
    return { ok: false, reason: 'not_found' };
  }

  const service = createServiceClient();
  const { data } = await service
    .from('coupons')
    .select(
      'id, code, discount_type, discount_value, applies_to, course_id, max_uses, used_count, expires_at, is_active, description'
    )
    .eq('code', code)
    .maybeSingle();

  if (!data) return { ok: false, reason: 'not_found' };
  if (!data.is_active) return { ok: false, reason: 'inactive' };
  if (data.expires_at && new Date(data.expires_at) < new Date()) {
    return { ok: false, reason: 'expired' };
  }
  if (data.max_uses != null && data.used_count >= data.max_uses) {
    return { ok: false, reason: 'exhausted' };
  }

  if (userId) {
    const { data: existing } = await service
      .from('coupon_redemptions')
      .select('id')
      .eq('coupon_id', data.id)
      .eq('user_id', userId)
      .maybeSingle();
    if (existing) return { ok: false, reason: 'already_redeemed' };
  }

  return { ok: true, coupon: data as Coupon };
}
