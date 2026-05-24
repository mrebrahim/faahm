import Link from 'next/link';
import { createServiceClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/admin-guard';
import { auditLog } from '@/lib/admin-audit';
import {
  Shield,
  CheckCircle2,
  AlertTriangle,
  Search,
  Filter,
  Download,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

export const metadata = {
  title: 'سجل المراجعة — لوحة الإدارة',
  robots: { index: false, follow: false },
};

const PAGE_SIZE = 50;

const ACTION_LABELS: Record<string, string> = {
  'course.create': 'إنشاء كورس',
  'course.update': 'تعديل كورس',
  'course.publish': 'نشر كورس',
  'course.unpublish': 'إخفاء كورس',
  'course.delete': 'حذف كورس',
  'chapter.create': 'إنشاء قسم',
  'chapter.delete': 'حذف قسم',
  'lesson.create': 'إضافة درس',
  'lesson.delete': 'حذف درس',
  'lesson.set_free_preview': 'تغيير حالة المعاينة',
  'admin.access_denied': 'محاولة دخول مرفوضة',
  'auth.blocked_user_attempt': 'محاولة دخول من حساب محظور',
  'audit_log.viewed': 'عرض سجل المراجعة',
  'audit_log.exported': 'تصدير سجل المراجعة',
  'admin.page_view': 'فتح صفحة',
};

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: { action?: string; result?: string; user?: string; q?: string; page?: string };
}) {
  const ctx = await requireAdmin();

  // Record that the admin opened the log (per PRD §10.5: log views).
  void auditLog(ctx, { action: 'audit_log.viewed' });

  const page = Math.max(1, parseInt(searchParams.page || '1', 10));
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const service = createServiceClient();
  let query = service
    .from('admin_audit_log')
    .select(
      'id, user_id, user_email, user_role, action, resource_type, resource_id, path, result, error_message, ip, country, user_agent, metadata, created_at',
      { count: 'exact' }
    )
    .order('created_at', { ascending: false });

  if (searchParams.action) query = query.eq('action', searchParams.action);
  if (searchParams.result === 'success' || searchParams.result === 'failure') {
    query = query.eq('result', searchParams.result);
  }
  if (searchParams.user) {
    const u = searchParams.user.toLowerCase();
    query = query.ilike('user_email', `%${u}%`);
  }
  if (searchParams.q) {
    const q = searchParams.q.replace(/[%_]/g, '');
    query = query.or(
      `action.ilike.%${q}%,user_email.ilike.%${q}%,ip.ilike.%${q}%,path.ilike.%${q}%`
    );
  }

  const { data: rows, count } = await query.range(from, to);

  // Distinct action values for the filter dropdown.
  const { data: distinctActions } = await service
    .from('admin_audit_log')
    .select('action')
    .order('action')
    .limit(200);
  const actionOptions = Array.from(new Set((distinctActions || []).map((r) => r.action))).sort();

  const totalPages = count ? Math.ceil(count / PAGE_SIZE) : 1;

  return (
    <div className="p-8 max-w-7xl">
      <div className="flex items-center justify-between mb-8 gap-3 flex-wrap">
        <div>
          <h1 className="font-display text-3xl font-bold flex items-center gap-2">
            <Shield className="w-7 h-7 text-brand-500" />
            سجل المراجعة
          </h1>
          <p className="text-gray-500 mt-1">
            كل العمليات الإدارية مسجّلة بترتيب زمني. السجل غير قابل للتعديل أو الحذف.
          </p>
        </div>
        <a
          href={`/api/admin/audit-log/export?${new URLSearchParams(
            Object.entries(searchParams).filter(([, v]) => Boolean(v)) as [string, string][]
          ).toString()}`}
          className="inline-flex items-center gap-2 px-4 h-10 rounded-lg border border-gray-200 bg-white text-sm font-medium hover:bg-gray-50"
        >
          <Download className="w-4 h-4" />
          تصدير CSV
        </a>
      </div>

      {/* Filters */}
      <form className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-3 p-4 rounded-2xl bg-white border border-gray-200">
        <label className="block text-sm">
          <span className="block text-xs text-gray-500 mb-1">الإجراء</span>
          <select
            name="action"
            defaultValue={searchParams.action || ''}
            className="w-full h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm"
          >
            <option value="">الكل</option>
            {actionOptions.map((a) => (
              <option key={a} value={a}>
                {ACTION_LABELS[a] || a}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="block text-xs text-gray-500 mb-1">النتيجة</span>
          <select
            name="result"
            defaultValue={searchParams.result || ''}
            className="w-full h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm"
          >
            <option value="">الكل</option>
            <option value="success">ناجح</option>
            <option value="failure">فاشل</option>
          </select>
        </label>
        <label className="block text-sm">
          <span className="block text-xs text-gray-500 mb-1">إيميل المستخدم</span>
          <input
            type="text"
            name="user"
            defaultValue={searchParams.user || ''}
            placeholder="user@example.com"
            dir="ltr"
            className="w-full h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm text-left"
          />
        </label>
        <label className="block text-sm">
          <span className="block text-xs text-gray-500 mb-1">بحث</span>
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              type="search"
              name="q"
              defaultValue={searchParams.q || ''}
              placeholder="IP، مسار، إجراء..."
              className="w-full h-10 pr-10 pl-3 rounded-lg border border-gray-200 bg-white text-sm"
            />
          </div>
        </label>
        <div className="md:col-span-4 flex items-center gap-2">
          <button
            type="submit"
            className="inline-flex items-center gap-2 px-4 h-10 rounded-lg bg-brand-500 text-white text-sm font-medium hover:bg-brand-600"
          >
            <Filter className="w-4 h-4" />
            تطبيق الفلاتر
          </button>
          {(searchParams.action || searchParams.result || searchParams.user || searchParams.q) && (
            <Link
              href="/admin/audit-log"
              className="inline-flex items-center px-4 h-10 rounded-lg border border-gray-200 text-sm hover:bg-gray-50"
            >
              مسح الفلاتر
            </Link>
          )}
          <div className="ms-auto text-xs text-gray-500">
            النتائج: {count?.toLocaleString('ar-EG') || 0}
          </div>
        </div>
      </form>

      {/* Rows */}
      <div className="rounded-2xl bg-white border border-gray-200 overflow-hidden">
        {rows && rows.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wider">
                <tr>
                  <th className="text-start px-4 py-3 font-semibold">الوقت</th>
                  <th className="text-start px-4 py-3 font-semibold">المستخدم</th>
                  <th className="text-start px-4 py-3 font-semibold">الإجراء</th>
                  <th className="text-start px-4 py-3 font-semibold">المورد</th>
                  <th className="text-start px-4 py-3 font-semibold">الحالة</th>
                  <th className="text-start px-4 py-3 font-semibold">IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((r: any) => {
                  const ok = r.result !== 'failure';
                  return (
                    <tr key={r.id} className="hover:bg-gray-50 align-top">
                      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap" dir="ltr">
                        {new Date(r.created_at).toISOString().replace('T', ' ').slice(0, 19)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-xs" dir="ltr">
                          {r.user_email || r.user_id?.slice(0, 8) || '—'}
                        </div>
                        {r.user_role && (
                          <div className="text-[10px] text-gray-500 uppercase mt-0.5">
                            {r.user_role}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium">
                          {ACTION_LABELS[r.action] || r.action}
                        </div>
                        <div className="text-[10px] text-gray-400 mt-0.5" dir="ltr">
                          {r.action}
                        </div>
                        {r.error_message && (
                          <div className="text-[11px] text-red-600 mt-1 max-w-md truncate">
                            {r.error_message}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {r.resource_type ? (
                          <>
                            <div className="text-gray-600">{r.resource_type}</div>
                            {r.resource_id && (
                              <div className="text-[10px] text-gray-400 font-mono" dir="ltr">
                                {r.resource_id.slice(0, 8)}…
                              </div>
                            )}
                          </>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {ok ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                            <CheckCircle2 className="w-3 h-3" />
                            ناجح
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-50 text-red-700">
                            <AlertTriangle className="w-3 h-3" />
                            فاشل
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <div className="font-mono" dir="ltr">
                          {r.ip || '—'}
                        </div>
                        {r.country && (
                          <div className="text-[10px] text-gray-500 mt-0.5" dir="ltr">
                            {r.country}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center text-gray-500">
            <Shield className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="text-sm">لا توجد أحداث مطابقة للفلاتر الحالية.</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-2">
          <Link
            aria-disabled={page <= 1}
            href={`/admin/audit-log?${new URLSearchParams({
              ...Object.fromEntries(
                Object.entries(searchParams).filter(([k]) => k !== 'page')
              ),
              page: String(Math.max(1, page - 1)),
            }).toString()}`}
            className={`inline-flex items-center gap-1 px-3 h-9 rounded-lg border border-gray-200 text-sm ${
              page <= 1 ? 'opacity-40 pointer-events-none' : 'hover:bg-gray-50'
            }`}
          >
            <ChevronRight className="w-4 h-4" />
            السابق
          </Link>
          <span className="text-xs text-gray-500 px-3">
            صفحة {page} من {totalPages}
          </span>
          <Link
            aria-disabled={page >= totalPages}
            href={`/admin/audit-log?${new URLSearchParams({
              ...Object.fromEntries(
                Object.entries(searchParams).filter(([k]) => k !== 'page')
              ),
              page: String(Math.min(totalPages, page + 1)),
            }).toString()}`}
            className={`inline-flex items-center gap-1 px-3 h-9 rounded-lg border border-gray-200 text-sm ${
              page >= totalPages ? 'opacity-40 pointer-events-none' : 'hover:bg-gray-50'
            }`}
          >
            التالي
            <ChevronLeft className="w-4 h-4" />
          </Link>
        </div>
      )}
    </div>
  );
}
