import Link from 'next/link';
import { createServiceClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/admin-guard';
import { auditLog } from '@/lib/admin-audit';
import { Button } from '@/components/ui/button';
import {
  Video,
  MessageCircle,
  Mail,
  CheckCircle2,
  Clock,
  XCircle,
  ExternalLink,
} from 'lucide-react';

export const metadata = {
  title: 'طلبات الدبلجة — إدارة فاهم!',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

const STATUS_LABELS: Record<string, string> = {
  paid: 'مدفوع',
  pending_payment: 'في انتظار الدفع',
  in_progress: 'قيد التنفيذ',
  delivered: 'اتسلم',
  cancelled: 'ملغى',
  refunded: 'مسترد',
};

type Filter = 'all' | 'paid' | 'pending_payment' | 'in_progress' | 'delivered';

export default async function AdminDubbingPage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  const ctx = await requireAdmin();
  void auditLog(ctx, {
    action: 'dubbing.list_viewed',
    metadata: { filters: searchParams },
  });

  const service = createServiceClient();

  const filter: Filter =
    searchParams.status === 'paid' ||
    searchParams.status === 'pending_payment' ||
    searchParams.status === 'in_progress' ||
    searchParams.status === 'delivered'
      ? searchParams.status
      : 'all';

  let query = service
    .from('dubbing_orders')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .limit(500);

  if (filter !== 'all') query = query.eq('status', filter);

  const [{ data: orders, count }, { data: allForCounts }, { data: paidForTotal }] =
    await Promise.all([
      query,
      service.from('dubbing_orders').select('status'),
      service.from('dubbing_orders').select('amount_usd').eq('status', 'paid'),
    ]);

  const totalsByStatus = (allForCounts || []).reduce<Record<string, number>>(
    (acc, row: any) => {
      acc[row.status] = (acc[row.status] || 0) + 1;
      return acc;
    },
    {}
  );
  const grandTotal = (allForCounts || []).length;
  const paidRevenueUsd =
    (paidForTotal || []).reduce(
      (acc: number, row: any) => acc + Number(row.amount_usd || 0),
      0
    ) || 0;

  return (
    <div className="p-6 lg:p-8 max-w-7xl">
      <div className="mb-6 flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-display text-3xl font-bold flex items-center gap-2">
            <Video className="w-6 h-6 text-brand-500" />
            طلبات دبلجة الفيديوهات
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            كل اللي طلبوا خدمة دبلجة الفيديوهات — بياناتهم، لينكات الفيديوهات،
            اللغات، والمبلغ المدفوع.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-full font-medium" dir="ltr">
            ${paidRevenueUsd.toFixed(2)} إيرادات مدفوعة
          </span>
        </div>
      </div>

      {/* Status tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        <TabLink
          href="/admin/dubbing"
          active={filter === 'all'}
          label="الكل"
          count={grandTotal}
        />
        <TabLink
          href="/admin/dubbing?status=paid"
          active={filter === 'paid'}
          label={STATUS_LABELS.paid}
          count={totalsByStatus.paid || 0}
          accent="emerald"
        />
        <TabLink
          href="/admin/dubbing?status=pending_payment"
          active={filter === 'pending_payment'}
          label={STATUS_LABELS.pending_payment}
          count={totalsByStatus.pending_payment || 0}
          accent="amber"
        />
        <TabLink
          href="/admin/dubbing?status=in_progress"
          active={filter === 'in_progress'}
          label={STATUS_LABELS.in_progress}
          count={totalsByStatus.in_progress || 0}
          accent="brand"
        />
        <TabLink
          href="/admin/dubbing?status=delivered"
          active={filter === 'delivered'}
          label={STATUS_LABELS.delivered}
          count={totalsByStatus.delivered || 0}
          accent="gray"
        />
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
        {orders && orders.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                <tr>
                  <Th>العميل</Th>
                  <Th>اللغات</Th>
                  <Th>الدقايق / الفيديوهات</Th>
                  <Th>المبلغ</Th>
                  <Th>الحالة</Th>
                  <Th>التاريخ</Th>
                  <Th>إجراء</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {orders.map((o: any) => (
                  <OrderRow key={o.id} order={o} />
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center text-sm text-gray-500">
            <Video className="w-10 h-10 mx-auto mb-3 text-gray-300" />
            مفيش طلبات في الفلتر ده.
          </div>
        )}
      </div>

      {count && count > 500 ? (
        <p className="text-xs text-gray-400 mt-3 text-center">
          عرض آخر 500 طلب من إجمالي {count} (مع الفلتر الحالي).
        </p>
      ) : null}
    </div>
  );
}

function OrderRow({ order }: { order: any }) {
  const phoneIntl = String(order.whatsapp || '').replace(/[^0-9]/g, '');
  const langPair = [order.source_lang, order.target_lang]
    .filter(Boolean)
    .join(' → ') || '—';
  const waMsg = `أهلاً ${order.name || ''}! بخصوص طلب الدبلجة اللي عملته على faahm.com — إحنا بنشتغل عليه دلوقتي.`;

  return (
    <tr className="hover:bg-gray-50">
      <Td>
        <div className="font-medium">{order.name || '—'}</div>
        {order.email && (
          <div className="text-xs text-gray-500 mt-0.5 truncate max-w-[200px]" dir="ltr">
            {order.email}
          </div>
        )}
        {order.whatsapp && (
          <div className="text-xs text-gray-400" dir="ltr">
            {order.whatsapp}
          </div>
        )}
      </Td>
      <Td>
        <div className="text-xs">{langPair}</div>
        {order.dialect && (
          <div className="text-[10px] text-gray-400">اللهجة: {order.dialect}</div>
        )}
      </Td>
      <Td>
        <div className="text-xs" dir="ltr">
          <span className="font-bold">{order.minutes || 0}</span> min
        </div>
        <div className="text-[10px] text-gray-400" dir="ltr">
          {order.video_count || 0} video{Number(order.video_count) === 1 ? '' : 's'}
        </div>
      </Td>
      <Td>
        <span className="font-bold text-emerald-700" dir="ltr">
          ${Number(order.amount_usd || 0).toFixed(2)}
        </span>
      </Td>
      <Td>
        <StatusBadge status={order.status} />
      </Td>
      <Td>
        <span className="text-xs text-gray-500 whitespace-nowrap" dir="ltr">
          {new Date(order.created_at).toLocaleDateString('ar-EG', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          })}
        </span>
      </Td>
      <Td>
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href={`/admin/dubbing/${order.id}`}
            className="text-brand-600 hover:underline text-xs font-medium"
          >
            تفاصيل
          </Link>
          {phoneIntl && (
            <a
              href={`https://wa.me/${phoneIntl}?text=${encodeURIComponent(waMsg)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-emerald-600 hover:underline text-xs"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              واتساب
            </a>
          )}
        </div>
      </Td>
    </tr>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th scope="col" className="text-start font-semibold px-4 py-3 whitespace-nowrap">
      {children}
    </th>
  );
}

function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-4 py-3 align-middle">{children}</td>;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { cls: string; icon: any }> = {
    paid: { cls: 'bg-emerald-50 text-emerald-700', icon: CheckCircle2 },
    pending_payment: { cls: 'bg-amber-50 text-amber-700', icon: Clock },
    in_progress: { cls: 'bg-brand-500/10 text-brand-700', icon: Clock },
    delivered: { cls: 'bg-gray-100 text-gray-700', icon: CheckCircle2 },
    cancelled: { cls: 'bg-rose-50 text-rose-700', icon: XCircle },
    refunded: { cls: 'bg-gray-100 text-gray-600', icon: XCircle },
  };
  const m = map[status] || map.pending_payment;
  const Icon = m.icon;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${m.cls}`}
    >
      <Icon className="w-3 h-3" />
      {STATUS_LABELS[status] || status}
    </span>
  );
}

function TabLink({
  href,
  active,
  label,
  count,
  accent,
}: {
  href: string;
  active: boolean;
  label: string;
  count: number;
  accent?: 'emerald' | 'amber' | 'brand' | 'gray';
}) {
  const activeClass =
    accent === 'emerald'
      ? 'border-emerald-500 bg-emerald-500/10 text-emerald-700'
      : accent === 'amber'
        ? 'border-amber-500 bg-amber-500/10 text-amber-700'
        : accent === 'brand'
          ? 'border-brand-500 bg-brand-500/10 text-brand-700'
          : accent === 'gray'
            ? 'border-gray-500 bg-gray-100 text-gray-700'
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
