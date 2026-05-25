'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { auditLog } from '@/lib/admin-audit';

export async function login(formData: FormData) {
  const supabase = createClient();

  // Honeypot fields: real users never see/fill these. Any value means a
  // bot is auto-filling the form — drop the request and log it.
  // Field names must NOT match common autofill heuristics (no `username`,
  // `email`, `name`, etc.) or password managers will fill them on real
  // users and false-trigger this guard.
  const honeypotFax = (formData.get('fax_number') as string | null) || '';
  const honeypotAddr = (formData.get('address_line_2') as string | null) || '';
  if (honeypotFax || honeypotAddr) {
    void auditLog(
      { userId: null, userEmail: null, userRole: null },
      {
        action: 'auth.bot_detected',
        result: 'failure',
        metadata: { fields: { fax_number: !!honeypotFax, address_line_2: !!honeypotAddr } },
      }
    );
    // Pretend we accepted the form so bots don't learn anything.
    redirect('/login?error=' + encodeURIComponent('بيانات الدخول غير صحيحة'));
  }

  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const redirectTo = (formData.get('redirect') as string) || '/dashboard';

  if (!email || !password) {
    redirect('/login?error=' + encodeURIComponent('من فضلك أدخل البريد وكلمة السر'));
  }

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    // Record the failed attempt for anomaly review. Use email (not user_id,
    // which we don't have) so brute-force patterns by victim are visible.
    void auditLog(
      { userId: null, userEmail: email.toLowerCase(), userRole: null },
      {
        action: 'auth.login_failed',
        result: 'failure',
        errorMessage: error.message,
      }
    );
    redirect('/login?error=' + encodeURIComponent('بيانات الدخول غير صحيحة'));
  }

  // Successful login — note role so the audit log captures privilege level.
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const service = createServiceClient();
      const { data: profile } = await service
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
      void auditLog(
        { userId: user.id, userEmail: user.email ?? null, userRole: profile?.role ?? null },
        { action: 'auth.login_success' }
      );
    }
  } catch {
    // Best-effort logging; never block the redirect.
  }

  revalidatePath('/', 'layout');
  redirect(redirectTo);
}

export async function loginWithGoogle() {
  const supabase = createClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${appUrl}/auth/callback`,
    },
  });

  if (error) {
    redirect('/login?error=' + encodeURIComponent('فشل تسجيل الدخول عبر جوجل'));
  }

  if (data.url) {
    redirect(data.url);
  }
}

// ----- OTP (email code) login/signup ----------------------------------------

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type OtpOrigin = 'login' | 'signup';

function originBase(from: OtpOrigin): string {
  return from === 'signup' ? '/signup' : '/login';
}

function parseOrigin(value: FormDataEntryValue | null): OtpOrigin {
  return value === 'signup' ? 'signup' : 'login';
}

/**
 * Send a 6-digit OTP to the user's email. Supabase's default email
 * template includes both a magic link and `{{ .Token }}` — we only
 * need the token here. shouldCreateUser=true so this single endpoint
 * works for both signup and login (the user just verifies the code).
 *
 * For signup origin we forward `full_name` and `marketing_opt_in` via
 * `options.data` so they're persisted on the auth user the moment
 * Supabase creates it on first verifyOtp. The `handle_new_user`
 * trigger reads `raw_user_meta_data->>'full_name'` into `profiles`.
 *
 * On success we redirect back to the originating page with ?sent=1
 * so the form pivots to the code-entry step.
 */
export async function sendOtp(formData: FormData) {
  const email = String(formData.get('email') || '').trim().toLowerCase();
  const redirectTo =
    (formData.get('redirect') as string | null)?.trim() || '/dashboard';
  const from = parseOrigin(formData.get('from'));
  const fullName = String(formData.get('full_name') || '').trim();
  const marketingOptIn = formData.get('marketing_opt_in') === '1';

  const base = originBase(from);

  if (!email || !EMAIL_REGEX.test(email)) {
    redirect(`${base}?error=` + encodeURIComponent('من فضلك أدخل بريد إلكتروني صحيح.'));
  }

  const supabase = createClient();
  const userData: Record<string, unknown> = {};
  if (from === 'signup' && fullName) userData.full_name = fullName;
  if (from === 'signup') userData.marketing_opt_in = marketingOptIn;

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
      ...(Object.keys(userData).length ? { data: userData } : {}),
    },
  });

  if (error) {
    void auditLog(
      { userId: null, userEmail: email, userRole: null },
      {
        action: 'auth.otp_send_failed',
        result: 'failure',
        errorMessage: error.message,
      }
    );
    redirect(
      `${base}?error=` +
        encodeURIComponent('فشل إرسال الكود. حاول تاني خلال لحظات.')
    );
  }

  void auditLog(
    { userId: null, userEmail: email, userRole: null },
    { action: 'auth.otp_sent' }
  );

  const params = new URLSearchParams({
    email,
    sent: '1',
    redirect: redirectTo,
  });
  if (from === 'signup') {
    if (fullName) params.set('name', fullName);
    if (marketingOptIn) params.set('marketing', '1');
  }
  redirect(`${base}?${params.toString()}`);
}

/**
 * Verify the 6-digit OTP. On success Supabase sets the session on the
 * server cookie and we revalidate the layout cache so RSC sees the new
 * auth state. type='email' covers both first-time signups (verifies the
 * address and creates the user) and returning logins.
 */
export async function verifyOtp(formData: FormData) {
  const email = String(formData.get('email') || '').trim().toLowerCase();
  const token = String(formData.get('token') || '').trim();
  const redirectTo =
    (formData.get('redirect') as string | null)?.trim() || '/dashboard';
  const from = parseOrigin(formData.get('from'));
  const base = originBase(from);

  if (!email || !EMAIL_REGEX.test(email)) {
    redirect(`${base}?error=` + encodeURIComponent('بريد إلكتروني غير صحيح.'));
  }
  if (!/^[0-9]{4,8}$/.test(token)) {
    redirect(
      `${base}?email=${encodeURIComponent(email)}&sent=1` +
        `&error=${encodeURIComponent('الكود لازم يكون أرقام بس.')}`
    );
  }

  const supabase = createClient();
  const { data, error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: 'email',
  });

  if (error || !data.session) {
    void auditLog(
      { userId: null, userEmail: email, userRole: null },
      {
        action: 'auth.otp_verify_failed',
        result: 'failure',
        errorMessage: error?.message || 'no session',
      }
    );
    redirect(
      `${base}?email=${encodeURIComponent(email)}&sent=1` +
        `&error=${encodeURIComponent('الكود غير صحيح أو منتهي. حاول تاني.')}`
    );
  }

  void auditLog(
    {
      userId: data.session.user.id,
      userEmail: data.session.user.email ?? null,
      userRole: null,
    },
    { action: 'auth.otp_login_success' }
  );

  revalidatePath('/', 'layout');
  redirect(redirectTo);
}
