import Link from 'next/link';
import { createServiceClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/admin-guard';
import { auditLog } from '@/lib/admin-audit';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  CreditCard,
  Search,
  Download,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCcw,
  TrendingUp,
} from 'lucide-react';

export const metadata = { title: 'المدفوعات — إدارة فاهم!' };

const STATUS_LABELS: Record<string, string> = {
  paid: 'مدفوع',
  pending: 'معلّق',
  failed: 'فشل',
  refunded: 'مسترد',
};

const GATEWAY_LABELS: Record<string, string> = {
  stripe: 'Stripe',
  paymob: 'Paymob',
  manual: 'يدوي',
};

type SearchParams = {
  q?: string;
  status?: string;
  gateway?: string;
  page?: string;
};

const PAGE_SIZE = 50;

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const ctx = await requireAdmin();
  void auditLog(ctx, {
    action: 'payments.list_viewed',
    metadata: { filters: searchParams },
  });

  const service = createServiceClient();

  const page = Math.max(1, parseInt(searchParams.page || '1', 10) || 1);
  const offset = (page - 1) * PAGE_SIZE;

  // --- Header KPIs (today / MTD / MRR / 30-day success rate) ---
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const start30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [todayPaid, mtdPaid, mrrData, last30d] = await Promise.all([
    service
      .from('payments')
      .select('amount_cents, currency')
      .eq('status', 'paid')
      .gte('created_at', startOfToday),
    service
      .from('payments')
      .select('amount_cents, currency')
      .eq('status', 'paid')
      .gte('created_at', startOfMonth),
    service.from('subscriptions').select('plan').eq('status', 'active'),
    service
      .from('payments')
      .select('status')
      .gte('created_at', start30d)
      .in('status', ['paid', 'failed']),
  ]);

  const todayUsd = sumUsd(todayPaid.data);
  const mtdUsd = sumUsd(mtdPaid.data);
  const mrrUsd = computeMrr(mrrData.data);
  const successRate = computeSuccessRate(last30d.data);

  // --- Listing query against the v_payments_admin view ---
  let query = service
    .from('v_payments_admin')
    .select(
      'id, created_at, amount_cents, currency, gateway, gateway_payment_id, status, user_id, user_email, user_name, subscription_plan',
      { count: 'exact' }
    )
    .order('created_at', { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1);

  const status = searchParams.status;
  if (status && status !== 'all') query = query.eq('status', status);
  if (searchParams.gateway && searchParams.gateway !== 'all')
    query = query.eq('gateway', searchParams.gateway);

  const qRaw = (searchParams.q || '').trim().replace(/[%_,]/g, '');
  if (qRaw.length >= 3) {
    // Use .eq on the uuid column only when the input looks like a full UUID
    // (Postgres throws "invalid input syntax for type uuid" otherwise).
    const isFullUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(qRaw);
    if (isFullUuid) {
      query = query.or(
        `id.eq.${qRaw},gateway_payment_id.ilike.%${qRaw}%,gateway_order_id.ilike.%${qRaw}%`
      );
    } else if (/^[a-z0-9_-]{4,}$/i.test(qRaw)) {
      // Looks like a gateway reference (pi_xxx, ch_xxx, paymob order id…).
      query = query.or(
        `gateway_payment_id.ilike.%${qRaw}%,gateway_order_id.ilike.%${qRaw}%`
      );
    } else {
      query = query.or(`user_email.ilike.%${qRaw}%,user_name.ilike.%${qRaw}%`);
    }
  }

  const { data: payments, count } = await query;

  const totalPages = Math.max(1, Math.ceil((count || 0) / PAGE_SIZE));

  const buildHref = (patch: Partial<SearchParams>) => {
    const next = { ...searchParams, ...patch };
    const params = new URLSearchParams();
    Object.entries(next).forEach(([k, v]) => {
      if (v) params.set(k, String(v));
    });
    const qs = params.toString();
    return qs ? `/admin/payments?${qs}` : '/admin/payments';
  };

  return (
    <div className="p-6 lg:p-8 max-w-7xl">
      <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h1 className="font-display text-3xl font-bold">المدفوعات</h1>
          <p className="text-sm text-gray-500 mt-1">
            كل المعاملات عبر Stripe و Paymob والمدفوعات اليدوية.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link
            href={`/api/admin/payments/export?${new URLSearchParams(
              Object.entries(searchParams).filter(([, v]) => v != null) as any
            ).toString()}`}
          >
            <Download className="w-4 h-4" />
            تصدير CSV
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <Kpi icon={CreditCard} label="إيرادات اليوم" value={`$${todayUsd.toFixed(2)}`} />
        <Kpi icon={CreditCard} label="هذا الشهر" value={`$${mtdUsd.toFixed(2)}`} />
        <Kpi icon={TrendingUp} label="MRR (تقدير)" value={`$${mrrUsd.toFixed(2)}`} />
        <Kpi
          icon={CheckCircle2}
          label="معدّل النجاح (30 يوم)"
          value={successRate !== null ? `${successRate.toFixed(1)}%` : '—'}
        />
      </div>

      <form className="mb-3">
        {searchParams.status && (
          <input type="hidden" name="status" value={searchParams.status} />
        )}
        {searchParams.gateway && (
          <input type="hidden" name="gateway" value={searchParams.gateway} />
        )}
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            name="q"
            defaultValue={searchParams.q || ''}
            placeholder="بحث: email أو اسم أو payment id..."
            className="pr-10"
          />
        </div>
      </form>

      <div className="flex items-center flex-wrap gap-2 mb-4">
        {(['all', 'paid', 'pending', 'failed', 'refunded'] as const).map((s) => (
          <Link
            key={s}
            href={buildHref({ status: s === 'all' ? undefined : s, page: undefined })}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              (searchParams.status || 'all') === s
                ? 'bg-brand-500 text-white border-brand-500'
                : 'bg-white text-gray-700 border-gray-200 hover:border-brand-500/40'
            }`}
          >
            {s === 'all' ? 'الكل' : STATUS_LABELS[s]}
          </Link>
        ))}
        <span className="text-gray-300 mx-1">·</span>
        {(['all', 'stripe', 'paymob', 'manual'] as const).map((g) => (
          <Link
            key={g}
            href={buildHref({ gateway: g === 'all' ? undefined : g, page: undefined })}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              (searchParams.gateway || 'all') === g
                ? 'bg-gray-900 text-white border-gray-900'
                : 'bg-white text-gray-700 border-gray-200 hover:border-gray-400'
            }`}
          >
            {g === 'all' ? 'كل البوابات' : GATEWAY_LABELS[g]}
          </Link>
        ))}
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 text-xs">
              <tr>
                <Th>التاريخ</Th>
                <Th>المستخدم</Th>
                <Th>المبلغ</Th>
                <Th>البوابة</Th>
                <Th>الحالة</Th>
                <Th>المرجع</Th>
                <Th>{''}</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(payments || []).map((p: any) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <Td>
                    <span className="text-gray-700 text-xs whitespace-nowrap" dir="ltr">
                      {new Date(p.created_at).toLocaleDateString('ar-EG', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </Td>
                  <Td>
                    <div className="min-w-0">
                      <div className="font-medium truncate max-w-[200px]">
                        {p.user_name || p.user_email || '—'}
                      </div>
                      {p.user_email && p.user_name && (
                        <div className="text-xs text-gray-500 truncate max-w-[200px]" dir="ltr">
                          {p.user_email}
                        </div>
                      )}
                    </div>
                  </Td>
                  <Td>
                    <span dir="ltr" className="font-bold">
                      {formatAmount(p.amount_cents, p.currency)}
                    </span>
                  </Td>
                  <Td>
                    <span className="px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-700">
                      {GATEWAY_LABELS[p.gateway] || p.gateway}
                    </span>
                  </Td>
                  <Td>
                    <StatusBadge status={p.status} />
                  </Td>
                  <Td>
                    <span
                      dir="ltr"
                      className="text-[10px] font-mono text-gray-500 truncate inline-block max-w-[120px] align-middle"
                    >
                      {p.gateway_payment_id || p.id.slice(0, 8)}
                    </span>
                  </Td>
                  <Td>
                    <Button asChild variant="ghost" size="sm">
                      <Link href={`/admin/payments/${p.id}`}>تفاصيل</Link>
                    </Button>
                  </Td>
                </tr>
              ))}
              {(!payments || payments.length === 0) && (
                <tr>
                  <td colSpan={7} className="text-center py-16 text-sm text-gray-500">
                    مفيش معاملات بالفلاتر دي.
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
            <span dir="ltr">{count || 0}</span> معاملة
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

function sumUsd(rows: { amount_cents: number; currency: string }[] | null) {
  if (!rows) return 0;
  return rows.reduce((acc, r) => acc + (r.amount_cents || 0), 0) / 100;
}

function computeMrr(rows: { plan: string }[] | null) {
  if (!rows) return 0;
  let cents = 0;
  for (const r of rows) {
    if (r.plan === 'monthly') cents += 500;
    else if (r.plan === 'yearly') cents += Math.round(4000 / 12);
  }
  return cents / 100;
}

function computeSuccessRate(rows: { status: string }[] | null) {
  if (!rows || rows.length === 0) return null;
  const paid = rows.filter((r) => r.status === 'paid').length;
  return (paid / rows.length) * 100;
}

function formatAmount(cents: number, currency: string) {
  const v = (cents || 0) / 100;
  const sym = currency === 'USD' ? '$' : currency === 'EGP' ? 'ج.م ' : `${currency} `;
  return `${sym}${v.toFixed(2)}`;
}

function Kpi({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
        <Icon className="w-3.5 h-3.5" />
        {label}
      </div>
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

function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-4 py-3 align-middle">{children}</td>;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { cls: string; icon: any }> = {
    paid: { cls: 'bg-emerald-50 text-emerald-700', icon: CheckCircle2 },
    pending: { cls: 'bg-amber-50 text-amber-700', icon: Clock },
    failed: { cls: 'bg-rose-50 text-rose-700', icon: XCircle },
    refunded: { cls: 'bg-gray-100 text-gray-600', icon: RefreshCcw },
  };
  const m = map[status] || map.pending;
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
