import Link from 'next/link';
import { createServiceClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/admin-guard';
import { PERSONALITY_TYPES, getType } from '@/lib/personality/personality-types';
import { Mail, MessageCircle, Inbox, Users2 } from 'lucide-react';

export const metadata = {
  title: 'عملاء اختبار الشخصية — إدارة فاهم!',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default async function PersonalityLeadsPage() {
  await requireAdmin();
  const service = createServiceClient();

  const [{ data: leads, count }, { data: byType }] = await Promise.all([
    service
      .from('personality_leads')
      .select(
        'id, created_at, name, whatsapp, email, type_code, primary_course_slug, also_explore_slugs, utm_source, utm_campaign',
        { count: 'exact' }
      )
      .order('created_at', { ascending: false })
      .limit(500),
    service.from('personality_leads').select('type_code'),
  ]);

  const typeCounts = (byType || []).reduce<Record<string, number>>(
    (acc, row: any) => {
      acc[row.type_code] = (acc[row.type_code] || 0) + 1;
      return acc;
    },
    {}
  );

  return (
    <div className="p-6 lg:p-8 max-w-7xl">
      <div className="mb-6 flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-display text-3xl font-bold flex items-center gap-2">
            <Users2 className="w-6 h-6 text-indigo-500" />
            عملاء اختبار الشخصية
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            كل واحد كمّل اختبار <Link href="/personality" className="text-indigo-600 underline">/personality</Link> ونوع شخصيته اللي طلع.
          </p>
        </div>
        <span className="text-sm bg-gray-100 text-gray-700 px-3 py-1.5 rounded-full font-medium">
          {count ?? 0} عميل محتمل
        </span>
      </div>

      {/* Type distribution — 16 cards in a 4×4 grid on lg */}
      {Object.keys(typeCounts).length > 0 && (
        <section className="mb-6">
          <h2 className="font-bold text-sm mb-3">توزيع النتائج على 16 نمط</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2">
            {PERSONALITY_TYPES.map((t) => (
              <div
                key={t.code}
                className="rounded-xl border border-gray-200 bg-white p-2.5 text-center"
              >
                <div className="text-xl">{t.emoji}</div>
                <div className="text-[10px] text-gray-500 mt-0.5">{t.name_ar}</div>
                <div className="font-display text-lg font-bold" dir="ltr">
                  {typeCounts[t.code] || 0}
                </div>
                <div className="text-[9px] font-mono text-gray-400" dir="ltr">{t.code}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
        {leads && leads.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                <tr>
                  <th className="text-start px-4 py-2.5 font-semibold">الاسم / واتساب</th>
                  <th className="text-start px-4 py-2.5 font-semibold">النمط</th>
                  <th className="text-start px-4 py-2.5 font-semibold">الكورس الموصى به</th>
                  <th className="text-start px-4 py-2.5 font-semibold">المصدر</th>
                  <th className="text-start px-4 py-2.5 font-semibold">التاريخ</th>
                  <th className="text-start px-4 py-2.5 font-semibold">إجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {leads.map((lead: any) => {
                  const t = getType(lead.type_code);
                  const phoneIntl = lead.whatsapp.replace(/[^0-9]/g, '');
                  return (
                    <tr key={lead.id}>
                      <td className="px-4 py-3">
                        <div className="font-medium">{lead.name}</div>
                        <div className="text-xs text-gray-500" dir="ltr">{lead.whatsapp}</div>
                        {lead.email && (
                          <div className="text-xs text-gray-400 mt-0.5" dir="ltr">{lead.email}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-700">
                          {t?.emoji} {t?.name_ar || lead.type_code}
                        </span>
                        <div className="text-[10px] text-gray-400 mt-1 font-mono" dir="ltr">
                          {lead.type_code}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {lead.primary_course_slug ? (
                          <Link
                            href={`/course/${lead.primary_course_slug}`}
                            target="_blank"
                            className="text-indigo-600 underline hover:no-underline"
                          >
                            {lead.primary_course_slug}
                          </Link>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {lead.utm_source ? (
                          <>
                            <div>{lead.utm_source}</div>
                            {lead.utm_campaign && (
                              <div className="text-[10px] text-gray-400">
                                {lead.utm_campaign}
                              </div>
                            )}
                          </>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                        {new Date(lead.created_at).toLocaleString('ar-EG')}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <div className="flex items-center gap-2 flex-wrap">
                          <a
                            href={`https://wa.me/${phoneIntl}?text=${encodeURIComponent(
                              `أهلاً ${lead.name}! نمط شخصيتك (${lead.type_code}) فيه نقط قوة قوية. الكورس اللي بيناسبك: ${lead.primary_course_slug ?? ''}`
                            )}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-emerald-600 hover:underline"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                            واتساب
                          </a>
                          {lead.email && (
                            <a
                              href={`mailto:${lead.email}`}
                              className="inline-flex items-center gap-1 text-indigo-600 hover:underline"
                            >
                              <Mail className="w-3.5 h-3.5" />
                              إيميل
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center text-sm text-gray-500">
            <Inbox className="w-10 h-10 mx-auto mb-3 text-gray-300" />
            لسه ما حدش كمّل الاختبار. شارك الرابط:{' '}
            <Link href="/personality" className="text-indigo-600 underline">
              /personality
            </Link>
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
