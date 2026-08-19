import { createServiceClient } from '@/lib/supabase/server';

/**
 * Account deletion.
 *
 * Required by App Store guideline 5.1.1(v): an app that lets people
 * create an account must let them delete it from inside the app — a
 * "email us to delete" link is an explicit rejection reason. The web
 * gets the same control so the two surfaces agree.
 *
 * ## What goes and what stays
 *
 * Deleting the `auth.users` row cascades to `profiles`, and from there
 * to community posts, comments, likes, and the XP ledger — all of that
 * is FK'd `ON DELETE CASCADE`. Learning records (progress, enrolments,
 * certificates) carry no FK, so they're removed explicitly here.
 *
 * `payments`, `subscriptions`, and `refunds` are deliberately KEPT.
 * They're financial records with retention obligations, and they hold
 * no personal data — only a `user_id` UUID that now points at nothing,
 * which is exactly the anonymised state we want. Apple's own guidance
 * allows retaining what law requires.
 *
 * ## Ordering
 *
 * The auth row goes LAST. If an intermediate delete fails we've removed
 * some learning data but the account still exists and the user can
 * retry — the reverse order would leave an orphaned, unreachable
 * profile that nobody can clean up from the UI.
 */

export type DeletionResult =
  | { ok: true }
  | { ok: false; error: string };

export async function deleteUserAccount(userId: string): Promise<DeletionResult> {
  if (!userId) return { ok: false, error: 'مستخدم غير معروف.' };

  const service = createServiceClient();

  // Refuse to delete an admin from a self-service endpoint — losing the
  // only admin account to a mis-tap is unrecoverable.
  const { data: profile } = await service
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .maybeSingle();

  if (profile?.role === 'admin' || profile?.role === 'moderator') {
    return {
      ok: false,
      error: 'حسابات الإدارة مش بتتحذف من هنا. كلّم الدعم.',
    };
  }

  // Learning data — no FK to profiles, so it needs explicit removal.
  const wipes = await Promise.all([
    service.from('progress').delete().eq('user_id', userId),
    service.from('enrollments').delete().eq('user_id', userId),
    service.from('certificates').delete().eq('user_id', userId),
    service.from('coupon_redemptions').delete().eq('user_id', userId),
  ]);

  const failed = wipes.find((r) => r.error);
  if (failed?.error) {
    console.error('[account-deletion] wipe failed', failed.error.message);
    return { ok: false, error: 'مقدرناش نحذف الحساب دلوقتي. جرّب تاني.' };
  }

  // Cascades to profiles → community content + XP.
  const { error } = await service.auth.admin.deleteUser(userId);
  if (error) {
    console.error('[account-deletion] auth delete failed', error.message);
    return { ok: false, error: 'مقدرناش نحذف الحساب دلوقتي. جرّب تاني.' };
  }

  return { ok: true };
}

/**
 * What the user is told before they confirm. Kept here so the app and
 * the web can't describe the same irreversible action differently.
 */
export const DELETION_WARNING_AR = [
  'هيتشال حسابك وبياناتك الشخصية نهائياً.',
  'هيتشال تقدّمك في الكورسات وشهاداتك ونقاطك.',
  'هيتشال كل بوستاتك وتعليقاتك في الكوميونيتي.',
  'لو عندك اشتراك شغّال، مش هيترد فلوسه — الغِ الاشتراك الأول لو عايز.',
  'مفيش رجوع بعد التأكيد.',
];
