import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createServiceClient } from '@/lib/supabase/server';
import { requireFinanceAdmin } from '@/lib/admin-guard';
import { auditLog } from '@/lib/admin-audit';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { addPaymentNote, recordManualRefund } from './actions';
import {
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Copy,
  ExternalLink,
  RefreshCcw,
  StickyNote,
  User as UserIcon,
} from 'lucide-react';

export const metadata = { title: 'تفاصيل دفعة — إدارة فاهم!' };

export default async function PaymentDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { success?: string; error?: string };
}) {
  const ctx = await requireFinanceAdmin();
  const service = createServiceClient();

  const { data: payment } = await service
    .from('v_payments_admin')
    .select('*')
    .eq('id', params.id)
    .maybeSingle();

  if (!payment) notFound();

  void auditLog(ctx, {
    action: 'payment.viewed',
    resourceType: 'payment',
    resourceId: params.id,
  });

  const [{ data: subscription }, { data: notes }, { data: refunds }, { data: audit }] =
    await Promise.all([
      payment.subscription_id
        ? service
            .from('subscriptions')
            .select(
              'id, plan, status, current_period_start, current_period_end, cancelled_at, gateway, stripe_subscription_id'
            )
            .eq('id', payment.subscription_id)
            .maybeSingle()
        : Promise.resolve({ data: null as any }),
      service
        .from('payment_notes')
        .select('id, note, author_email, created_at')
        .eq('payment_id', params.id)
        .order('created_at', { ascending: false }),
      service
        .from('refunds')
        .select('id, amount_cents, reason, internal_notes, gateway_refund_id, refunded_by_email, refunded_at')
        .eq('payment_id', params.id)
        .order('refunded_at', { ascending: false }),
      service
        .from('admin_audit_log')
        .select('id, action, user_email, result, error_message, created_at')
        .eq('resource_type', 'payment')
        .eq('resource_id', params.id)
        .order('created_at', { ascending: false })
        .limit(50),
    ]);

  const totalRefundedCents = (refunds || []).reduce((a, r: any) => a + (r.amount_cents || 0), 0);
  const remainingCents = Math.max(0, payment.amount_cents - totalRefundedCents);

  // Best-effort external link to the gateway dashboard.
  const gatewayExternalUrl =
    payment.gateway === 'stripe' && payment.gateway_payment_id
      ? `https://dashboard.stripe.com/payments/${payment.gateway_payment_id}`
      : null;

  return (
    <div className="p-6 lg:p-8 max-w-6xl">
      <Link
        href="/admin/payments"
        className="text-sm text-brand-600 hover:text-brand-700 inline-flex items-center gap-1 mb-3"
      >
        <ArrowRight className="w-4 h-4" />
        العودة للمدفوعات
      </Link>

      <div className="flex items-start justify-between gap-3 flex-wrap mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="font-display text-3xl font-bold" dir="ltr">
              {formatAmount(payment.amount_cents, payment.currency)}
            </h1>
            <StatusBadge status={payment.status} />
          </div>
          <p className="text-sm text-gray-500" dir="ltr">
            {payment.id}
          </p>
        </div>
        {gatewayExternalUrl && (
          <Button asChild variant="outline" size="sm">
            <a href={gatewayExternalUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="w-4 h-4" />
              فتح في Stripe
            </a>
          </Button>
        )}
      </div>

      {searchParams.error && (
        <Alert kind="error" message={decodeURIComponent(searchParams.error)} />
      )}
      {searchParams.success && (
        <Alert
          kind="success"
          message={
            searchParams.success === 'note_added'
              ? 'تم حفظ الملاحظة.'
              : searchParams.success === 'refund_recorded'
                ? 'تم تسجيل الاسترداد.'
                : 'تم.'
          }
        />
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Payment info */}
          <Card title="معلومات الدفعة">
            <Row label="المبلغ">
              <span dir="ltr" className="font-bold">
                {formatAmount(payment.amount_cents, payment.currency)}
              </span>
            </Row>
            {payment.discount_cents > 0 && (
              <Row label="الخصم">
                <span dir="ltr">{formatAmount(payment.discount_cents, payment.currency)}</span>
              </Row>
            )}
            {payment.coupon_code && (
              <Row label="الكوبون">
                <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">
                  {payment.coupon_code}
                </code>
              </Row>
            )}
            <Row label="البوابة">{payment.gateway}</Row>
            <Row label="معرّف البوابة">
              <CopyableMono value={payment.gateway_payment_id || '—'} />
            </Row>
            {payment.gateway_order_id && (
              <Row label="رقم الطلب">
                <CopyableMono value={payment.gateway_order_id} />
              </Row>
            )}
            <Row label="التاريخ">
              <span dir="ltr">
                {new Date(payment.created_at).toLocaleString('ar-EG')}
              </span>
            </Row>
          </Card>

          {/* Subscription */}
          {subscription && (
            <Card title="الاشتراك المرتبط">
              <Row label="الخطة">{subscription.plan}</Row>
              <Row label="الحالة">{subscription.status}</Row>
              <Row label="الفترة">
                <span dir="ltr">
                  {subscription.current_period_start?.slice(0, 10)} →{' '}
                  {subscription.current_period_end?.slice(0, 10)}
                </span>
              </Row>
              <div className="pt-2">
                <Button asChild variant="outline" size="sm">
                  <Link href={`/admin/subscriptions?q=${subscription.id}`}>
                    تفاصيل الاشتراك
                  </Link>
                </Button>
              </div>
            </Card>
          )}

          {/* Refunds */}
          <Card title="الاستردادات">
            {(refunds || []).length === 0 ? (
              <p className="text-sm text-gray-500">مفيش استردادات لهذه الدفعة.</p>
            ) : (
              <ul className="space-y-2 mb-4">
                {(refunds || []).map((r: any) => (
                  <li
                    key={r.id}
                    className="p-3 rounded-lg border border-gray-200 bg-gray-50 text-sm"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span dir="ltr" className="font-bold">
                        -{formatAmount(r.amount_cents, payment.currency)}
                      </span>
                      <span className="text-xs text-gray-500" dir="ltr">
                        {new Date(r.refunded_at).toLocaleDateString('ar-EG')}
                      </span>
                    </div>
                    {r.reason && <div className="text-xs text-gray-600">سبب: {r.reason}</div>}
                    {r.gateway_refund_id && (
                      <div className="text-[10px] text-gray-400 font-mono" dir="ltr">
                        {r.gateway_refund_id}
                      </div>
                    )}
                    {r.refunded_by_email && (
                      <div className="text-[10px] text-gray-400" dir="ltr">
                        by {r.refunded_by_email}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}

            {payment.status !== 'refunded' && remainingCents > 0 && (
              <details className="mt-3">
                <summary className="text-sm font-medium text-brand-600 cursor-pointer">
                  <RefreshCcw className="w-4 h-4 inline-block ms-1" /> تسجيل استرداد يدوي
                </summary>
                <div className="mt-3 p-3 rounded-lg border border-amber-200 bg-amber-50 text-xs text-amber-900 mb-3">
                  ⚠ ده يسجّل الاسترداد في قاعدة البيانات فقط. لازم تنفّذ الاسترداد الفعلي
                  في لوحة Stripe / Paymob قبل، وبعدين تسجّله هنا.
                </div>
                <form action={recordManualRefund} className="space-y-3 text-sm">
                  <input type="hidden" name="payment_id" value={payment.id} />
                  <div className="space-y-1">
                    <Label htmlFor="amount_cents">المبلغ (بالـ cents)</Label>
                    <Input
                      id="amount_cents"
                      name="amount_cents"
                      type="number"
                      min="1"
                      max={remainingCents}
                      defaultValue={remainingCents}
                      dir="ltr"
                      required
                    />
                    <p className="text-[11px] text-gray-500">
                      المتبقي: <span dir="ltr">{formatAmount(remainingCents, payment.currency)}</span>
                    </p>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="reason">السبب</Label>
                    <Input
                      id="reason"
                      name="reason"
                      placeholder="طلب العميل / خطأ تقني / احتيال..."
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="gateway_refund_id">رقم الاسترداد من البوابة (اختياري)</Label>
                    <Input id="gateway_refund_id" name="gateway_refund_id" dir="ltr" />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="internal_notes">ملاحظات داخلية</Label>
                    <textarea
                      id="internal_notes"
                      name="internal_notes"
                      rows={2}
                      className="flex w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                    />
                  </div>
                  {payment.subscription_id && (
                    <label className="flex items-center gap-2 text-xs">
                      <input
                        type="checkbox"
                        name="cancel_subscription"
                        className="accent-brand-500"
                      />
                      إلغاء الاشتراك المرتبط فورًا
                    </label>
                  )}
                  <Button type="submit" variant="destructive">
                    تسجيل الاسترداد
                  </Button>
                </form>
              </details>
            )}
          </Card>

          {/* Gateway response JSON */}
          {payment.metadata && Object.keys(payment.metadata).length > 0 && (
            <Card title="رد البوابة (Raw)">
              <details>
                <summary className="text-sm text-gray-500 cursor-pointer">
                  عرض الـ JSON
                </summary>
                <pre
                  dir="ltr"
                  className="mt-3 p-3 rounded-lg bg-gray-900 text-gray-100 text-[11px] overflow-x-auto max-h-96"
                >
                  {JSON.stringify(payment.metadata, null, 2)}
                </pre>
              </details>
            </Card>
          )}

          {/* Timeline */}
          <Card title="السجل (Timeline)">
            {(audit || []).length === 0 ? (
              <p className="text-sm text-gray-500">مفيش أحداث مسجّلة.</p>
            ) : (
              <ul className="space-y-2">
                {(audit || []).map((a: any) => (
                  <li key={a.id} className="text-sm flex items-start gap-2">
                    <span className="text-[10px] text-gray-400 mt-0.5 whitespace-nowrap" dir="ltr">
                      {new Date(a.created_at).toLocaleString('ar-EG')}
                    </span>
                    <div className="min-w-0">
                      <div className="font-medium" dir="ltr">
                        {a.action}{' '}
                        {a.result === 'failure' && (
                          <span className="text-rose-600">(failed)</span>
                        )}
                      </div>
                      {a.user_email && (
                        <div className="text-[11px] text-gray-500" dir="ltr">
                          {a.user_email}
                        </div>
                      )}
                      {a.error_message && (
                        <div className="text-[11px] text-rose-600">{a.error_message}</div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          {/* User */}
          <Card title="المستخدم">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-brand-500/10 flex items-center justify-center flex-shrink-0">
                <UserIcon className="w-5 h-5 text-brand-500" />
              </div>
              <div className="min-w-0">
                <div className="font-medium truncate">{payment.user_name || '—'}</div>
                {payment.user_email && (
                  <a
                    href={`mailto:${payment.user_email}`}
                    className="text-xs text-brand-600 hover:underline truncate block"
                    dir="ltr"
                  >
                    {payment.user_email}
                  </a>
                )}
                {payment.user_country && (
                  <div className="text-xs text-gray-500">{payment.user_country}</div>
                )}
                <Button asChild variant="outline" size="sm" className="mt-2">
                  <Link href={`/admin/students/${payment.user_id}`}>الملف الكامل</Link>
                </Button>
              </div>
            </div>
          </Card>

          {/* Notes */}
          <Card title="ملاحظات داخلية">
            <form action={addPaymentNote} className="space-y-2 mb-4">
              <input type="hidden" name="payment_id" value={payment.id} />
              <textarea
                name="note"
                rows={3}
                required
                maxLength={4000}
                placeholder="مثلًا: العميل اتواصل واتسأل عن المبلغ..."
                className="flex w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
              />
              <Button type="submit" size="sm" variant="outline">
                <StickyNote className="w-3.5 h-3.5" />
                حفظ الملاحظة
              </Button>
            </form>

            {(notes || []).length === 0 ? (
              <p className="text-xs text-gray-500">مفيش ملاحظات لسه.</p>
            ) : (
              <ul className="space-y-2">
                {(notes || []).map((n: any) => (
                  <li
                    key={n.id}
                    className="p-2 rounded-lg border border-gray-200 bg-gray-50 text-xs"
                  >
                    <div className="text-gray-700 whitespace-pre-line">{n.note}</div>
                    <div className="text-[10px] text-gray-400 mt-1 flex items-center gap-2">
                      <span dir="ltr">{n.author_email || 'admin'}</span>·
                      <span dir="ltr">
                        {new Date(n.created_at).toLocaleDateString('ar-EG')}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5">
      <h2 className="font-bold mb-3">{title}</h2>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm py-1">
      <span className="text-gray-500 flex-shrink-0">{label}</span>
      <span className="text-left">{children}</span>
    </div>
  );
}

function CopyableMono({ value }: { value: string }) {
  return (
    <span dir="ltr" className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded inline-flex items-center gap-1">
      {value}
      <Copy className="w-3 h-3 text-gray-400" />
    </span>
  );
}

function Alert({ kind, message }: { kind: 'success' | 'error'; message: string }) {
  const Icon = kind === 'success' ? CheckCircle2 : AlertCircle;
  const cls =
    kind === 'success'
      ? 'bg-brand-500/10 border-brand-500/30 text-brand-700'
      : 'bg-destructive/10 border-destructive/30 text-destructive';
  return (
    <div className={`mb-6 p-3 rounded-lg border ${cls} text-sm flex items-center gap-2`}>
      <Icon className="w-4 h-4" />
      {message}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    paid: 'bg-emerald-50 text-emerald-700',
    pending: 'bg-amber-50 text-amber-700',
    failed: 'bg-rose-50 text-rose-700',
    refunded: 'bg-gray-100 text-gray-600',
  };
  const labels: Record<string, string> = {
    paid: 'مدفوع',
    pending: 'معلّق',
    failed: 'فشل',
    refunded: 'مسترد',
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
        map[status] || 'bg-gray-100 text-gray-600'
      }`}
    >
      {labels[status] || status}
    </span>
  );
}

function formatAmount(cents: number, currency: string) {
  const v = (cents || 0) / 100;
  const sym = currency === 'USD' ? '$' : currency === 'EGP' ? 'ج.م ' : `${currency} `;
  return `${sym}${v.toFixed(2)}`;
}
