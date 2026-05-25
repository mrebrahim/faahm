import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { APP_NAME, ROUTES } from '@/lib/constants';
import {
  Award,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { claimCertificate } from './actions';

export const metadata = { title: 'اطلب شهادتك — فاهم!' };

export default async function ClaimCertificatePage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams: { error?: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(
      `/login?redirect=${encodeURIComponent(`/certificate/claim/${params.slug}`)}`
    );
  }

  const service = createServiceClient();
  const { data: course } = await service
    .from('courses')
    .select('id, slug, title_ar, total_lessons')
    .eq('slug', params.slug)
    .eq('is_published', true)
    .maybeSingle();
  if (!course) notFound();

  // Reject if there's already an active cert (avoid showing the form
  // just to bounce on submit).
  const { data: existing } = await service
    .from('certificates')
    .select('certificate_number')
    .eq('user_id', user.id)
    .eq('course_id', course.id)
    .eq('is_revoked', false)
    .maybeSingle();
  if (existing) {
    redirect(`/certificate/${existing.certificate_number}`);
  }

  const { data: eligible } = await service.rpc('check_certificate_eligibility', {
    p_user_id: user.id,
    p_course_id: course.id,
  });

  const { data: profile } = await service
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .maybeSingle();

  // If the profile name is the email (matches user.email exactly) we
  // treat it as "not set" so the input starts empty and the student
  // types a proper display name.
  const stored = (profile?.full_name || '').trim();
  const looksLikeEmail = stored.includes('@') || stored.toLowerCase() === (user.email || '').toLowerCase();
  const defaultName = looksLikeEmail ? '' : stored;

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href={ROUTES.home} className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-brand-500 flex items-center justify-center font-display font-extrabold text-white text-lg">
              ف
            </div>
            <span className="font-display font-extrabold text-xl">{APP_NAME}</span>
          </Link>
          <Button asChild variant="ghost" size="sm">
            <Link href={ROUTES.dashboard}>لوحتي</Link>
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-10 max-w-xl">
        <div className="text-center mb-8">
          <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-brand-500/10 flex items-center justify-center">
            <Award className="w-8 h-8 text-brand-500" />
          </div>
          <h1 className="font-display text-3xl font-extrabold mb-2">
            اطلب شهادتك
          </h1>
          <p className="text-sm text-gray-600">
            خطوة أخيرة قبل إصدار شهادتك في «<strong>{course.title_ar}</strong>»: تأكّد
            من الاسم اللي هيظهر عليها.
          </p>
        </div>

        {!eligible ? (
          <IneligibleCard courseSlug={course.slug} />
        ) : (
          <>
            {searchParams.error && (
              <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                {decodeURIComponent(searchParams.error)}
              </div>
            )}

            <form
              action={claimCertificate}
              className="p-6 rounded-2xl border border-gray-200 bg-white space-y-5"
            >
              <input type="hidden" name="slug" value={course.slug} />

              <div className="space-y-2">
                <Label htmlFor="full_name">الاسم الكامل (هيظهر على الشهادة)</Label>
                <Input
                  id="full_name"
                  name="full_name"
                  defaultValue={defaultName}
                  required
                  minLength={3}
                  maxLength={80}
                  autoComplete="name"
                  placeholder="مثلًا: إبراهيم محمود"
                  className="text-lg"
                />
                <p className="text-[11px] text-gray-500">
                  راجع الاسم كويس — مش هتقدر تعدّله بعد كده غير بتذكرة دعم.
                </p>
              </div>

              <div className="p-3 rounded-lg border border-emerald-200 bg-emerald-50 text-sm text-emerald-900 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <div>
                  مؤهّل للشهادة. هنحفظ الاسم على ملفك الشخصي ونصدر الشهادة فورًا.
                </div>
              </div>

              <div className="flex items-center justify-between gap-3">
                <Button asChild variant="ghost">
                  <Link href={ROUTES.course(course.slug)}>إلغاء</Link>
                </Button>
                <Button type="submit" size="lg">
                  <ShieldCheck className="w-4 h-4" />
                  أصدر شهادتي
                </Button>
              </div>
            </form>
          </>
        )}
      </main>
    </div>
  );
}

function IneligibleCard({ courseSlug }: { courseSlug: string }) {
  return (
    <div className="p-6 rounded-2xl border border-amber-200 bg-amber-50 text-amber-900">
      <div className="flex items-center gap-2 font-bold mb-2">
        <AlertCircle className="w-5 h-5" />
        لسه ما أكملتش متطلبات الشهادة
      </div>
      <p className="text-sm mb-4">
        المتطلبات: كل الدروس مكتملة + نجاحك في كل الكويزات بنسبة 70% أو أكثر.
      </p>
      <Button asChild>
        <Link href={ROUTES.course(courseSlug)}>
          <ArrowRight className="w-4 h-4" />
          ارجع للكورس
        </Link>
      </Button>
    </div>
  );
}
