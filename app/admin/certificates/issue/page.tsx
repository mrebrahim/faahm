import Link from 'next/link';
import { createServiceClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/admin-guard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowRight, AlertCircle, CheckCircle2, XCircle } from 'lucide-react';
import { issueCertificate } from '../actions';

export const metadata = { title: 'إصدار شهادة يدوي — إدارة فاهم!' };

export default async function IssueCertificatePage({
  searchParams,
}: {
  searchParams: { q?: string; user_id?: string; course_id?: string; error?: string };
}) {
  await requireAdmin();
  const service = createServiceClient();

  const [{ data: courses }, eligibility, candidateUsers] = await Promise.all([
    service
      .from('courses')
      .select('id, title_ar, slug')
      .eq('is_published', true)
      .order('title_ar'),
    searchParams.user_id && searchParams.course_id
      ? checkEligibility(searchParams.user_id, searchParams.course_id)
      : Promise.resolve(null),
    searchParams.q && searchParams.q.length >= 3
      ? service
          .from('admin_students_v')
          .select('id, email, full_name')
          .or(
            `email.ilike.%${searchParams.q}%,full_name.ilike.%${searchParams.q}%`
          )
          .limit(20)
      : Promise.resolve({ data: null as any }),
  ]);

  return (
    <div className="p-6 lg:p-8 max-w-2xl">
      <Link
        href="/admin/certificates"
        className="text-sm text-brand-600 hover:text-brand-700 inline-flex items-center gap-1 mb-3"
      >
        <ArrowRight className="w-4 h-4" />
        العودة للشهادات
      </Link>
      <h1 className="font-display text-3xl font-bold mb-2">إصدار شهادة يدويًا</h1>
      <p className="text-sm text-gray-500 mb-6">
        ابحث عن الطالب، اختار الكورس، وراجع الأهلية قبل الإصدار.
      </p>

      {searchParams.error && (
        <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {decodeURIComponent(searchParams.error)}
        </div>
      )}

      {/* Step 1 — pick student */}
      <section className="mb-6 p-5 rounded-2xl border border-gray-200 bg-white">
        <h2 className="font-bold mb-3 text-sm">١. اختار الطالب</h2>
        <form className="mb-3">
          {searchParams.course_id && (
            <input type="hidden" name="course_id" value={searchParams.course_id} />
          )}
          <Input
            name="q"
            defaultValue={searchParams.q || ''}
            placeholder="ابحث بالـ email أو الاسم..."
          />
        </form>
        {(candidateUsers as any)?.data?.length > 0 && (
          <ul className="space-y-1">
            {(candidateUsers as any).data.map((u: any) => (
              <li key={u.id}>
                <a
                  href={`?q=${encodeURIComponent(searchParams.q || '')}&user_id=${u.id}${
                    searchParams.course_id ? `&course_id=${searchParams.course_id}` : ''
                  }`}
                  className={`flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 ${
                    searchParams.user_id === u.id ? 'bg-brand-500/5' : ''
                  }`}
                >
                  <span>
                    <span className="font-medium">{u.full_name || u.email}</span>
                    {u.email && u.full_name && (
                      <span className="text-xs text-gray-500 block" dir="ltr">
                        {u.email}
                      </span>
                    )}
                  </span>
                  {searchParams.user_id === u.id && (
                    <CheckCircle2 className="w-4 h-4 text-brand-500" />
                  )}
                </a>
              </li>
            ))}
          </ul>
        )}
        {searchParams.user_id && (
          <p className="text-xs text-gray-500 mt-2" dir="ltr">
            user_id selected: {searchParams.user_id.slice(0, 8)}…
          </p>
        )}
      </section>

      {/* Step 2 — eligibility + form */}
      <section className="p-5 rounded-2xl border border-gray-200 bg-white">
        <h2 className="font-bold mb-3 text-sm">٢. تفاصيل الإصدار</h2>

        <form action={issueCertificate} className="space-y-4">
          <input type="hidden" name="user_id" value={searchParams.user_id || ''} />

          <div className="space-y-1">
            <Label htmlFor="course_id">الكورس</Label>
            <select
              id="course_id"
              name="course_id"
              defaultValue={searchParams.course_id || ''}
              required
              className="flex h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm"
            >
              <option value="">— اختار كورس —</option>
              {(courses || []).map((c: any) => (
                <option key={c.id} value={c.id}>
                  {c.title_ar}
                </option>
              ))}
            </select>
          </div>

          {eligibility && (
            <div
              className={`p-3 rounded-lg border text-sm ${
                eligibility.is_eligible
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-amber-50 border-amber-200 text-amber-900'
              }`}
            >
              <div className="flex items-center gap-2 mb-1 font-bold">
                {eligibility.is_eligible ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    الطالب مؤهّل
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4" />
                    الطالب مش مؤهّل بالكامل
                  </>
                )}
              </div>
              <ul className="text-xs space-y-0.5" dir="ltr">
                <li>
                  Lessons: {eligibility.completed_lessons} / {eligibility.total_lessons}
                </li>
                <li>
                  Quizzes passed: {eligibility.passed_quizzes} / {eligibility.total_quizzes}
                </li>
                {eligibility.has_existing && <li>⚠ فيه شهادة نشطة بالفعل</li>}
              </ul>
            </div>
          )}

          <div className="space-y-1">
            <Label htmlFor="reason">السبب (مطلوب)</Label>
            <Input
              id="reason"
              name="reason"
              placeholder="تعويض عن خطأ تقني / شراكة تسويقية / اختبار QA..."
              required
            />
          </div>

          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" name="bypass" className="mt-1 accent-brand-500" />
            <span>
              تخطّي تحقق الأهلية
              <span className="block text-xs text-gray-500">
                للحالات الاستثنائية فقط. كل عملية بتسجَّل في Audit Log.
              </span>
            </span>
          </label>

          <Button type="submit">إصدار الشهادة</Button>
        </form>
      </section>
    </div>
  );
}

