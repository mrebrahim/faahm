import Link from 'next/link';
import { createServiceClient } from '@/lib/supabase/server';
import { requireFinanceAdmin } from '@/lib/admin-guard';
import { auditLog } from '@/lib/admin-audit';
import {
  TrendingUp,
  Users,
  CreditCard,
  RefreshCcw,
  Ticket,
} from 'lucide-react';

export const metadata = { title: 'الإيرادات — إدارة فاهم!' };

export default async function RevenuePage() {
  const ctx = await requireFinanceAdmin();
  void auditLog(ctx, { action: 'revenue.dashboard_viewed' });
  const service = createServiceClient();

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const start30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const start90d = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();

  const [
    todayPaid,
    mtdPaid,
    last30Paid,
    last30Refunded,
    activeSubs,
    last30AllStatuses,
    topCoupons,
    recentPayments,
  ] = await Promise.all([
    service.from('payments').select('amount_cents').eq('status', 'paid').gte('created_at', startOfToday),
    service.from('payments').select('amount_cents').eq('status', 'paid').gte('created_at', startOfMonth),
    service.from('payments').select('amount_cents').eq('status', 'paid').gte('created_at', start30d),
    service.from('payments').select('amount_cents').eq('status', 'refunded').gte('created_at', start30d),
    service.from('subscriptions').select('plan, gateway').eq('status', 'active'),
    service.from('payments').select('status, gateway').gte('created_at', start30d),
    service
      .from('coupons')
      .select('id, code, used_count, discount_type, discount_value')
      .order('used_count', { ascending: false })
      .limit(5),
    service
      .from('v_payments_admin')
      .select('id, created_at, amount_cents, currency, status, user_name, user_email, gateway')
      .order('created_at', { ascending: false })
      .limit(10),
  ]);

  const sum = (rows: any[] | null) =>
    (rows || []).reduce((acc, r) => acc + (r.amount_cents || 0), 0) / 100;

  const todayUsd = sum(todayPaid.data);
  const mtdUsd = sum(mtdPaid.data);
  const last30Usd = sum(last30Paid.data);
  const refunded30 = sum(last30Refunded.data);

  const activeSubsList = activeSubs.data || [];
  let mrrCents = 0;
  for (const r of activeSubsList) {
    if (r.plan === 'monthly') mrrCents += 500;
    else if (r.plan === 'yearly') mrrCents += Math.round(4000 / 12);
  }
  const mrrUsd = mrrCents / 100;
  const arrUsd = mrrUsd * 12;

  // Plan / gateway distribution
  const planBreakdown = activeSubsList.reduce<Record<string, number>>((acc, r: any) => {
    acc[r.plan] = (acc[r.plan] || 0) + 1;
    return acc;
  }, {});
  const gatewayBreakdown = activeSubsList.reduce<Record<string, number>>((acc, r: any) => {
    acc[r.gateway] = (acc[r.gateway] || 0) + 1;
    return acc;
  }, {});

  // Success / fail (last 30d) just on paid + failed
  const consideredRows = (last30AllStatuses.data || []).filter((r: any) =>
    ['paid', 'failed'].includes(r.status)
  );
  const paidCnt = consideredRows.filter((r: any) => r.status === 'paid').length;
  const successRate = consideredRows.length === 0 ? null : (paidCnt / consideredRows.length) * 100;

  const totalActive = activeSubsList.length;

  return (
    <div className="p-6 lg:p-8 max-w-7xl">
      <div className="mb-6">
        <h1 className="font-display text-3xl font-bold">الإيرادات</h1>
        <p className="text-sm text-gray-500 mt-1">
          نظرة عامة على الإيرادات والاشتراكات. الأرقام محسوبة من قاعدة البيانات حاليًا (ممكن
          نضيف Stripe/Paymob fees لاحقًا).
        </p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <Kpi icon={CreditCard} label="إيرادات اليوم" value={`$${todayUsd.toFixed(2)}`} />
        <Kpi icon={CreditCard} label="هذا الشهر" value={`$${mtdUsd.toFixed(2)}`} />
        <Kpi icon={TrendingUp} label="MRR" value={`$${mrrUsd.toFixed(2)}`} hint={`ARR ~$${arrUsd.toFixed(0)}`} />
        <Kpi icon={Users} label="اشتراكات نشطة" value={String(totalActive)} />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        <Kpi icon={CreditCard} label="إيرادات 30 يوم" value={`$${last30Usd.toFixed(2)}`} />
        <Kpi icon={RefreshCcw} label="استردادات 30 يوم" value={`$${refunded30.toFixed(2)}`} />
        <Kpi
          icon={TrendingUp}
          label="معدّل النجاح"
          value={successRate !== null ? `${successRate.toFixed(1)}%` : '—'}
          hint="آخر 30 يوم"
        />
        <Kpi
          icon={CreditCard}
          label="صافي 30 يوم"
          value={`$${(last30Usd - refunded30).toFixed(2)}`}
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        {/* Plan breakdown */}
        <Card title="توزيع الاشتراكات النشطة (الخطة)">
          {totalActive === 0 ? (
            <p className="text-sm text-gray-500">مفيش اشتراكات نشطة لسه.</p>
          ) : (
            <ul className="space-y-2">
              {Object.entries(planBreakdown).map(([plan, n]) => {
                const pct = (n / totalActive) * 100;
                return (
                  <li key={plan}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="font-medium">{plan}</span>
                      <span dir="ltr" className="text-gray-500">
                        {n} · {pct.toFixed(0)}%
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-gray-100 overflow-hidden">
                      <div
                        className="h-full bg-brand-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        {/* Gateway breakdown */}
        <Card title="توزيع الاشتراكات النشطة (البوابة)">
          {totalActive === 0 ? (
            <p className="text-sm text-gray-500">مفيش اشتراكات نشطة لسه.</p>
          ) : (
            <ul className="space-y-2">
              {Object.entries(gatewayBreakdown).map(([g, n]) => {
                const pct = (n / totalActive) * 100;
                return (
                  <li key={g}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="font-medium">{g}</span>
                      <span dir="ltr" className="text-gray-500">
                        {n} · {pct.toFixed(0)}%
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-gray-100 overflow-hidden">
                      <div
                        className="h-full bg-gray-700"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Top coupons */}
        <Card
          title="أعلى الكوبونات استخدامًا"
          action={
            <Link href="/admin/coupons" className="text-xs text-brand-600 hover:underline">
              إدارة الكوبونات
            </Link>
          }
        >
          {(topCoupons.data || []).length === 0 ? (
            <p className="text-sm text-gray-500">لسه ما فيش كوبونات.</p>
          ) : (
            <ul className="space-y-2">
              {(topCoupons.data || []).map((c: any) => (
                <li key={c.id} className="flex items-center justify-between text-sm">
                  <span className="inline-flex items-center gap-2">
                    <Ticket className="w-3.5 h-3.5 text-brand-500" />
                    <code dir="ltr" className="font-mono bg-gray-100 px-2 py-0.5 rounded">
                      {c.code}
                    </code>
                  </span>
                  <span dir="ltr" className="text-gray-500">
                    {c.used_count || 0} استخدام
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Recent payments */}
        <Card
          title="آخر المعاملات"
          action={
            <Link href="/admin/payments" className="text-xs text-brand-600 hover:underline">
              كل المدفوعات
            </Link>
          }
        >
          {(recentPayments.data || []).length === 0 ? (
            <p className="text-sm text-gray-500">مفيش معاملات.</p>
          ) : (
            <ul className="space-y-2">
              {(recentPayments.data || []).map((p: any) => (
                <li key={p.id} className="flex items-center justify-between text-sm">
                  <Link
                    href={`/admin/payments/${p.id}`}
                    className="font-medium truncate max-w-[60%] hover:text-brand-600"
                  >
                    {p.user_name || p.user_email || '—'}
                  </Link>
                  <span dir="ltr" className="text-gray-700 font-bold">
                    ${((p.amount_cents || 0) / 100).toFixed(2)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  hint?: string;
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
      {hint && (
        <div className="text-[11px] text-gray-400 mt-0.5" dir="ltr">
          {hint}
        </div>
      )}
    </div>
  );
}

function Card({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-bold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}
