import Link from 'next/link';
import { createServiceClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/admin-guard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { inviteStudent, cancelPendingInvite } from './actions';
import {
  ArrowRight,
  Mail,
  Send,
  CheckCircle2,
  AlertTriangle,
  X,
  Clock,
  Info,
} from 'lucide-react';

export const metadata = {
  title: 'دعوة طالب — لوحة الإدارة',
  robots: { index: false, follow: false },
};

export default async function InviteStudentPage({
  searchParams,
}: {
  searchParams: { success?: string; error?: string; email?: string };
}) {
  await requireAdmin();
  const service = createServiceClient();

  const [{ data: pending }, { data: recent }, { data: courses }] = await Promise.all([
    service
      .from('pending_invites')
      .select('id, email, invited_at, notes, intended_plan, intended_course_id')
      .is('accepted_at', null)
      .order('invited_at', { ascending: false })
      .limit(20),
    service
      .from('pending_invites')
      .select('id, email, invited_at, accepted_at, intended_plan, intended_course_id, accepted_user_id')
      .not('accepted_at', 'is', null)
      .order('accepted_at', { ascending: false })
      .limit(10),
    service
      .from('courses')
      .select('id, title_ar, slug')
      .eq('is_published', true)
      .order('sort_order'),
  ]);

  // course_id → title_ar lookup so the tables below can render a label
  // instead of a raw uuid.
  const courseTitle = new Map<string, string>(
    (courses ?? []).map((c: { id: string; title_ar: string }) => [c.id, c.title_ar])
  );

  return (
    <div className="p-8 max-w-4xl">
      <Link
        href="/admin/students"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-foreground mb-4"
      >
        <ArrowRight className="w-4 h-4" />
        العودة لقائمة الطلاب
      </Link>

      <div className="flex items-center gap-3 mb-6">
        <Mail className="w-8 h-8 text-brand-500" />
        <div>
          <h1 className="font-display text-3xl font-bold">دعوة طالب جديد</h1>
          <p className="text-gray-500 text-sm mt-1">
            ابعت لرابط تأكيد على إيميل الطالب. لما يفتحه ويسجّل، هيتم تسجيله في
            الكورس اللي اختاره ويتوجّه لصفحة الأسعار.
          </p>
        </div>
      </div>

      {/* Success / error banners */}
      {searchParams.success === 'sent' && (
        <Banner kind="success">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <span>
            تم إرسال الدعوة إلى{' '}
            <strong dir="ltr">{searchParams.email || ''}</strong>. هيوصله لينك
            تأكيد على البريد الإلكتروني.
          </span>
        </Banner>
      )}
      {searchParams.success === 'already_registered' && (
        <Banner kind="info">
          <Info className="w-5 h-5 flex-shrink-0" />
          <span>
            <strong dir="ltr">{searchParams.email}</strong> مسجّل من قبل. لو
            اخترت كورس، تم إضافته لتسجيلاته مباشرة.
          </span>
        </Banner>
      )}
      {searchParams.success === 'cancelled' && (
        <Banner kind="info">
          <Info className="w-5 h-5 flex-shrink-0" />
          <span>تم إلغاء الدعوة المعلّقة.</span>
        </Banner>
      )}
      {searchParams.error && (
        <Banner kind="error">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <span>{decodeURIComponent(searchParams.error)}</span>
        </Banner>
      )}

      {/* Invite form */}
      <form
        action={inviteStudent}
        className="bg-white border border-gray-200 rounded-2xl p-6 space-y-5 mb-8"
      >
        <div className="space-y-2">
          <Label htmlFor="email">البريد الإلكتروني للطالب</Label>
          <Input
            id="email"
            name="email"
            type="email"
            required
            placeholder="student@example.com"
            dir="ltr"
            className="text-left"
          />
          <p className="text-xs text-gray-500">
            هيستلم إيميل من Supabase فيه رابط تأكيد لإكمال التسجيل.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="course_id">نوع الوصول</Label>
          <select
            id="course_id"
            name="course_id"
            defaultValue=""
            className="w-full h-11 px-3 rounded-lg border border-gray-200 bg-white text-sm"
          >
            <option value="">— كل الكورسات (اختر المدة تحت) —</option>
            {(courses || []).map((c: { id: string; title_ar: string; slug: string }) => (
              <option key={c.id} value={c.id}>
                كورس واحد فقط: {c.title_ar}
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-500">
            <strong>"كل الكورسات"</strong> = اشتراك كامل بالمدة اللي تحت.{' '}
            <strong>"كورس واحد فقط"</strong> = إنرولمنت في الكورس ده بس بنفس المدة.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="plan">المدة</Label>
          <select
            id="plan"
            name="plan"
            defaultValue=""
            className="w-full h-11 px-3 rounded-lg border border-gray-200 bg-white text-sm"
          >
            <option value="">— بدون وصول (دعوة فقط، يدفع بنفسه) —</option>
            <option value="monthly">شهر (30 يوم)</option>
            <option value="yearly">سنة (365 يوم)</option>
          </select>
          <p className="text-xs text-gray-500">
            لو سبتها فاضية، الطالب هيستلم دعوة بس بدون وصول — هيشوف صفحة
            الأسعار ويختار يدفع.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes">ملاحظة داخلية (اختياري)</Label>
          <textarea
            id="notes"
            name="notes"
            rows={2}
            className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            placeholder="مثال: عميل من واتساب، VIP، تم منحه شهر مجاني..."
          />
        </div>

        <div className="pt-2">
          <Button type="submit" size="lg">
            <Send className="w-4 h-4" />
            إرسال الدعوة
          </Button>
        </div>
      </form>

      {/* What happens next */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 text-sm mb-8">
        <h3 className="font-bold mb-2 flex items-center gap-2 text-blue-900">
          <Info className="w-4 h-4" />
          خطوات الدعوة (للمعلومية)
        </h3>
        <ol className="list-decimal space-y-1 ps-6 text-blue-800">
          <li>الطالب بياخد إيميل من Supabase فيه لينك تأكيد.</li>
          <li>يضغط اللينك → يفتح موقع فاهم ويتم تسجيل دخوله تلقائيًا.</li>
          <li>
            لو اخترت اشتراك مجاني، يتم تفعيله فورًا (شهري = 30 يوم، سنوي = 365
            يوم) ويلاقي كل الكورسات مفتوحة.
          </li>
          <li>
            بدون اشتراك، يتوجّه للوحته ويشوف بانر "اشترك دلوقتي" لاختيار خطة
            مدفوعة.
          </li>
        </ol>
      </div>

      {/* Pending invites */}
      <section className="mb-8">
        <h2 className="font-bold text-lg mb-3 flex items-center gap-2">
          <Clock className="w-5 h-5 text-amber-500" />
          دعوات معلّقة ({(pending || []).length})
        </h2>
        {pending && pending.length > 0 ? (
          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                <tr>
                  <th className="text-start px-4 py-2.5 font-semibold">الإيميل</th>
                  <th className="text-start px-4 py-2.5 font-semibold">الكورس</th>
                  <th className="text-start px-4 py-2.5 font-semibold">الاشتراك المجاني</th>
                  <th className="text-start px-4 py-2.5 font-semibold">تم الإرسال</th>
                  <th className="text-start px-4 py-2.5 font-semibold sr-only">إلغاء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pending.map((p: any) => (
                  <tr key={p.id}>
                    <td className="px-4 py-3" dir="ltr">
                      {p.email}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {p.intended_course_id ? (
                        <span className="inline-block px-2 py-0.5 rounded-full text-xs bg-emerald-50 text-emerald-700">
                          {courseTitle.get(p.intended_course_id) ?? '—'}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <PlanBadge plan={p.intended_plan} />
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                      {new Date(p.invited_at).toLocaleString('ar-EG')}
                    </td>
                    <td className="px-4 py-3 text-end">
                      <form action={cancelPendingInvite} className="inline">
                        <input type="hidden" name="id" value={p.id} />
                        <Button
                          type="submit"
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:bg-red-50"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-6 rounded-xl bg-white border border-dashed border-gray-200 text-center text-sm text-gray-500">
            لا توجد دعوات معلّقة.
          </div>
        )}
      </section>

      {/* Recently accepted */}
      {recent && recent.length > 0 && (
        <section>
          <h2 className="font-bold text-lg mb-3 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            آخر الدعوات المقبولة
          </h2>
          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                <tr>
                  <th className="text-start px-4 py-2.5 font-semibold">الإيميل</th>
                  <th className="text-start px-4 py-2.5 font-semibold">الكورس</th>
                  <th className="text-start px-4 py-2.5 font-semibold">الاشتراك المجاني</th>
                  <th className="text-start px-4 py-2.5 font-semibold">قُبلت في</th>
                  <th className="text-start px-4 py-2.5 font-semibold sr-only">انتقل للملف</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recent.map((p: any) => (
                  <tr key={p.id}>
                    <td className="px-4 py-3" dir="ltr">
                      {p.email}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {p.intended_course_id ? (
                        <span className="inline-block px-2 py-0.5 rounded-full text-xs bg-emerald-50 text-emerald-700">
                          {courseTitle.get(p.intended_course_id) ?? '—'}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <PlanBadge plan={p.intended_plan} />
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                      {p.accepted_at && new Date(p.accepted_at).toLocaleString('ar-EG')}
                    </td>
                    <td className="px-4 py-3 text-end">
                      {p.accepted_user_id && (
                        <Link
                          href={`/admin/students/${p.accepted_user_id}`}
                          className="text-brand-600 hover:text-brand-700 text-xs"
                        >
                          افتح الملف →
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

function PlanBadge({ plan }: { plan: string | null }) {
  if (plan === 'yearly') {
    return (
      <span className="inline-block px-2 py-0.5 rounded-full text-xs bg-brand-500/10 text-brand-700">
        سنوي · 365 يوم
      </span>
    );
  }
  if (plan === 'monthly') {
    return (
      <span className="inline-block px-2 py-0.5 rounded-full text-xs bg-blue-50 text-blue-700">
        شهري · 30 يوم
      </span>
    );
  }
  return <span className="text-gray-400 text-xs">بدون اشتراك</span>;
}

function Banner({
  kind,
  children,
}: {
  kind: 'success' | 'error' | 'info';
  children: React.ReactNode;
}) {
  const styles =
    kind === 'success'
      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
      : kind === 'error'
        ? 'bg-red-50 border-red-200 text-red-800'
        : 'bg-blue-50 border-blue-200 text-blue-800';
  return (
    <div className={`mb-4 p-3 rounded-lg border text-sm flex items-center gap-2 ${styles}`}>
      {children}
    </div>
  );
}
