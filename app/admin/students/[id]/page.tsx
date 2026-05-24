import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createServiceClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/admin-guard';
import { auditLog } from '@/lib/admin-audit';
import { Button } from '@/components/ui/button';
import {
  banStudent,
  unbanStudent,
  changeStudentRole,
  sendPasswordReset,
  revokeStudentSessions,
  saveStudentNotes,
} from './actions';
import {
  ArrowRight,
  ArrowLeft,
  Mail,
  Phone,
  Globe,
  Ban,
  CheckCircle2,
  AlertTriangle,
  KeyRound,
  LogOut,
  Shield,
  CreditCard,
  BookOpen,
  Award,
  User as UserIcon,
  StickyNote,
} from 'lucide-react';

export const metadata = {
  title: 'تفاصيل الطالب — لوحة الإدارة',
  robots: { index: false, follow: false },
};

const TABS = [
  { id: 'overview', label: 'نظرة عامة', icon: UserIcon },
  { id: 'subscriptions', label: 'الاشتراكات', icon: CreditCard },
  { id: 'payments', label: 'المدفوعات', icon: CreditCard },
  { id: 'progress', label: 'التقدم', icon: BookOpen },
  { id: 'audit', label: 'سجل الإجراءات', icon: Shield },
] as const;

type TabId = (typeof TABS)[number]['id'];

