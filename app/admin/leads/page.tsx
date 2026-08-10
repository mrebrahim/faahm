import Link from 'next/link';
import { createServiceClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/admin-guard';
import {
  describeLeadResult,
  describeLeadSource,
  TEST_TYPE_LABELS,
} from '@/lib/leads-labels';
import { Mail, MessageCircle, Inbox, Sparkles, Users2, Send, Bot, Heart, ListChecks, Zap, Briefcase, HeartHandshake, Download } from 'lucide-react';

export const metadata = {
  title: 'العملاء المحتملين — إدارة فاهم!',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

type TestType =
  | 'all'
  | 'career'
  | 'personality'
  | 'ai_readiness'
  | 'self_discovery'
  | 'ai_skills'
  | 'productivity'
  | 'entrepreneurship'
  | 'eq'
  | 'newsletter';

// Tab labels come from the shared map so the dashboard, the CSV export
// and any future surface all name a quiz the same way.
const TYPE_LABELS = TEST_TYPE_LABELS;

const TYPE_BADGE_CLASS: Record<Exclude<TestType, 'all'>, string> = {
  career: 'bg-brand-500/10 text-brand-700',
  personality: 'bg-indigo-500/10 text-indigo-700',
  ai_readiness: 'bg-cyan-500/10 text-cyan-700',
  self_discovery: 'bg-rose-500/10 text-rose-700',
  ai_skills: 'bg-violet-500/10 text-violet-700',
  productivity: 'bg-amber-500/10 text-amber-700',
  entrepreneurship: 'bg-emerald-700/10 text-emerald-800',
  eq: 'bg-pink-500/10 text-pink-700',
  newsletter: 'bg-orange-500/10 text-orange-700',
};

const TYPE_ICON: Record<Exclude<TestType, 'all'>, React.ComponentType<{ className?: string }>> = {
  career: Sparkles,
  personality: Users2,
  ai_readiness: Bot,
  self_discovery: Heart,
  ai_skills: ListChecks,
  productivity: Zap,
  entrepreneurship: Briefcase,
  eq: HeartHandshake,
  newsletter: Send,
};

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: { type?: string };
}) {
  await requireAdmin();
  const service = createServiceClient();
  const filter: TestType =
    searchParams.type === 'career' ||
    searchParams.type === 'personality' ||
    searchParams.type === 'ai_readiness' ||
    searchParams.type === 'self_discovery' ||
    searchParams.type === 'ai_skills' ||
    searchParams.type === 'productivity' ||
    searchParams.type === 'entrepreneurship' ||
    searchParams.type === 'eq' ||
    searchParams.type === 'newsletter'
      ? searchParams.type
      : 'all';

  const baseQuery = service
    .from('admin_leads_unified')
    .select(
      'id, test_type, detail_source, name, whatsapp, email, result_code, primary_course_slug, utm_source, utm_campaign, contacted_at, created_at',
      { count: 'exact' }
    )
    .order('created_at', { ascending: false })
    .limit(500);

  const filteredQuery =
    filter === 'all' ? baseQuery : baseQuery.eq('test_type', filter);

  // Counts per type for the tab badges — single round-trip via the same view.
  const [{ data: leads, count }, { data: byType }] = await Promise.all([
    filteredQuery,
    service.from('admin_leads_unified').select('test_type'),
  ]);

  const totalsByType = (byType || []).reduce<Record<string, number>>(
    (acc, row: any) => {
      acc[row.test_type] = (acc[row.test_type] || 0) + 1;
      return acc;
    },
    {}
  );
  const grandTotal = (byType || []).length;

  return (
    <div className="p-6 lg:p-8 max-w-7xl">
      <div className="mb-6 flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-display text-3xl font-bold flex items-center gap-2">
            <Inbox className="w-6 h-6 text-brand-500" />
            العملاء المحتملين
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            كل اللي سجّلوا بياناتهم على المنصة — من الاختبارات والنماذج. اختار
            الفلتر لتعرف كل اختبار جايب كام عميل.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm bg-gray-100 text-gray-700 px-3 py-1.5 rounded-full font-medium">
            {count ?? 0} {filter === 'all' ? 'إجمالي' : 'في الفلتر'}
          </span>
          <Link
            href={`/api/admin/leads/export${filter === 'all' ? '' : `?type=${filter}`}`}
            className="inline-flex items-center gap-1.5 text-sm border border-gray-300 hover:border-brand-500 hover:text-brand-700 px-3 py-1.5 rounded-lg font-medium transition-colors"
          >
            <Download className="w-4 h-4" />
            تصدير CSV
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        <TabLink href="/admin/leads" active={filter === 'all'} label="الكل" count={grandTotal} />
        <TabLink
          href="/admin/leads?type=career"
          active={filter === 'career'}
          label={TYPE_LABELS.career}
          count={totalsByType.career || 0}
          icon={TYPE_ICON.career}
          accent="brand"
        />
        <TabLink
          href="/admin/leads?type=personality"
          active={filter === 'personality'}
          label={TYPE_LABELS.personality}
          count={totalsByType.personality || 0}
          icon={TYPE_ICON.personality}
          accent="indigo"
        />
        <TabLink
          href="/admin/leads?type=ai_readiness"
          active={filter === 'ai_readiness'}
          label={TYPE_LABELS.ai_readiness}
          count={totalsByType.ai_readiness || 0}
          icon={TYPE_ICON.ai_readiness}
          accent="cyan"
        />
        <TabLink
          href="/admin/leads?type=self_discovery"
          active={filter === 'self_discovery'}
          label={TYPE_LABELS.self_discovery}
          count={totalsByType.self_discovery || 0}
          icon={TYPE_ICON.self_discovery}
          accent="rose"
        />
        <TabLink
          href="/admin/leads?type=ai_skills"
          active={filter === 'ai_skills'}
          label={TYPE_LABELS.ai_skills}
          count={totalsByType.ai_skills || 0}
          icon={TYPE_ICON.ai_skills}
          accent="violet"
        />
        <TabLink
          href="/admin/leads?type=productivity"
          active={filter === 'productivity'}
          label={TYPE_LABELS.productivity}
          count={totalsByType.productivity || 0}
          icon={TYPE_ICON.productivity}
          accent="amber"
        />
        <TabLink
          href="/admin/leads?type=entrepreneurship"
          active={filter === 'entrepreneurship'}
          label={TYPE_LABELS.entrepreneurship}
          count={totalsByType.entrepreneurship || 0}
          icon={TYPE_ICON.entrepreneurship}
          accent="emerald"
        />
        <TabLink
          href="/admin/leads?type=eq"
          active={filter === 'eq'}
          label={TYPE_LABELS.eq}
          count={totalsByType.eq || 0}
          icon={TYPE_ICON.eq}
          accent="pink"
        />
        <TabLink
          href="/admin/leads?type=newsletter"
          active={filter === 'newsletter'}
          label={TYPE_LABELS.newsletter}
          count={totalsByType.newsletter || 0}
          icon={TYPE_ICON.newsletter}
          accent="orange"
        />
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
        {leads && leads.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                <tr>
                  <th className="text-start px-4 py-2.5 font-semibold">العميل</th>
                  <th className="text-start px-4 py-2.5 font-semibold">الاختبار / المصدر</th>
                  <th className="text-start px-4 py-2.5 font-semibold">النتيجة</th>
                  <th className="text-start px-4 py-2.5 font-semibold">الكورس الموصى به</th>
                  <th className="text-start px-4 py-2.5 font-semibold">UTM</th>
                  <th className="text-start px-4 py-2.5 font-semibold">التاريخ</th>
                  <th className="text-start px-4 py-2.5 font-semibold">إجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {leads.map((lead: any) => (
                  <LeadRow key={`${lead.test_type}-${lead.id}`} lead={lead} />
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center text-sm text-gray-500">
            <Inbox className="w-10 h-10 mx-auto mb-3 text-gray-300" />
            مفيش عملاء في الفلتر ده.
          </div>
        )}
      </div>

      {count && count > 500 ? (
        <p className="text-xs text-gray-400 mt-3 text-center">
          عرض آخر 500 سجل من إجمالي {count} (مع الفلتر الحالي).
        </p>
      ) : null}
    </div>
  );
}

/* ============================================================================
   BITS
   ============================================================================ */

function TabLink({
  href,
  active,
  label,
  count,
  icon: Icon,
  accent,
}: {
  href: string;
  active: boolean;
  label: string;
  count: number;
  icon?: React.ComponentType<{ className?: string }>;
  accent?: 'brand' | 'indigo' | 'cyan' | 'rose' | 'violet' | 'amber' | 'orange' | 'emerald' | 'pink';
}) {
  const activeClass =
    accent === 'brand'
      ? 'border-brand-500 bg-brand-500/10 text-brand-700'
      : accent === 'indigo'
        ? 'border-indigo-500 bg-indigo-500/10 text-indigo-700'
        : accent === 'cyan'
          ? 'border-cyan-500 bg-cyan-500/10 text-cyan-700'
          : accent === 'rose'
            ? 'border-rose-500 bg-rose-500/10 text-rose-700'
            : accent === 'violet'
              ? 'border-violet-500 bg-violet-500/10 text-violet-700'
              : accent === 'amber'
                ? 'border-amber-500 bg-amber-500/10 text-amber-700'
                : accent === 'orange'
                  ? 'border-orange-500 bg-orange-500/10 text-orange-700'
                  : accent === 'emerald'
                    ? 'border-emerald-700 bg-emerald-700/10 text-emerald-800'
                    : accent === 'pink'
                      ? 'border-pink-500 bg-pink-500/10 text-pink-700'
                      : 'border-gray-700 bg-gray-100 text-gray-900';
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-full border-2 text-sm font-medium transition-colors ${
        active
          ? activeClass
          : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
      }`}
    >
      {Icon && <Icon className="w-3.5 h-3.5" />}
      {label}
      <span
        className={`text-[10px] font-bold rounded-full px-1.5 py-0.5 ${
          active ? 'bg-white/60' : 'bg-gray-100 text-gray-500'
        }`}
        dir="ltr"
      >
        {count}
      </span>
    </Link>
  );
}

function LeadRow({ lead }: { lead: any }) {
  const testType = lead.test_type as Exclude<TestType, 'all'>;
  const Icon = TYPE_ICON[testType];
  const phoneIntl = (lead.whatsapp || '').replace(/[^0-9]/g, '');

  // Decode result_code → Arabic label. Shared with the CSV export so the
  // sheet a marketer opens says exactly what this table says.
  const { label: resultLabel, emoji: resultEmoji } = describeLeadResult(
    testType,
    lead.result_code
  );
  const sourceLabel = describeLeadSource(testType, lead.detail_source);

  // WhatsApp pre-fill differs per test so the message lands with useful context.
  const waMsg =
    testType === 'career'
      ? `أهلاً ${lead.name || ''}! بناءً على نتيجة التيست المهني (${resultLabel})، الكورس اللي يناسبك: ${lead.primary_course_slug || ''}`
      : testType === 'personality'
        ? `أهلاً ${lead.name || ''}! نمط شخصيتك ${resultLabel} فيه نقط قوة قوية. الكورس اللي بيناسبك: ${lead.primary_course_slug || ''}`
        : testType === 'ai_readiness'
          ? `أهلاً ${lead.name || ''}! بناءً على نتيجة اختبار الجاهزية للـ AI (${resultLabel})، الخطوة الجاية: ${lead.primary_course_slug || ''}`
          : testType === 'self_discovery'
            ? `أهلاً ${lead.name || ''}! بروفايل شغفك طلع: ${resultLabel}. الكورس اللي يبدأ منه رحلتك: ${lead.primary_course_slug || ''}`
            : testType === 'ai_skills'
              ? `أهلاً ${lead.name || ''}! مستواك في الـ AI: ${resultLabel}. الكورس اللي تبدأ بيه: ${lead.primary_course_slug || ''}`
              : testType === 'productivity'
                ? `أهلاً ${lead.name || ''}! اللي بيوقّفك أكتر: ${resultLabel}. عندنا كورس مخصص يحل ده: ${lead.primary_course_slug || ''}`
                : testType === 'entrepreneurship'
                  ? `أهلاً ${lead.name || ''}! جاهزيتك للشغل الحر: ${resultLabel}. الكورس اللي يبني بها مسارك: ${lead.primary_course_slug || ''}`
                  : testType === 'eq'
                    ? `أهلاً ${lead.name || ''}! بروفايلك العاطفي: ${resultLabel}. أرشحلك تخد التيستات التانية كمان عشان نبني صورة كاملة.`
                    : `أهلاً!`;

  return (
    <tr>
      <td className="px-4 py-3">
        {lead.name ? (
          <>
            <div className="font-medium">{lead.name}</div>
            <div className="text-xs text-gray-500" dir="ltr">
              {lead.whatsapp}
            </div>
            {lead.email && (
              <div className="text-xs text-gray-400 mt-0.5" dir="ltr">
                {lead.email}
              </div>
            )}
          </>
        ) : (
          <div className="text-sm font-medium" dir="ltr">
            {lead.email}
          </div>
        )}
      </td>
      <td className="px-4 py-3 text-xs">
        <span
          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full ${TYPE_BADGE_CLASS[testType]}`}
        >
          <Icon className="w-3 h-3" />
          {sourceLabel}
        </span>
      </td>
      <td className="px-4 py-3 text-xs">
        {resultLabel === '—' ? (
          <span className="text-gray-400">—</span>
        ) : (
          <span className="inline-flex items-center gap-1">
            {resultEmoji && <span>{resultEmoji}</span>}
            {resultLabel}
          </span>
        )}
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
              <div className="text-[10px] text-gray-400">{lead.utm_campaign}</div>
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
          {phoneIntl && (
            <a
              href={`https://wa.me/${phoneIntl}?text=${encodeURIComponent(waMsg)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-emerald-600 hover:underline"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              واتساب
            </a>
          )}
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
}
