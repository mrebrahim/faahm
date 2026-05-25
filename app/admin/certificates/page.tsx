import Link from 'next/link';
import { createServiceClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/admin-guard';
import { auditLog } from '@/lib/admin-audit';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Award, Search, Plus, CheckCircle2, XCircle } from 'lucide-react';

export const metadata = { title: 'الشهادات — إدارة فاهم!' };

type SearchParams = {
  q?: string;
  status?: string;
  page?: string;
  success?: string;
};

const PAGE_SIZE = 50;

export default async function CertificatesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const ctx = await requireAdmin();
  void auditLog(ctx, {
    action: 'certificates.list_viewed',
    metadata: { filters: searchParams },
  });
  const service = createServiceClient();

  const page = Math.max(1, parseInt(searchParams.page || '1', 10) || 1);
  const offset = (page - 1) * PAGE_SIZE;

  // KPI counts (cheap aggregates).
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const [allCount, monthCount, revokedCount] = await Promise.all([
    service.from('certificates').select('id', { count: 'exact', head: true }),
    service
      .from('certificates')
      .select('id', { count: 'exact', head: true })
      .gte('issued_at', startOfMonth)
      .eq('is_revoked', false),
    service
      .from('certificates')
      .select('id', { count: 'exact', head: true })
      .eq('is_revoked', true),
  ]);

  let query = service
    .from('v_certificates_admin')
    .select('*', { count: 'exact' })
    .order('issued_at', { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1);

  if (searchParams.status === 'valid') query = query.eq('is_revoked', false);
  else if (searchParams.status === 'revoked') query = query.eq('is_revoked', true);

  const q = (searchParams.q || '').trim().replace(/[%_,]/g, '');
  if (q.length >= 3) {
    if (/^FH-/i.test(q)) {
      query = query.ilike('certificate_number', `%${q}%`);
    } else {
      query = query.or(
        `student_name.ilike.%${q}%,course_title.ilike.%${q}%,user_email.ilike.%${q}%`
      );
    }
  }

  const { data: certs, count } = await query;
  const totalPages = Math.max(1, Math.ceil((count || 0) / PAGE_SIZE));

  const buildHref = (patch: Partial<SearchParams>) => {
    const next = { ...searchParams, ...patch };
    const params = new URLSearchParams();
    Object.entries(next).forEach(([k, v]) => {
      if (v && k !== 'success') params.set(k, String(v));
    });
    const qs = params.toString();
    return qs ? `/admin/certificates?${qs}` : '/admin/certificates';
  };

  return (
    <div className="p-6 lg:p-8 max-w-7xl">
      <div className="flex items-center justify-between gap-3 flex-wrap mb-6">
        <div>
          <h1 className="font-display text-3xl font-bold">الشهادات</h1>
          <p className="text-sm text-gray-500 mt-1">
            كل الشهادات المُصدَرة تلقائيًا أو يدويًا.
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/certificates/issue">
            <Plus className="w-4 h-4" />
            إصدار شهادة يدويًا
          </Link>
        </Button>
      </div>

      {searchParams.success && (
        <div className="mb-4 p-3 rounded-lg bg-brand-500/10 border border-brand-500/30 text-brand-700 text-sm">
          {searchParams.success === 'deleted'
            ? 'تم حذف الشهادة.'
            : searchParams.success === 'issued'
              ? 'تم إصدار الشهادة.'
              : 'تم.'}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
        <Kpi label="إجمالي مُصدَرة" value={String(allCount.count || 0)} />
        <Kpi label="هذا الشهر" value={String(monthCount.count || 0)} />
        <Kpi label="مسحوبة" value={String(revokedCount.count || 0)} />
      </div>

      <form className="mb-3">
        {searchParams.status && (
          <input type="hidden" name="status" value={searchParams.status} />
        )}
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            name="q"
            defaultValue={searchParams.q || ''}
            placeholder="بحث: اسم الطالب / رقم الشهادة / الكورس..."
            className="pr-10"
          />
        </div>
      </form>

      <div className="flex items-center flex-wrap gap-2 mb-4">
        {(['all', 'valid', 'revoked'] as const).map((s) => (
          <Link
            key={s}
            href={buildHref({ status: s === 'all' ? undefined : s, page: undefined })}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              (searchParams.status || 'all') === s
                ? 'bg-brand-500 text-white border-brand-500'
                : 'bg-white text-gray-700 border-gray-200 hover:border-brand-500/40'
            }`}
          >
            {s === 'all' ? 'الكل' : s === 'valid' ? 'صالحة' : 'مسحوبة'}
          </Link>
        ))}
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 text-xs">
              <tr>
                <Th>الرقم</Th>
                <Th>الطالب</Th>
                <Th>الكورس</Th>
                <Th>النتيجة</Th>
                <Th>تاريخ الإصدار</Th>
                <Th>الحالة</Th>
                <Th>{''}</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(certs || []).map((c: any) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <Td>
                    <Link
                      href={`/verify/${c.certificate_number}`}
                      target="_blank"
                      className="text-xs font-mono bg-gray-100 px-2 py-0.5 rounded hover:bg-gray-200"
                      dir="ltr"
                    >
                      {c.certificate_number}
                    </Link>
                  </Td>
                  <Td>
                    <div className="font-medium truncate max-w-[200px]">
                      {c.student_name}
                    </div>
                    {c.user_email && (
                      <div className="text-xs text-gray-500 truncate max-w-[200px]" dir="ltr">
                        {c.user_email}
                      </div>
                    )}
                  </Td>
                  <Td className="max-w-[220px] truncate">{c.course_title}</Td>
                  <Td>
                    {typeof c.score_percent === 'number' ? (
                      <span dir="ltr" className="font-bold">
                        {c.score_percent}%
                      </span>
                    ) : (
                      '—'
                    )}
                  </Td>
                  <Td>
                    <span dir="ltr" className="text-xs text-gray-700 whitespace-nowrap">
                      {new Date(c.issued_at).toLocaleDateString('ar-EG', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </Td>
                  <Td>
                    {c.is_revoked ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-rose-50 text-rose-700">
                        <XCircle className="w-3 h-3" /> مسحوبة
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-emerald-50 text-emerald-700">
                        <CheckCircle2 className="w-3 h-3" /> صالحة
                      </span>
                    )}
                  </Td>
                  <Td>
                    <Button asChild variant="ghost" size="sm">
                      <Link href={`/admin/certificates/${c.id}`}>تفاصيل</Link>
                    </Button>
                  </Td>
                </tr>
              ))}
              {(!certs || certs.length === 0) && (
                <tr>
                  <td colSpan={7} className="text-center py-16 text-sm text-gray-500">
                    <Award className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                    لسه ما فيش شهادات بالفلاتر دي.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="text-gray-500">
            صفحة <span dir="ltr">{page} / {totalPages}</span> ·{' '}
            <span dir="ltr">{count || 0}</span> شهادة
          </span>
          <div className="flex items-center gap-2">
            {page > 1 && (
              <Button asChild variant="outline" size="sm">
                <Link href={buildHref({ page: String(page - 1) })}>السابق</Link>
              </Button>
            )}
            {page < totalPages && (
              <Button asChild variant="outline" size="sm">
                <Link href={buildHref({ page: String(page + 1) })}>التالي</Link>
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div dir="ltr" className="font-display text-2xl font-bold">
        {value}
      </div>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th scope="col" className="text-right font-semibold px-4 py-3 whitespace-nowrap">
      {children}
    </th>
  );
}

function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-4 py-3 align-middle ${className || ''}`}>{children}</td>;
}
