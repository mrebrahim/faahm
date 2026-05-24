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
