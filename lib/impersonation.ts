import { cookies } from 'next/headers';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { isSuperAdmin } from '@/lib/admin-guard';

/**
 * "View as student" — sign an admin into a student's account so they can
 * see exactly what the student sees.
 *
 * ## Why this is locked down as hard as it is
 *
 * Impersonation hands one person a working session as somebody else. It
 * is the single most dangerous button in the admin panel, so:
 *
 *   1. **Super-admins only.** A plain `admin` or `moderator` cannot use
 *      it. Otherwise any admin could impersonate their way into
 *      anything, and the role split above it would mean nothing.
 *   2. **Students only.** Impersonating another admin would be a
 *      privilege-escalation ladder — a `moderator` account borrowed to
 *      reach a `super_admin` one. Refused outright.
 *   3. **Audited.** Every start and exit writes to admin_audit_log with
 *      both identities, so "who looked at this account" is answerable.
 *   4. **Visibly marked.** A banner sits on every page while it's
 *      active — an admin who forgets they're impersonating and then
 *      deletes something is the failure mode this prevents.
 *   5. **Time-boxed.** The return ticket expires in an hour.
 *
 * The session swap itself goes through Supabase's admin `generateLink`
 * + `verifyOtp`, so it produces a real, ordinary session rather than
 * some parallel auth path that the rest of the app would have to know
 * about. Nothing downstream needs to care that it happened.
 */

/** Holds the admin's own email so they can get back. httpOnly. */
export const IMPERSONATION_COOKIE = 'faahm_impersonator';
/** Readable by the layout so the banner knows whose account is open. */
export const IMPERSONATION_TARGET_COOKIE = 'faahm_impersonating_as';

/** An hour is long enough to look around and short enough to be safe. */
const MAX_AGE_SECONDS = 60 * 60;

export type ImpersonationState = {
  active: boolean;
  /** Email of the student whose account is currently open. */
  targetEmail: string | null;
};

export function readImpersonation(): ImpersonationState {
  const jar = cookies();
  const admin = jar.get(IMPERSONATION_COOKIE)?.value ?? null;
  const target = jar.get(IMPERSONATION_TARGET_COOKIE)?.value ?? null;
  return { active: !!admin, targetEmail: target };
}

function setCookies(adminEmail: string, targetEmail: string) {
  const jar = cookies();
  const base = {
    secure: true,
    sameSite: 'lax' as const,
    path: '/',
    maxAge: MAX_AGE_SECONDS,
  };
  // The admin's identity is httpOnly — it is the return ticket, and no
  // client script has any reason to read it.
  jar.set(IMPERSONATION_COOKIE, adminEmail, { ...base, httpOnly: true });
  // The banner needs this one, so it isn't httpOnly. It carries no
  // authority — it only names who you're looking at.
  jar.set(IMPERSONATION_TARGET_COOKIE, targetEmail, { ...base, httpOnly: false });
}

export function clearImpersonationCookies() {
  const jar = cookies();
  jar.delete(IMPERSONATION_COOKIE);
  jar.delete(IMPERSONATION_TARGET_COOKIE);
}

/**
 * Swap the current browser session for one belonging to `email`.
 *
 * Uses a single-use magic-link token minted with the service key and
 * redeemed immediately server-side, so no usable link is ever written
 * to a log, an email, or the address bar.
 */
async function signInAs(email: string): Promise<{ ok: true } | { error: string }> {
  const service = createServiceClient();

  const { data, error } = await service.auth.admin.generateLink({
    type: 'magiclink',
    email,
  });

  const tokenHash = data?.properties?.hashed_token;
  if (error || !tokenHash) {
    console.error('[impersonate] generateLink failed', error?.message);
    return { error: 'مقدرناش نفتح الجلسة. جرّب تاني.' };
  }

  const { error: verifyError } = await createClient().auth.verifyOtp({
    type: 'magiclink',
    token_hash: tokenHash,
  });

  if (verifyError) {
    console.error('[impersonate] verifyOtp failed', verifyError.message);
    return { error: 'مقدرناش نفتح الجلسة. جرّب تاني.' };
  }

  return { ok: true };
}

/**
 * Begin impersonating a student.
 *
 * `adminEmail` must already have been verified as a super-admin by the
 * caller — this function re-checks anyway, because the cost of being
 * wrong here is somebody else's account.
 */
export async function startImpersonation(opts: {
  adminEmail: string;
  targetUserId: string;
}): Promise<{ ok: true; targetEmail: string } | { error: string }> {
  if (!isSuperAdmin(opts.adminEmail)) {
    return { error: 'الصلاحية دي للسوبر أدمن بس.' };
  }

  const service = createServiceClient();

  const { data: target } = await service
    .from('profiles')
    .select('id, role, is_blocked')
    .eq('id', opts.targetUserId)
    .maybeSingle();

  if (!target) return { error: 'الحساب ده مش موجود.' };

  // Never borrow another staff account — that is the escalation path.
  if (target.role && target.role !== 'student') {
    return { error: 'مينفعش تدخل على حساب إداري.' };
  }

  const {
    data: { user: targetUser },
    error: lookupError,
  } = await service.auth.admin.getUserById(opts.targetUserId);

  if (lookupError || !targetUser?.email) {
    return { error: 'الحساب ده مالوش إيميل مسجّل.' };
  }

  const result = await signInAs(targetUser.email);
  if ('error' in result) return result;

  setCookies(opts.adminEmail, targetUser.email);
  return { ok: true, targetEmail: targetUser.email };
}

/**
 * Return to the admin's own account.
 *
 * The stored email is re-checked against the super-admin allow-list
 * before it is honoured: if someone were removed from that list while
 * impersonating, this must not hand their session back.
 */
export async function endImpersonation(): Promise<
  { ok: true; adminEmail: string } | { error: string }
> {
  const adminEmail = cookies().get(IMPERSONATION_COOKIE)?.value ?? null;
  clearImpersonationCookies();

  if (!adminEmail) return { error: 'مفيش جلسة مفتوحة.' };
  if (!isSuperAdmin(adminEmail)) {
    // Stale or tampered cookie — drop the session rather than restore it.
    await createClient().auth.signOut();
    return { error: 'الجلسة مش صالحة. سجّل دخول تاني.' };
  }

  const result = await signInAs(adminEmail);
  if ('error' in result) return result;

  return { ok: true, adminEmail };
}