async function checkEligibility(userId: string, courseId: string) {
  const service = createServiceClient();
  const [lessons, completed, quizzes, passed, existing] = await Promise.all([
    service.from('lessons').select('id', { count: 'exact', head: true }).eq('course_id', courseId),
    service
      .from('progress')
      .select('lesson_id', { count: 'exact', head: false })
      .eq('user_id', userId)
      .eq('course_id', courseId)
      .eq('is_completed', true),
    service
      .from('quizzes')
      .select('id', { count: 'exact', head: false })
      .or(
        `course_id.eq.${courseId},lesson_id.in.(${await getLessonIds(courseId)})`
      ),
    service
      .from('quiz_attempts')
      .select('quiz_id', { count: 'exact', head: false })
      .eq('user_id', userId)
      .eq('is_passed', true)
      .gte('score', 70),
    service
      .from('certificates')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('course_id', courseId)
      .eq('is_revoked', false),
  ]);

  const totalLessons = lessons.count || 0;
  const completedLessons = new Set(
    (completed.data || []).map((r: any) => r.lesson_id)
  ).size;
  const quizIds = new Set((quizzes.data || []).map((q: any) => q.id));
  const passedQuizIds = new Set(
    (passed.data || []).filter((qa: any) => quizIds.has(qa.quiz_id)).map((qa: any) => qa.quiz_id)
  );
  const totalQuizzes = quizIds.size;
  const passedQuizzes = passedQuizIds.size;
  const hasExisting = (existing.count || 0) > 0;

  const isEligible =
    !hasExisting &&
    totalLessons > 0 &&
    completedLessons >= totalLessons &&
    passedQuizzes >= totalQuizzes;

  return {
    total_lessons: totalLessons,
    completed_lessons: completedLessons,
    total_quizzes: totalQuizzes,
    passed_quizzes: passedQuizzes,
    has_existing: hasExisting,
    is_eligible: isEligible,
  };
}

async function getLessonIds(courseId: string): Promise<string> {
  const service = createServiceClient();
  const { data } = await service.from('lessons').select('id').eq('course_id', courseId);
  return (data || []).map((l: any) => l.id).join(',') || '00000000-0000-0000-0000-000000000000';
}
