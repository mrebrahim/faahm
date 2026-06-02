import Link from 'next/link';
import { createServiceClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/admin-guard';
import { archetypeById } from '@/lib/career/archetypes';
import { getType } from '@/lib/personality/personality-types';
import { getBand } from '@/lib/ai-readiness/bands';
import { getTheme as getSelfDiscoveryTheme } from '@/lib/self-discovery/themes';
import { Mail, MessageCircle, Inbox, Sparkles, Users2, Send, Bot, Heart } from 'lucide-react';

export const metadata = {
  title: 'العملاء المحتملين — إدارة فاهم!',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

type TestType = 'all' | 'career' | 'personality' | 'ai_readiness' | 'self_discovery' | 'newsletter';

const TYPE_LABELS: Record<Exclude<TestType, 'all'>, string> = {
  career: 'التيست المهني',
  personality: 'اختبار الشخصية',
  ai_readiness: 'جاهزية الـ AI',
  self_discovery: 'اكتشاف الذات',
  newsletter: 'النشرة البريدية',
};

const TYPE_BADGE_CLASS: Record<Exclude<TestType, 'all'>, string> = {
  career: 'bg-brand-500/10 text-brand-700',
  personality: 'bg-indigo-500/10 text-indigo-700',
  ai_readiness: 'bg-cyan-500/10 text-cyan-700',
  self_discovery: 'bg-rose-500/10 text-rose-700',
  newsletter: 'bg-amber-500/10 text-amber-700',
};

const TYPE_ICON: Record<Exclude<TestType, 'all'>, React.ComponentType<{ className?: string }>> = {
  career: Sparkles,
  personality: Users2,
  ai_readiness: Bot,
  self_discovery: Heart,
  newsletter: Send,
};

const SOURCE_LABELS: Record<string, string> = {
  homepage_zaka_live: 'الصفحة الرئيسية — ذكاء لايف',
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
        <span className="text-sm bg-gray-100 text-gray-700 px-3 py-1.5 rounded-full font-medium">
          {count ?? 0} {filter === 'all' ? 'إجمالي' : 'في الفلتر'}
        </span>
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
          href="/admin/leads?type=newsletter"
          active={filter === 'newsletter'}
          label={TYPE_LABELS.newsletter}
          count={totalsByType.newsletter || 0}
          icon={TYPE_ICON.newsletter}
          accent="amber"
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
  accent?: 'brand' | 'indigo' | 'cyan' | 'rose' | 'amber';
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
            : accent === 'amber'
              ? 'border-amber-500 bg-amber-500/10 text-amber-700'
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

  // Look up Arabic label for the result code per test.
  let resultLabel = '—';
  let resultEmoji: string | null = null;
  if (testType === 'career' && lead.result_code) {
    const arc = archetypeById(lead.result_code);
    if (arc) {
      resultLabel = arc.name_ar;
      resultEmoji = arc.emoji;
    } else {
      resultLabel = lead.result_code;
    }
  } else if (testType === 'personality' && lead.result_code) {
    const t = getType(lead.result_code);
    if (t) {
      resultLabel = `${t.name_ar} · ${lead.result_code}`;
      resultEmoji = t.emoji;
    } else {
      resultLabel = lead.result_code;
    }
  } else if (testType === 'ai_readiness' && lead.result_code) {
    const band = getBand(lead.result_code as any);
    resultLabel = band.name_ar.split('—')[0].trim();
    resultEmoji = band.emoji;
  } else if (testType === 'self_discovery' && lead.result_code) {
    // result_code carries the top themes as 'theme1+theme2+theme3'.
    const parts = (lead.result_code as string).split('+').filter(Boolean);
    const top = parts.map((p) => getSelfDiscoveryTheme(p as any));
    if (top.length) {
      resultLabel = top.map((t) => t.name_ar).join(' + ');
      resultEmoji = top[0].emoji;
    }
  }

  const sourceLabel =
    testType === 'newsletter'
      ? SOURCE_LABELS[lead.detail_source] ?? lead.detail_source ?? '—'
      : TYPE_LABELS[testType];

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
