import Link from 'next/link';
import { createServiceClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/admin-guard';
import { archetypeById, ARCHETYPES } from '@/lib/career/archetypes';
import { Mail, MessageCircle, Inbox, Sparkles } from 'lucide-react';

export const metadata = {
  title: 'عملاء التيست المهني — إدارة فاهم!',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default async function CareerLeadsPage() {
  await requireAdmin();
  const service = createServiceClient();

  const [{ data: leads, count }, { data: byArchetype }, { data: byCourse }] =
    await Promise.all([
      service
        .from('career_leads')
        .select(
          'id, created_at, name, whatsapp, email, archetype, top_codes, primary_course_slug, also_explore_slugs, contacted_at, utm_source, utm_campaign',
          { count: 'exact' }
        )
        .order('created_at', { ascending: false })
        .limit(500),
      service.from('career_leads').select('archetype'),
      service.from('career_leads').select('primary_course_slug'),
    ]);

  const archetypeCounts = (byArchetype || []).reduce<Record<string, number>>(
    (acc, row: any) => {
      acc[row.archetype] = (acc[row.archetype] || 0) + 1;
      return acc;
    },
    {}
  );
  const courseCounts = (byCourse || []).reduce<Record<string, number>>(
    (acc, row: any) => {
      const k = row.primary_course_slug || '—';
      acc[k] = (acc[k] || 0) + 1;
      return acc;
    },
    {}
  );

  return (
    <div className="p-6 lg:p-8 max-w-7xl">
      <div className="mb-6 flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-display text-3xl font-bold flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-brand-500" />
            عملاء التيست المهني
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            كل واحد كمّل تيست <Link href="/career" className="text-brand-600 underline">/career</Link> ودخل بياناته. اللي بترسلهم على واتساب أو إيميل تبعاً للنوع.
          </p>
        </div>
        <span className="text-sm bg-gray-100 text-gray-700 px-3 py-1.5 rounded-full font-medium">
          {count ?? 0} عميل محتمل
        </span>
      </div>

      {/* Archetype breakdown */}
      {Object.keys(archetypeCounts).length > 0 && (
        <section className="mb-6">
          <h2 className="font-bold text-sm mb-3">توزيع النتائج بحسب الشخصية</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {ARCHETYPES.map((arc) => (
              <div key={arc.id} className="rounded-xl border border-gray-200 bg-white p-3">
                <div className="text-2xl">{arc.emoji}</div>
                <div className="text-xs text-gray-500 truncate mt-1">{arc.name_ar}</div>
                <div className="font-display text-xl font-bold" dir="ltr">
                  {archetypeCounts[arc.id] || 0}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Course recommendations breakdown */}
      {Object.keys(courseCounts).length > 0 && (
        <section className="mb-6 rounded-2xl border border-gray-200 bg-white p-5">
          <h2 className="font-bold text-sm mb-3">الكورس الموصى به (Top match)</h2>
          <ul className="space-y-2">
            {Object.entries(courseCounts)
              .sort((a, b) => b[1] - a[1])
              .map(([slug, n]) => (
                <li key={slug} className="flex items-center justify-between text-sm">
                  <span className="truncate">{slug}</span>
                  <span dir="ltr" className="font-mono text-gray-600">
                    {n}
                  </span>
                </li>
              ))}
          </ul>
        </section>
      )}

      {/* Table */}
      <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
        {leads && leads.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                <tr>
                  <th className="text-start px-4 py-2.5 font-semibold">الاسم / واتساب</th>
                  <th className="text-start px-4 py-2.5 font-semibold">النوع</th>
                  <th className="text-start px-4 py-2.5 font-semibold">الكورس الموصى به</th>
                  <th className="text-start px-4 py-2.5 font-semibold">المصدر</th>
                  <th className="text-start px-4 py-2.5 font-semibold">التاريخ</th>
                  <th className="text-start px-4 py-2.5 font-semibold">إجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {leads.map((lead: any) => {
                  const arc = archetypeById(lead.archetype);
                  const phoneIntl = lead.whatsapp.replace(/[^0-9]/g, '');
                  return (
                    <tr key={lead.id}>
                      <td className="px-4 py-3">
                        <div className="font-medium">{lead.name}</div>
                        <div className="text-xs text-gray-500" dir="ltr">
                          {lead.whatsapp}
                        </div>
                        {lead.email && (
                          <div className="text-xs text-gray-400 mt-0.5" dir="ltr">
                            {lead.email}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-700">
                          {arc?.emoji} {arc?.name_ar || lead.archetype}
                        </span>
                        <div className="text-[10px] text-gray-400 mt-1" dir="ltr">
                          {(lead.top_codes || []).join(' + ')}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {lead.primary_course_slug ? (
                          <Link
                            href={`/course/${lead.primary_course_slug}`}
                            target="_blank"
                            className="text-brand-600 underline hover:no-underline"
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
                              `أهلاً ${lead.name}! بناءً على نتيجة التيست، الكورس اللي يناسبك: ${lead.primary_course_slug ?? ''}`
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
                              className="inline-flex items-center gap-1 text-brand-600 hover:underline"
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
            لسه ما حدش كمّل التيست. شارك الرابط:{' '}
            <Link href="/career" className="text-brand-600 underline">
              /career
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
