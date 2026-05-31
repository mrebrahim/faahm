import Link from 'next/link';
import { createServiceClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/admin-guard';
import { auditLog } from '@/lib/admin-audit';
import { Button } from '@/components/ui/button';
import { DeleteStudentButton } from './delete-button';
import {
  Users,
  Search,
  Filter,
  Download,
  CircleCheck,
  CircleX,
  Ban,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  TrendingUp,
  GraduationCap,
  Mail,
} from 'lucide-react';

export const metadata = {
  title: 'الطلاب — لوحة الإدارة',
  robots: { index: false, follow: false },
};

const PAGE_SIZE = 50;

type SearchParams = {
  q?: string;
  sub?: string;       // active | trialing | past_due | cancelled | none
  role?: string;      // student | instructor | admin
  status?: string;    // active | banned
  since?: string;     // 7 | 30 | 90 (days)
  page?: string;
  sort?: string;      // joined_desc | joined_asc | last_login_desc | name_asc
  success?: string;   // deleted
  error?: string;
};

export default async function StudentsListPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const ctx = await requireAdmin();
  void auditLog(ctx, { action: 'student.list_viewed', metadata: { filters: searchParams } });

  const service = createServiceClient();
  const page = Math.max(1, parseInt(searchParams.page || '1', 10));
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  // Build query against the admin view (joins profiles + auth.users + sub + aggregates).
  let q = service.from('admin_students_v').select('*', { count: 'exact' });

  if (searchParams.q && searchParams.q.trim().length >= 2) {
    const term = searchParams.q.trim().replace(/[%_]/g, '');
    // Search across name, email, phone in one OR clause.
    q = q.or(
      `full_name.ilike.%${term}%,email.ilike.%${term}%,phone.ilike.%${term}%`
    );
  }
  if (searchParams.role && ['student', 'instructor', 'admin'].includes(searchParams.role)) {
    q = q.eq('role', searchParams.role);
  }
  if (searchParams.status === 'banned') {
    q = q.eq('is_blocked', true);
  } else if (searchParams.status === 'active') {
    q = q.eq('is_blocked', false);
  }
  if (searchParams.sub) {
    if (searchParams.sub === 'none') {
      q = q.is('subscription_status', null);
    } else if (
      ['active', 'trialing', 'past_due', 'cancelled', 'expired', 'paused'].includes(searchParams.sub)
    ) {
      q = q.eq('subscription_status', searchParams.sub);
    }
  }
  if (searchParams.since) {
    const days = parseInt(searchParams.since, 10);
    if (Number.isFinite(days) && days > 0) {
      const cutoff = new Date(Date.now() - days * 86_400_000).toISOString();
      q = q.gte('joined_at', cutoff);
    }
  }

  // Sort
  switch (searchParams.sort) {
    case 'joined_asc':
      q = q.order('joined_at', { ascending: true });
      break;
    case 'last_login_desc':
      q = q.order('last_sign_in_at', { ascending: false, nullsFirst: false });
      break;
    case 'name_asc':
      q = q.order('full_name', { ascending: true, nullsFirst: false });
      break;
    case 'joined_desc':
    default:
      q = q.order('joined_at', { ascending: false });
  }

  const { data: students, count } = await q.range(from, to);

  // Stats — separate aggregate queries (cheap at our scale).
  const [{ count: totalCount }, { count: activeSubCount }, { count: newThisWeekCount }, paidAgg] =
    await Promise.all([
      service.from('admin_students_v').select('*', { count: 'exact', head: true }),
      service
        .from('admin_students_v')
        .select('*', { count: 'exact', head: true })
        .eq('subscription_status', 'active'),
      service
        .from('admin_students_v')
        .select('*', { count: 'exact', head: true })
        .gte('joined_at', new Date(Date.now() - 7 * 86_400_000).toISOString()),
      service
        .from('admin_students_v')
        .select('subscription_plan')
        .eq('subscription_status', 'active'),
    ]);

  const mrrCents = (paidAgg.data || []).reduce((sum, row) => {
    // monthly = 500, yearly amortised = 4000/12 ≈ 334
    if (row.subscription_plan === 'monthly') return sum + 500;
    if (row.subscription_plan === 'yearly') return sum + Math.round(4000 / 12);
    return sum;
  }, 0);
  const conversion =
    totalCount && totalCount > 0
      ? ((activeSubCount || 0) / totalCount) * 100
      : 0;

  const totalPages = count ? Math.ceil(count / PAGE_SIZE) : 1;

  return (
    <div className="p-8 max-w-7xl">
      {searchParams.success === 'deleted' && (
        <div className="mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm">
          تم حذف الطالب نهائياً.
        </div>
      )}
      {searchParams.error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm">
          {decodeURIComponent(searchParams.error)}
        </div>
      )}
      {/* Header */}
      <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
        <div>
          <h1 className="font-display text-3xl font-bold flex items-center gap-2">
            <Users className="w-7 h-7 text-brand-500" />
            الطلاب
          </h1>
          <p className="text-gray-500 mt-1 text-sm">
            كل من سجّل في فاهم — بحث، فلترة، وإدارة الحسابات.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href="/admin/students/invite"
            className="inline-flex items-center gap-2 px-4 h-10 rounded-lg bg-brand-500 text-white text-sm font-semibold hover:bg-brand-600 shadow-lg shadow-brand-500/20"
          >
            <Mail className="w-4 h-4" />
            دعوة طالب
          </Link>
          <a
            href={`/api/admin/students/export?${buildQueryString(searchParams)}`}
            className="inline-flex items-center gap-2 px-4 h-10 rounded-lg border border-gray-200 bg-white text-sm font-medium hover:bg-gray-50"
          >
            <Download className="w-4 h-4" />
            تصدير CSV
          </a>
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard label="إجمالي المسجّلين" value={(totalCount || 0).toLocaleString('ar-EG')} />
        <StatCard
          label="اشتراك نشط"
          value={(activeSubCount || 0).toLocaleString('ar-EG')}
          tone="brand"
        />
        <StatCard label="جديد آخر 7 أيام" value={(newThisWeekCount || 0).toLocaleString('ar-EG')} />
        <StatCard
          label="MRR تقديري"
          value={`$${(mrrCents / 100).toFixed(2)}`}
          tone="brand"
          sub={`${conversion.toFixed(1)}% تحويل`}
        />
      </div>

      {/* Search + filters */}
      <form className="mb-6 p-4 rounded-2xl bg-white border border-gray-200 space-y-3">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
          <input
            type="search"
            name="q"
            defaultValue={searchParams.q || ''}
            placeholder="ابحث بالاسم، الإيميل، أو رقم التليفون..."
            className="w-full h-11 pr-11 pl-4 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          <Select name="sub" defaultValue={searchParams.sub} label="الاشتراك">
            <option value="">الكل</option>
            <option value="active">نشط</option>
            <option value="trialing">تجريبي</option>
            <option value="past_due">متأخر</option>
            <option value="cancelled">ملغي</option>
            <option value="expired">منتهي</option>
            <option value="none">بلا اشتراك</option>
          </Select>
          <Select name="role" defaultValue={searchParams.role} label="الدور">
            <option value="">الكل</option>
            <option value="student">طالب</option>
            <option value="instructor">مدرّب</option>
            <option value="admin">مدير</option>
          </Select>
          <Select name="status" defaultValue={searchParams.status} label="الحالة">
            <option value="">الكل</option>
            <option value="active">نشط</option>
            <option value="banned">محظور</option>
          </Select>
          <Select name="since" defaultValue={searchParams.since} label="انضم خلال">
            <option value="">أي وقت</option>
            <option value="7">7 أيام</option>
            <option value="30">30 يوم</option>
            <option value="90">90 يوم</option>
          </Select>
          <Select name="sort" defaultValue={searchParams.sort} label="ترتيب">
            <option value="joined_desc">الأحدث تسجيلاً</option>
            <option value="joined_asc">الأقدم تسجيلاً</option>
            <option value="last_login_desc">آخر دخول</option>
            <option value="name_asc">الاسم (أ-ي)</option>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <Button type="submit" size="sm">
            <Filter className="w-4 h-4" />
            تطبيق
          </Button>
          {(searchParams.q ||
            searchParams.sub ||
            searchParams.role ||
            searchParams.status ||
            searchParams.since ||
            searchParams.sort) && (
            <Link
              href="/admin/students"
              className="inline-flex items-center px-3 h-9 rounded-lg border border-gray-200 text-sm hover:bg-gray-50"
            >
              مسح الفلاتر
            </Link>
          )}
          <span className="ms-auto text-xs text-gray-500">
            {(count || 0).toLocaleString('ar-EG')} نتيجة
          </span>
        </div>
      </form>

      {/* Table */}
      <div className="rounded-2xl bg-white border border-gray-200 overflow-hidden">
        {students && students.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wider">
                <tr>
                  <th className="text-start px-4 py-3 font-semibold">الاسم</th>
                  <th className="text-start px-4 py-3 font-semibold">الدور</th>
                  <th className="text-start px-4 py-3 font-semibold">الاشتراك</th>
                  <th className="text-start px-4 py-3 font-semibold">الدروس</th>
                  <th className="text-start px-4 py-3 font-semibold">الإنفاق</th>
                  <th className="text-start px-4 py-3 font-semibold">انضم</th>
                  <th className="text-start px-4 py-3 font-semibold">آخر دخول</th>
                  <th className="text-start px-4 py-3 font-semibold sr-only">إجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {students.map((s: any) => (
                  <tr key={s.id} className="hover:bg-gray-50 align-middle">
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/students/${s.id}`}
                        className="flex items-center gap-3 group"
                      >
                        <Avatar name={s.full_name || s.email || '?'} url={s.avatar_url} />
                        <div className="min-w-0">
                          <div className="font-medium truncate group-hover:text-brand-600">
                            {s.full_name || 'بدون اسم'}
                            {s.is_blocked && (
                              <span className="ms-2 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-red-50 text-red-700 text-[10px]">
                                <Ban className="w-3 h-3" /> محظور
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-gray-500 truncate" dir="ltr">
                            {s.email || '—'}
                          </div>
                        </div>
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <RoleBadge role={s.role} />
                    </td>
                    <td className="px-4 py-3">
                      <SubscriptionBadge
                        status={s.subscription_status}
                        plan={s.subscription_plan}
                        endsAt={s.subscription_ends_at}
                      />
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <div className="text-gray-900 font-medium">{s.lessons_completed || 0}</div>
                      <div className="text-gray-400 text-[10px]">
                        من {s.lessons_started || 0}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs font-medium" dir="ltr">
                      ${((s.total_spent_cents || 0) / 100).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                      {formatRelative(s.joined_at)}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                      {s.last_sign_in_at ? formatRelative(s.last_sign_in_at) : '—'}
                    </td>
                    <td className="px-4 py-3 text-end whitespace-nowrap">
                      <Link
                        href={`/admin/students/${s.id}?tab=enrollments`}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium text-brand-700 bg-brand-500/10 hover:bg-brand-500/20 transition-colors me-2"
                        title="تسجيل الطالب في كورس"
                      >
                        <GraduationCap className="w-3.5 h-3.5" />
                        تسجيل
                      </Link>
                      <Link
                        href={`/admin/students/${s.id}`}
                        className="text-brand-600 hover:text-brand-700 text-xs inline-flex items-center"
                      >
                        تفاصيل
                        <ArrowLeft className="inline w-3 h-3 ms-1" />
                      </Link>
                      {s.role === 'student' && (
                        <DeleteStudentButton id={s.id} email={s.email || ''} />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center text-gray-500">
            <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="text-sm">
              {searchParams.q ||
              searchParams.sub ||
              searchParams.role ||
              searchParams.status ||
              searchParams.since
                ? 'ما لقيناش طلاب بالفلاتر دي. جرّب تشيل بعض الفلاتر.'
                : 'لسه ما حدش سجّل. شارك رابط الموقع وابدأ الترويج.'}
            </p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-2">
          <PaginationLink
            page={page - 1}
            disabled={page <= 1}
            currentParams={searchParams}
            label="السابق"
            icon="prev"
          />
          <span className="text-xs text-gray-500 px-3">
            صفحة {page} من {totalPages}
          </span>
          <PaginationLink
            page={page + 1}
            disabled={page >= totalPages}
            currentParams={searchParams}
            label="التالي"
            icon="next"
          />
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Sub-components
// ============================================================================

function StatCard({
  label,
  value,
  sub,
  tone = 'neutral',
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: 'neutral' | 'brand';
}) {
  return (
    <div
      className={`p-5 rounded-2xl border ${
        tone === 'brand'
          ? 'bg-gradient-to-br from-brand-500/10 to-white border-brand-500/30'
          : 'bg-white border-gray-200'
      }`}
    >
      <div className="text-2xl font-extrabold font-display mb-1">{value}</div>
      <div className="text-xs text-gray-500">{label}</div>
      {sub && <div className="text-[10px] text-brand-600 mt-1">{sub}</div>}
    </div>
  );
}

function Select({
  name,
  label,
  defaultValue,
  children,
}: {
  name: string;
  label: string;
  defaultValue?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-sm">
      <span className="block text-xs text-gray-500 mb-1">{label}</span>
      <select
        name={name}
        defaultValue={defaultValue || ''}
        className="w-full h-10 px-3 rounded-lg border border-gray-200 bg-white text-sm"
      >
        {children}
      </select>
    </label>
  );
}

function Avatar({ name, url }: { name: string; url?: string | null }) {
  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={url} alt="" className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
    );
  }
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((s) => s[0])
    .join('')
    .toUpperCase();
  // Hash the name to a stable colour so avatars are visually distinct.
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  const hue = h % 360;
  return (
    <div
      className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
      style={{ background: `hsl(${hue}, 50%, 50%)` }}
    >
      {initials || '?'}
    </div>
  );
}

function RoleBadge({ role }: { role: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    student: { label: 'طالب', cls: 'bg-gray-100 text-gray-700' },
    instructor: { label: 'مدرّب', cls: 'bg-blue-50 text-blue-700' },
    admin: { label: 'مدير', cls: 'bg-brand-500/10 text-brand-700' },
  };
  const m = map[role] || { label: role, cls: 'bg-gray-100 text-gray-700' };
  return <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-medium ${m.cls}`}>{m.label}</span>;
}

function SubscriptionBadge({
  status,
  plan,
  endsAt,
}: {
  status: string | null;
  plan: string | null;
  endsAt: string | null;
}) {
  if (!status) {
    return <span className="text-xs text-gray-400">بلا اشتراك</span>;
  }
  const isActive = status === 'active' || status === 'trialing';
  const stillValid = endsAt ? new Date(endsAt) > new Date() : false;
  const ok = isActive && stillValid;
  return (
    <div className="text-xs">
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${
          ok ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-600'
        }`}
      >
        {ok ? <CircleCheck className="w-3 h-3" /> : <CircleX className="w-3 h-3" />}
        {plan === 'yearly' ? 'سنوي' : plan === 'monthly' ? 'شهري' : status}
      </span>
      {endsAt && (
        <div className="text-[10px] text-gray-400 mt-0.5" dir="ltr">
          {new Date(endsAt).toISOString().slice(0, 10)}
        </div>
      )}
    </div>
  );
}

function PaginationLink({
  page,
  disabled,
  currentParams,
  label,
  icon,
}: {
  page: number;
  disabled: boolean;
  currentParams: SearchParams;
  label: string;
  icon: 'prev' | 'next';
}) {
  const Icon = icon === 'prev' ? ChevronRight : ChevronLeft;
  const params = { ...currentParams, page: String(page) };
  return (
    <Link
      aria-disabled={disabled}
      href={`/admin/students?${buildQueryString(params)}`}
      className={`inline-flex items-center gap-1 px-3 h-9 rounded-lg border border-gray-200 text-sm ${
        disabled ? 'opacity-40 pointer-events-none' : 'hover:bg-gray-50'
      }`}
    >
      {icon === 'prev' && <Icon className="w-4 h-4" />}
      {label}
      {icon === 'next' && <Icon className="w-4 h-4" />}
    </Link>
  );
}

function buildQueryString(params: SearchParams): string {
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v) usp.set(k, String(v));
  }
  return usp.toString();
}

function formatRelative(iso: string | null): string {
  if (!iso) return '—';
  const diffMs = Date.now() - new Date(iso).getTime();
  const sec = Math.floor(diffMs / 1000);
  if (sec < 60) return 'الآن';
  const min = Math.floor(sec / 60);
  if (min < 60) return `منذ ${min} دقيقة`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `منذ ${hr} ساعة`;
  const days = Math.floor(hr / 24);
  if (days < 30) return `منذ ${days} يوم`;
  const months = Math.floor(days / 30);
  if (months < 12) return `منذ ${months} شهر`;
  const years = Math.floor(days / 365);
  return `منذ ${years} سنة`;
}
