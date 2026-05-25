import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { applyPendingInvitesForCurrentUser } from '@/lib/invites';
import { APP_NAME, ROUTES } from '@/lib/constants';
import { SetInitialPasswordForm } from './set-password-form';
import { CheckCircle2, Sparkles } from 'lucide-react';

export const metadata = {
  title: 'إكمال الحساب — فاهم!',
  robots: { index: false, follow: false },
};

/**
 * Post-invite landing page. Invitees from the admin invite flow land here
 * via /auth/callback → /dashboard → (redirect when password_set=false).
 *
 * Required steps before they can use the rest of the site:
 *   1. Pick a name (optional but populated from email if blank)
 *   2. Set a password they'll use to log in next time
 *
 * If they already have a password (came from /signup, or completed this
 * flow before), we bounce them straight to /dashboard.
 */
export default async function WelcomePage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login?redirect=/welcome');
  }

  // Catch invites that haven't been applied yet so the welcome screen
  // can show "your subscription is active" alongside the password form.
  await applyPendingInvitesForCurrentUser();

  const service = createServiceClient();
  const { data: profile } = await service
    .from('profiles')
    .select('full_name, password_set')
    .eq('id', user.id)
    .single();

  // Nothing to do here for users who already set up their account.
  if (profile?.password_set) {
    redirect(ROUTES.dashboard);
  }

  // Check whether they have an active subscription (likely from an invite
  // grant) so we can surface that as good news on the welcome screen.
  const { data: sub } = await service
    .from('subscriptions')
    .select('plan, current_period_end')
    .eq('user_id', user.id)
    .in('status', ['active', 'trialing'])
    .gt('current_period_end', new Date().toISOString())
    .order('current_period_end', { ascending: false })
    .limit(1)
    .maybeSingle();

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div
        aria-hidden
        className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-brand-500/5 blur-[120px]"
      />

      <div className="relative w-full max-w-md">
        <Link href={ROUTES.home} className="flex items-center justify-center gap-2 mb-8">
          <div className="w-12 h-12 rounded-xl bg-brand-500 flex items-center justify-center font-display font-extrabold text-white text-xl shadow-lg shadow-brand-500/30">
            ف
          </div>
          <span className="font-display font-extrabold text-2xl">{APP_NAME}</span>
        </Link>

        <div className="bg-white border border-gray-200 rounded-2xl p-8">
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 mb-3 rounded-full bg-brand-500/10 text-brand-700 text-xs font-medium">
              <Sparkles className="w-3.5 h-3.5" />
              مرحبًا بك في فاهم
            </div>
            <h1 className="font-display text-2xl font-bold mb-1">إكمال إنشاء حسابك</h1>
            <p className="text-sm text-gray-500">
              خطوة أخيرة قبل ما تبدأ. اختار اسمك وكلمة سر للمستقبل.
            </p>
          </div>

          {sub && (
            <div className="mb-5 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <div>
                <div className="font-medium">
                  اشتراكك مفعّل — {sub.plan === 'yearly' ? 'سنوي' : 'شهري'}
                </div>
                <div className="text-xs mt-0.5 opacity-90">
                  حتى{' '}
                  {new Date(sub.current_period_end).toLocaleDateString('ar-EG', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </div>
              </div>
            </div>
          )}

          {searchParams.error && (
            <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm text-center">
              {decodeURIComponent(searchParams.error)}
            </div>
          )}

          <SetInitialPasswordForm
            defaultName={
              profile?.full_name && profile.full_name !== user.email
                ? profile.full_name
                : ''
            }
            email={user.email || ''}
          />

          <p className="text-xs text-gray-400 text-center mt-5">
            بإتمام التسجيل، أنت توافق على{' '}
            <Link href="/terms" className="underline hover:text-gray-600">
              شروط الاستخدام
            </Link>{' '}
            و{' '}
            <Link href="/privacy" className="underline hover:text-gray-600">
              سياسة الخصوصية
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
