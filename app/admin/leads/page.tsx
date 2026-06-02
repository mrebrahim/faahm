import Link from 'next/link';
import { createServiceClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/admin-guard';
import { Mail, MessageCircle, Inbox } from 'lucide-react';

export const metadata = {
  title: 'بريد العملاء المحتملين — إدارة فاهم!',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

const SOURCE_LABELS: Record<string, string> = {
  homepage_zaka_live: 'الصفحة الرئيسية — ذكاء لايف',
  unknown: 'مصدر غير محدد',
};

export default async function LeadsPage() {
  await requireAdmin();
  const service = createServiceClient();

  const [{ data: leads, count }, { data: bySource }] = await Promise.all([
    service
      .from('leads')
      .select(
        'id, email, source, ip, user_agent, referer, contacted_at, created_at',
        { count: 'exact' }
      )
      .order('created_at', { ascending: false })
      .limit(500),
    service.from('leads').select('source'),
  ]);

  const sourceCounts = (bySource || []).reduce<Record<string, number>>((acc, row: any) => {
    acc[row.source] = (acc[row.source] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="p-6 lg:p-8 max-w-6xl">
      <div className="mb-6 flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-display text-3xl font-bold">بريد العملاء المحتملين</h1>
          <p className="text-sm text-gray-500 mt-1">
            كل الإيميلات اللي اتسجّلت من نماذج الـ Marketing على الموقع.
          </p>
        </div>
        <span className="text-sm bg-gray-100 text-gray-700 px-3 py-1.5 rounded-full font-medium">
          {count ?? 0} إيميل
        </span>
      </div>

      {/* Source breakdown */}
      {Object.keys(sourceCounts).length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {Object.entries(sourceCounts)
            .sort((a, b) => b[1] - a[1])
            .map(([source, n]) => (
              <div
                key={source}
                className="rounded-xl border border-gray-200 bg-white p-3"
              >
                <div className="text-xs text-gray-500 truncate">
                  {SOURCE_LABELS[source] ?? source}
                </div>
                <div className="font-display text-xl font-bold mt-1" dir="ltr">
                  {n}
                </div>
              </div>
            ))}
        </div>
      )}

      {/* Table */}
      <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
        {leads && leads.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                <tr>
                  <th className="text-start px-4 py-2.5 font-semibold">البريد الإلكتروني</th>
                  <th className="text-start px-4 py-2.5 font-semibold">المصدر</th>
                  <th className="text-start px-4 py-2.5 font-semibold">التاريخ</th>
                  <th className="text-start px-4 py-2.5 font-semibold">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {leads.map((lead: any) => (
                  <tr key={lead.id}>
                    <td className="px-4 py-3" dir="ltr">
                      <a
                        href={`mailto:${lead.email}`}
                        className="text-brand-600 hover:underline font-medium"
                      >
                        {lead.email}
                      </a>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <span className="inline-block px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-700">
                        {SOURCE_LABELS[lead.source] ?? lead.source}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                      {new Date(lead.created_at).toLocaleString('ar-EG')}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <div className="flex items-center gap-2">
                        <a
                          href={`mailto:${lead.email}`}
                          className="inline-flex items-center gap-1 text-brand-600 hover:underline"
                          title="إيميل"
                        >
                          <Mail className="w-3.5 h-3.5" />
                          إيميل
                        </a>
                        <a
                          href={`https://wa.me/?text=${encodeURIComponent(
                            'أهلاً، شكراً لتسجيل اهتمامك في فاهم!'
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-emerald-600 hover:underline"
                          title="واتساب"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          واتساب
                        </a>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center text-sm text-gray-500">
            <Inbox className="w-10 h-10 mx-auto mb-3 text-gray-300" />
            لسه ما حدش سجّل اهتمامه. النماذج المتاحة:{' '}
            <Link href="/" className="text-brand-600 underline">
              ذكاء لايف
            </Link>
            .
          </div>
        )}
      </div>

      {count && count > 500 ? (
        <p className="text-xs text-gray-400 mt-3 text-center">
          عرض آخر 500 سجل من إجمالي {count}.
        </p>
      ) : null}
    </div>
  );
}