export default async function StudentDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { tab?: string; success?: string; error?: string };
}) {
  const ctx = await requireAdmin();
  const tab = (TABS.find((t) => t.id === searchParams.tab)?.id || 'overview') as TabId;

  const service = createServiceClient();
  const { data: student } = await service
    .from('admin_students_v')
    .select('*')
    .eq('id', params.id)
    .maybeSingle();

  if (!student) notFound();

  void auditLog(ctx, {
    action: 'student.viewed',
    resourceType: 'profile',
    resourceId: params.id,
    metadata: { tab },
  });

  return (
    <div className="p-8 max-w-6xl">
      {/* Back link */}
      <Link
        href="/admin/students"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-foreground mb-4"
      >
        <ArrowRight className="w-4 h-4" />
        العودة لقائمة الطلاب
      </Link>

      {/* Success/error banners */}
      {searchParams.success && <SuccessBanner code={searchParams.success} />}
      {searchParams.error && (
        <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm">
          {decodeURIComponent(searchParams.error)}
        </div>
      )}

      {/* Header */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-6">
        <div className="flex items-start gap-4 flex-wrap">
          <Avatar name={student.full_name || student.email || '?'} url={student.avatar_url} />
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-2xl md:text-3xl font-bold mb-1 flex items-center gap-3 flex-wrap">
              {student.full_name || 'بدون اسم'}
              {student.is_blocked && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-50 text-red-700 text-xs">
                  <Ban className="w-3 h-3" /> محظور
                </span>
              )}
            </h1>
            <div className="text-sm text-gray-500 flex flex-wrap items-center gap-x-4 gap-y-1">
              <span className="flex items-center gap-1" dir="ltr">
                <Mail className="w-3.5 h-3.5" />
                {student.email || '—'}
              </span>
              {student.phone && (
                <span className="flex items-center gap-1" dir="ltr">
                  <Phone className="w-3.5 h-3.5" />
                  {maskPhone(student.phone)}
                </span>
              )}
              {student.country && (
                <span className="flex items-center gap-1">
                  <Globe className="w-3.5 h-3.5" />
                  {student.country}
                </span>
              )}
              <span className="text-gray-400">
                انضم {new Date(student.joined_at).toLocaleDateString('ar-EG')}
              </span>
            </div>
          </div>
        </div>

        {/* Subscription status */}
        <div className="mt-4 pt-4 border-t border-gray-100 text-sm">
          <span className="text-gray-500">حالة الاشتراك: </span>
          {student.subscription_status ? (
            <>
              <span
                className={`font-medium ${
                  student.subscription_status === 'active' ? 'text-brand-600' : 'text-gray-600'
                }`}
              >
                {student.subscription_status === 'active'
                  ? 'نشط'
                  : student.subscription_status === 'cancelled'
                    ? 'ملغي'
                    : student.subscription_status}
                {' · '}
                {student.subscription_plan === 'yearly' ? 'سنوي' : 'شهري'}
              </span>
              {student.subscription_ends_at && (
                <span className="text-gray-500">
                  {' '}
                  حتى {new Date(student.subscription_ends_at).toLocaleDateString('ar-EG')}
                </span>
              )}
            </>
          ) : (
            <span className="text-gray-400">لم يشترك</span>
          )}
        </div>

        {/* Actions */}
        <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-2 flex-wrap">
          <form action={sendPasswordReset}>
            <input type="hidden" name="id" value={student.id} />
            <Button type="submit" variant="outline" size="sm">
              <KeyRound className="w-4 h-4" />
              إرسال إعادة كلمة السر
            </Button>
          </form>
          <form action={revokeStudentSessions}>
            <input type="hidden" name="id" value={student.id} />
            <Button type="submit" variant="outline" size="sm">
              <LogOut className="w-4 h-4" />
              إنهاء كل الجلسات
            </Button>
          </form>
          {/* Role change as a small inline select */}
          <form action={changeStudentRole} className="flex items-center gap-2">
            <input type="hidden" name="id" value={student.id} />
            <select
              name="role"
              defaultValue={student.role}
              className="h-9 px-2 rounded-lg border border-gray-200 bg-white text-sm"
            >
              <option value="student">طالب</option>
              <option value="instructor">مدرّب</option>
              <option value="admin">مدير</option>
            </select>
            <Button type="submit" variant="outline" size="sm">
              تغيير الدور
            </Button>
          </form>
          {/* Ban / Unban */}
          {student.is_blocked ? (
            <form action={unbanStudent}>
              <input type="hidden" name="id" value={student.id} />
              <Button type="submit" variant="outline" size="sm">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                رفع الحظر
              </Button>
            </form>
          ) : (
            <BanInlineForm studentId={student.id} />
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6 -mx-2 px-2 overflow-x-auto">
        <div className="flex items-center gap-1 min-w-max">
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = t.id === tab;
            return (
              <Link
                key={t.id}
                href={`/admin/students/${student.id}?tab=${t.id}`}
                className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                  active
                    ? 'border-brand-500 text-brand-700'
                    : 'border-transparent text-gray-500 hover:text-foreground'
                }`}
              >
                <Icon className="w-4 h-4" />
                {t.label}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Tab content */}
      {tab === 'overview' && <OverviewTab student={student} />}
      {tab === 'subscriptions' && <SubscriptionsTab userId={student.id} />}
      {tab === 'payments' && <PaymentsTab userId={student.id} />}
      {tab === 'progress' && <ProgressTab userId={student.id} />}
      {tab === 'audit' && <AuditTab userId={student.id} />}
    </div>
  );
}

// ============================================================================
// Tabs
// ============================================================================

function OverviewTab({ student }: { student: any }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="دروس مكتملة" value={`${student.lessons_completed || 0} / ${student.lessons_started || 0}`} />
        <Stat label="شهادات" value={student.certificates_count || 0} />
        <Stat label="مدفوعات" value={student.total_payments_count || 0} />
        <Stat
          label="إجمالي الإنفاق"
          value={`$${((student.total_spent_cents || 0) / 100).toFixed(2)}`}
          tone="brand"
        />
      </div>

      {/* Account info card */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6">
        <h3 className="font-bold mb-4">معلومات الحساب</h3>
        <dl className="grid grid-cols-1 md:grid-cols-2 gap-y-3 gap-x-6 text-sm">
          <Info label="الـ ID" value={student.id} mono />
          <Info
            label="الإيميل مؤكد"
            value={
              student.email_confirmed_at ? (
                <span className="text-emerald-600 inline-flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" /> نعم
                </span>
              ) : (
                <span className="text-amber-600 inline-flex items-center gap-1">
                  <AlertTriangle className="w-4 h-4" /> لا
                </span>
              )
            }
          />
          <Info label="تاريخ التسجيل" value={new Date(student.joined_at).toLocaleString('ar-EG')} />
          <Info
            label="آخر دخول"
            value={
              student.last_sign_in_at
                ? new Date(student.last_sign_in_at).toLocaleString('ar-EG')
                : 'لم يسجّل دخول بعد'
            }
          />
          {student.stripe_customer_id && (
            <Info label="Stripe Customer" value={student.stripe_customer_id} mono />
          )}
          {student.is_blocked && (
            <>
              <Info
                label="تاريخ الحظر"
                value={
                  student.banned_at
                    ? new Date(student.banned_at).toLocaleString('ar-EG')
                    : '—'
                }
              />
              <Info label="سبب الحظر" value={student.banned_reason || '—'} />
            </>
          )}
        </dl>
      </div>

      {/* Notes card */}
      <NotesCard studentId={student.id} initialNotes={student.notes || ''} />
    </div>
  );
}

async function SubscriptionsTab({ userId }: { userId: string }) {
  const service = createServiceClient();
  const { data: subs } = await service
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  return (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
      {subs && subs.length > 0 ? (
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
            <tr>
              <Th>الخطة</Th>
              <Th>الحالة</Th>
              <Th>البداية</Th>
              <Th>النهاية</Th>
              <Th>المزوّد</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {subs.map((s) => (
              <tr key={s.id}>
                <Td>{s.plan === 'yearly' ? 'سنوي' : 'شهري'}</Td>
                <Td>
                  <span
                    className={`inline-block px-2 py-0.5 rounded-full text-xs ${
                      s.status === 'active'
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {s.status}
                  </span>
                </Td>
                <Td>{new Date(s.current_period_start).toLocaleDateString('ar-EG')}</Td>
                <Td>{new Date(s.current_period_end).toLocaleDateString('ar-EG')}</Td>
                <Td>{s.gateway || '—'}</Td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <EmptyTab label="لا توجد اشتراكات لهذا الطالب." />
      )}
    </div>
  );
}

async function PaymentsTab({ userId }: { userId: string }) {
  const service = createServiceClient();
  const { data: payments } = await service
    .from('payments')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  return (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
      {payments && payments.length > 0 ? (
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
            <tr>
              <Th>التاريخ</Th>
              <Th>المبلغ</Th>
              <Th>الحالة</Th>
              <Th>المزوّد</Th>
              <Th>الإيصال</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {payments.map((p: any) => {
              const url = (p.metadata as any)?.hosted_invoice_url;
              return (
                <tr key={p.id}>
                  <Td>{new Date(p.created_at).toLocaleString('ar-EG')}</Td>
                  <Td>
                    <span dir="ltr">
                      ${((p.amount_cents || 0) / 100).toFixed(2)} {p.currency}
                    </span>
                  </Td>
                  <Td>
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-xs ${
                        p.status === 'paid'
                          ? 'bg-emerald-50 text-emerald-700'
                          : p.status === 'failed'
                            ? 'bg-red-50 text-red-700'
                            : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {p.status}
                    </span>
                  </Td>
                  <Td>{p.gateway}</Td>
                  <Td>
                    {url ? (
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-brand-600 hover:underline text-xs"
                      >
                        افتح →
                      </a>
                    ) : (
                      '—'
                    )}
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </table>
      ) : (
        <EmptyTab label="لا توجد مدفوعات لهذا الطالب." />
      )}
    </div>
  );
}

async function ProgressTab({ userId }: { userId: string }) {
  const service = createServiceClient();
  const { data: rows } = await service
    .from('progress')
    .select(
      `
        id, watched_sec, is_completed, last_watched_at,
        course:courses(id, slug, title_ar, total_lessons),
        lesson:lessons(id, title_ar)
      `
    )
    .eq('user_id', userId)
    .order('last_watched_at', { ascending: false });

  // Group by course.
  const byCourse = new Map<string, any>();
  for (const r of rows || []) {
    const c = Array.isArray(r.course) ? r.course[0] : r.course;
    if (!c) continue;
    if (!byCourse.has(c.id)) {
      byCourse.set(c.id, { course: c, completed: 0, started: 0, last: null as any });
    }
    const g = byCourse.get(c.id);
    g.started++;
    if (r.is_completed) g.completed++;
    if (!g.last || new Date(r.last_watched_at) > new Date(g.last.last_watched_at)) {
      g.last = { ...r, lesson: Array.isArray(r.lesson) ? r.lesson[0] : r.lesson };
    }
  }

  const courses = Array.from(byCourse.values());

  if (courses.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-2xl">
        <EmptyTab label="هذا الطالب لم يبدأ أي درس بعد." />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {courses.map(({ course, completed, started, last }) => {
        const total = course.total_lessons || started;
        const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
        return (
          <div key={course.id} className="bg-white border border-gray-200 rounded-2xl p-5">
            <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
              <Link
                href={`/admin/courses/${course.id}`}
                className="font-bold hover:text-brand-600 inline-flex items-center gap-2"
              >
                <BookOpen className="w-4 h-4 text-brand-500" />
                {course.title_ar}
              </Link>
              <span className="text-sm text-gray-500">
                {completed} / {total} درس ({pct}%)
              </span>
            </div>
            <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
              <div
                className="h-full bg-brand-500 transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
            {last?.lesson && (
              <div className="mt-3 text-xs text-gray-500">
                آخر مشاهدة: {last.lesson.title_ar} ·{' '}
                {new Date(last.last_watched_at).toLocaleString('ar-EG')}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

async function AuditTab({ userId }: { userId: string }) {
  const service = createServiceClient();
  const { data: rows } = await service
    .from('admin_audit_log')
    .select('id, created_at, action, user_email, result, ip, metadata, error_message')
    .eq('resource_id', userId)
    .order('created_at', { ascending: false })
    .limit(100);

  return (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
      {rows && rows.length > 0 ? (
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
            <tr>
              <Th>التاريخ</Th>
              <Th>المدير</Th>
              <Th>الإجراء</Th>
              <Th>الحالة</Th>
              <Th>IP</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((r) => (
              <tr key={r.id}>
                <Td>
                  <span dir="ltr" className="text-xs">
                    {new Date(r.created_at).toISOString().replace('T', ' ').slice(0, 19)}
                  </span>
                </Td>
                <Td>
                  <span dir="ltr" className="text-xs">
                    {r.user_email || '—'}
                  </span>
                </Td>
                <Td>
                  <span dir="ltr" className="font-mono text-xs">
                    {r.action}
                  </span>
                </Td>
                <Td>
                  <span
                    className={`inline-block px-2 py-0.5 rounded-full text-[10px] ${
                      r.result === 'failure'
                        ? 'bg-red-50 text-red-700'
                        : 'bg-emerald-50 text-emerald-700'
                    }`}
                  >
                    {r.result || 'success'}
                  </span>
                </Td>
                <Td>
                  <span dir="ltr" className="text-xs font-mono">
                    {r.ip || '—'}
                  </span>
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <EmptyTab label="لا توجد إجراءات سابقة على هذا الحساب." />
      )}
    </div>
  );
}

// ============================================================================
// Small UI helpers
// ============================================================================

function Avatar({ name, url }: { name: string; url?: string | null }) {
  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={url} alt="" className="w-16 h-16 rounded-2xl object-cover flex-shrink-0" />
    );
  }
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((s) => s[0])
    .join('')
    .toUpperCase();
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return (
    <div
      className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-xl font-bold flex-shrink-0"
      style={{ background: `hsl(${h % 360}, 50%, 50%)` }}
    >
      {initials || '?'}
    </div>
  );
}

function Stat({
  label,
  value,
  tone = 'neutral',
}: {
  label: string;
  value: string | number;
  tone?: 'neutral' | 'brand';
}) {
  return (
    <div
      className={`p-4 rounded-2xl border ${
        tone === 'brand'
          ? 'bg-gradient-to-br from-brand-500/10 to-white border-brand-500/30'
          : 'bg-white border-gray-200'
      }`}
    >
      <div className="text-2xl font-extrabold font-display">{value}</div>
      <div className="text-xs text-gray-500 mt-1">{label}</div>
    </div>
  );
}

function Info({
  label,
  value,
  mono,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div>
      <dt className="text-xs text-gray-500 mb-0.5">{label}</dt>
      <dd className={mono ? 'font-mono text-xs break-all' : 'text-sm'}>{value}</dd>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="text-start px-4 py-2.5 font-semibold">{children}</th>;
}
function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-4 py-2.5">{children}</td>;
}

function EmptyTab({ label }: { label: string }) {
  return <div className="p-8 text-center text-sm text-gray-500">{label}</div>;
}

function BanInlineForm({ studentId }: { studentId: string }) {
  return (
    <form
      action={banStudent}
      className="flex items-center gap-2"
      onSubmit={undefined /* native confirm via required reason field */}
    >
      <input type="hidden" name="id" value={studentId} />
      <input
        type="text"
        name="reason"
        placeholder="سبب الحظر (مطلوب)"
        required
        minLength={3}
        className="h-9 px-3 rounded-lg border border-gray-200 bg-white text-sm w-48"
      />
      <Button type="submit" variant="outline" size="sm" className="text-red-600 border-red-200 hover:bg-red-50">
        <Ban className="w-4 h-4" />
        حظر
      </Button>
    </form>
  );
}

function NotesCard({ studentId, initialNotes }: { studentId: string; initialNotes: string }) {
  return (
    <form action={saveStudentNotes} className="bg-white border border-gray-200 rounded-2xl p-6">
      <h3 className="font-bold mb-3 flex items-center gap-2">
        <StickyNote className="w-5 h-5 text-amber-500" />
        ملاحظات داخلية
      </h3>
      <p className="text-xs text-gray-500 mb-3">
        ملاحظات يراها المديرون فقط. لا تُعرض للطالب.
      </p>
      <input type="hidden" name="id" value={studentId} />
      <textarea
        name="notes"
        defaultValue={initialNotes}
        rows={4}
        className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        placeholder="مثال: عميل VIP، تم منحه شهر مجاني، شكاوى متكررة..."
      />
      <div className="mt-3">
        <Button type="submit" variant="outline" size="sm">
          حفظ الملاحظات
        </Button>
      </div>
    </form>
  );
}

function SuccessBanner({ code }: { code: string }) {
  const messages: Record<string, string> = {
    banned: 'تم حظر الحساب وإنهاء كل الجلسات.',
    unbanned: 'تم رفع الحظر عن الحساب.',
    role_changed: 'تم تغيير الدور بنجاح.',
    reset_sent: 'تم إرسال إيميل إعادة تعيين كلمة السر.',
    sessions_revoked: 'تم إنهاء كل جلسات الطالب.',
  };
  const msg = messages[code] || 'تم.';
  return (
    <div className="mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm flex items-center gap-2">
      <CheckCircle2 className="w-4 h-4" />
      {msg}
    </div>
  );
}

function maskPhone(phone: string): string {
  if (phone.length <= 4) return phone;
  return phone.slice(0, 4) + ' ××× ××× ' + phone.slice(-4);
}
