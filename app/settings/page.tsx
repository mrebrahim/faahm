import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PhoneInput } from '@/components/phone-input';
import { ROUTES } from '@/lib/constants';
import { ArrowRight, LogOut, CheckCircle2 } from 'lucide-react';
import { updateProfile } from './actions';

export const metadata = { title: 'الإعدادات — فاهم!' };
export const dynamic = 'force-dynamic';

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: { saved?: string; error?: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(ROUTES.login);

  const service = createServiceClient();
  const { data: profile } = await service
    .from('profiles')
    .select('full_name, phone, country, marketing_opt_in')
    .eq('id', user.id)
    .single();

  // Pull active enrollments + any active subscription so the user can
  // see what they actually have access to.
  const nowIso = new Date().toISOString();
  const { data: enrollments } = await service
    .from('enrollments')
    .select('expires_at, course:courses(title_ar, slug)')
    .eq('user_id', user.id)
    .or(`expires_at.is.null,expires_at.gt.${nowIso}`)
    .order('expires_at', { ascending: true });

  const { data: subscription } = await service
    .from('subscriptions')
    .select('plan, current_period_end, status')
    .eq('user_id', user.id)
    .in('status', ['active', 'trialing'])
    .gt('current_period_end', nowIso)
    .order('current_period_end', { ascending: false })
    .limit(1)
    .maybeSingle();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-10">
        <Link
          href={ROUTES.dashboard}
          className="inline-flex items-center gap-1 text-sm text-brand-600 hover:underline mb-6"
        >
          <ArrowRight className="w-4 h-4" />
          للوحة التحكم
        </Link>

        <h1 className="font-display text-3xl font-extrabold mb-1">الإعدادات</h1>
        <p className="text-gray-500 text-sm mb-8">حدّث بياناتك وراجع اشتراكاتك.</p>

        {searchParams.saved && (
          <div className="mb-6 p-3 rounded-lg bg-brand-500/10 border border-brand-500/30 text-brand-700 text-sm flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            تم حفظ البيانات.
          </div>
        )}
        {searchParams.error && (
          <div className="mb-6 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm">
            {searchParams.error}
          </div>
        )}

        <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-6">
          <h2 className="font-display text-xl font-bold mb-1">البيانات الشخصية</h2>
          <p className="text-xs text-gray-500 mb-5">الإيميل ثابت ومينفعش يتغيّر.</p>

          <form action={updateProfile} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">البريد الإلكتروني</Label>
              <Input
                id="email"
                type="email"
                value={user.email ?? ''}
                disabled
                dir="ltr"
                className="text-left bg-gray-50"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="full_name">الاسم بالكامل</Label>
              <Input
                id="full_name"
                name="full_name"
                type="text"
                defaultValue={profile?.full_name ?? ''}
                autoComplete="name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">رقم الموبايل</Label>
              <PhoneInput
                defaultPhone={profile?.phone ?? ''}
                defaultCountry={profile?.country ?? undefined}
                required={false}
              />
            </div>

            <label className="flex items-start gap-3 text-sm text-gray-600 cursor-pointer">
              <input
                type="checkbox"
                name="marketing_opt_in"
                value="1"
                defaultChecked={!!profile?.marketing_opt_in}
                className="mt-1 h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
              />
              <span>أوافق على تلقي رسائل البريد الإلكتروني الترويجية والتعليمية</span>
            </label>

            <Button type="submit" size="lg">حفظ</Button>
          </form>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-6">
          <h2 className="font-display text-xl font-bold mb-3">اشتراكي والوصول</h2>

          {subscription && (
            <div className="mb-4 p-3 rounded-lg border border-brand-500/30 bg-brand-500/5 text-sm">
              <div className="font-medium">
                اشتراك {subscription.plan === 'yearly' ? 'سنوي' : 'شهري'} (
                {subscription.status === 'trialing' ? 'تجربة' : 'فعّال'})
              </div>
              <div className="text-gray-500 text-xs">
                ساري حتى{' '}
                {new Date(subscription.current_period_end).toLocaleDateString('ar-EG')}
              </div>
            </div>
          )}

          {enrollments && enrollments.length > 0 ? (
            <div className="space-y-2">
              <div className="text-sm font-medium text-gray-700">الكورسات المفتوحة:</div>
              <ul className="space-y-2">
                {enrollments.map((e, i) => {
                  // Supabase joins come back as an array even on a 1:1 fk.
                  const raw = (e as unknown as {
                    course: { title_ar: string; slug: string } | { title_ar: string; slug: string }[] | null;
                  }).course;
                  const c = Array.isArray(raw) ? raw[0] : raw;
                  if (!c) return null;
                  return (
                    <li
                      key={i}
                      className="flex items-center justify-between text-sm p-3 rounded-lg border border-gray-200"
                    >
                      <Link href={`/course/${c.slug}`} className="font-medium hover:underline">
                        {c.title_ar}
                      </Link>
                      <span className="text-xs text-gray-500">
                        {e.expires_at
                          ? `حتى ${new Date(e.expires_at).toLocaleDateString('ar-EG')}`
                          : 'دائم'}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : !subscription ? (
            <div className="text-sm text-gray-500">
              مفيش اشتراك أو كورسات مفتوحة حالياً.{' '}
              <Link href={ROUTES.pricing} className="text-brand-600 hover:underline">
                اشترك دلوقتي
              </Link>
            </div>
          ) : null}
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-6">
          <h2 className="font-display text-xl font-bold mb-3">الحساب</h2>
          <form action="/auth/signout" method="POST">
            <Button type="submit" variant="outline">
              <LogOut className="w-4 h-4" />
              تسجيل الخروج
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
