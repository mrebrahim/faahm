'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { reconcileCheckoutSession } from '@/lib/billing';

const GUEST_EMAIL_COOKIE = 'guest_checkout_email';

type ClaimResult = { ok: false; error: string } | never;

/**
 * Finishes the guest-checkout handshake: the visitor has already paid,
 * the webhook (or reconcileCheckoutSession) has provisioned a Supabase
 * user from their email, and now they pick the password they want to
 * sign in with. We:
 *   1. Re-verify the Stripe session is actually paid (don't trust the
 *      client to honestly self-identify).
 *   2. Resolve the user id off the Stripe session's email.
 *   3. Set the password on that user via the admin API.
 *   4. Sign them in with the new password so the session cookie is set.
 *   5. Forward them to the courses page so they start using the thing
 *      they just paid for.
 */
export async function claimAccount(formData: FormData): Promise<ClaimResult> {
  const sessionId = (formData.get('session_id') as string | null)?.trim() ?? '';
  const password = (formData.get('password') as string | null) ?? '';

  if (!sessionId) {
    return { ok: false, error: 'لينك الدفع مش صالح. ارجع لصفحة الأسعار وحاول تاني.' };
  }
  if (password.length < 8) {
    return { ok: false, error: 'كلمة السر لازم تكون 8 حروف على الأقل.' };
  }

  // 1 + 2. Pull the session from Stripe and resolve the user it belongs
  // to. reconcileCheckoutSession is idempotent — running it again is a
  // no-op if the webhook already wrote the subscription row.
  const reconciled = await reconcileCheckoutSession(sessionId);
  if (!reconciled.ok || !reconciled.paid) {
    return { ok: false, error: 'مش لاقي دفعة مكتملة. لو دفعت دلوقتي استنى دقيقة وحاول تاني.' };
  }
  if (!reconciled.userId || !reconciled.email) {
    return { ok: false, error: 'مش قادر نلاقي حسابك. كلّمنا على واتساب.' };
  }

  // 3. Set the password on the admin-provisioned user.
  const service = createServiceClient();
  const { error: updateErr } = await service.auth.admin.updateUserById(
    reconciled.userId,
    { password }
  );
  if (updateErr) {
    console.error('[claim] updateUserById failed', updateErr);
    return { ok: false, error: 'مشكلة في حفظ كلمة السر. حاول تاني.' };
  }

  // 4. Sign in with the new password so the auth cookie is set on the
  // response. createClient writes to the cookie store for us.
  const supabase = createClient();
  const { error: signInErr } = await supabase.auth.signInWithPassword({
    email: reconciled.email,
    password,
  });
  if (signInErr) {
    console.error('[claim] signInWithPassword failed', signInErr);
    return { ok: false, error: 'تم حفظ كلمة السر بس فيه مشكلة في الدخول. جرّب صفحة الدخول.' };
  }

  // The guest cookie has done its job — clear it so the next checkout
  // from this device starts fresh.
  cookies().delete(GUEST_EMAIL_COOKIE);

  // 5. Land them on the courses page. They paid, they have an account,
  // they're signed in — get them watching.
  redirect('/courses');
}

/**
 * PayPal hosted buttons / offline channels (InstaPay, Vodafone) don't
 * give us a Stripe session_id, so claimAccount() above can't be used —
 * there's nothing to re-verify against. Instead we trust the guest
 * email cookie that /checkout wrote: server-side, it never left our
 * surface, so we can look it up, set a password, and sign the visitor
 * in. The actual subscription will be activated by the admin after they
 * see the WhatsApp screenshot — this just gives the visitor an account
 * to land in.
 */
export async function claimGuestAccountByCookie(
  formData: FormData
): Promise<ClaimResult> {
  const password = (formData.get('password') as string | null) ?? '';
  if (password.length < 8) {
    return { ok: false, error: 'كلمة السر لازم تكون 8 حروف على الأقل.' };
  }

  const email = cookies().get(GUEST_EMAIL_COOKIE)?.value?.toLowerCase() || null;
  if (!email) {
    return { ok: false, error: 'لينك التفعيل انتهت صلاحيته. ارجع لصفحة الأسعار.' };
  }

  const service = createServiceClient();
  // ensureUserForEmail (called server-side on the page render) already
  // provisioned the user. Look them up by email and set the password.
  const { data: list } = await service.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  });
  const match = list?.users.find(
    (u) => u.email?.toLowerCase() === email
  );
  if (!match?.id) {
    return { ok: false, error: 'مش لاقي حسابك. كلّمنا على واتساب.' };
  }

  const { error: updateErr } = await service.auth.admin.updateUserById(match.id, {
    password,
  });
  if (updateErr) {
    console.error('[claim-cookie] updateUserById failed', updateErr);
    return { ok: false, error: 'مشكلة في حفظ كلمة السر. حاول تاني.' };
  }

  const supabase = createClient();
  const { error: signInErr } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (signInErr) {
    console.error('[claim-cookie] signInWithPassword failed', signInErr);
    return { ok: false, error: 'تم حفظ كلمة السر بس فيه مشكلة في الدخول. جرّب صفحة الدخول.' };
  }

  cookies().delete(GUEST_EMAIL_COOKIE);
  redirect('/dashboard');
}
