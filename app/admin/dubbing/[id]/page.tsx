import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createServiceClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/admin-guard';
import { auditLog } from '@/lib/admin-audit';
import { Button } from '@/components/ui/button';
import {
  Video,
  MessageCircle,
  Mail,
  ExternalLink,
  ArrowRight,
  CheckCircle2,
  Clock,
  XCircle,
  Phone,
  Calendar,
  DollarSign,
} from 'lucide-react';

export const metadata = {
  title: 'تفاصيل طلب دبلجة — إدارة فاهم!',
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

export default async function AdminDubbingOrderPage({
  params,
}: {
  params: { id: string };
}) {
  const ctx = await requireAdmin();
  void auditLog(ctx, {
    action: 'dubbing.detail_viewed',
    metadata: { order_id: params.id },
  });

  const service = createServiceClient();
  const { data: order } = await service
    .from('dubbing_orders')
    .select('*')
    .eq('id', params.id)
    .maybeSingle();

  if (!order) notFound();

  const phoneIntl = String(order.whatsapp || '').replace(/[^0-9]/g, '');
  const videoLines = String(order.video_links || '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const waMsg = `أهلاً ${order.name || ''}! بخصوص طلب الدبلجة اللي عملته على faahm.com — إحنا بنشتغل عليه دلوقتي.`;

  return (
    <div className="p-6 lg:p-8 max-w-4xl">
      <div className="mb-6">
        <Link
          href="/admin/dubbing"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-foreground mb-3"
        >
          <ArrowRight className="w-4 h-4" />
          العودة لكل الطلبات
        </Link>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="font-display text-3xl font-bold flex items-center gap-2">
              <Video className="w-6 h-6 text-brand-500" />
              طلب دبلجة #{String(order.id).slice(0, 8)}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {new Date(order.created_at).toLocaleString('ar-EG')}
            </p>
          </div>
          <StatusBadge status={order.status} />
        </div>
      </div>

      {/* Customer + Payment KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Kpi
          icon={DollarSign}
          label="المبلغ"
          value={`$${Number(order.amount_usd || 0).toFixed(2)}`}
        />
        <Kpi
          icon={Clock}
          label="الدقايق"
          value={`${order.minutes || 0} min`}
        />
        <Kpi
          icon={Video}
          label="عدد الفيديوهات"
          value={`${order.video_count || videoLines.length || 0}`}
        />
      </div>

      {/* Customer contact */}
      <Section title="بيانات العميل">
        <Field label="الاسم" value={order.name || '—'} />
        <Field
          label="الإيميل"
          value={
            order.email ? (
              <a
                href={`mailto:${order.email}`}
                className="text-brand-600 hover:underline inline-flex items-center gap-1"
                dir="ltr"
              >
                <Mail className="w-3.5 h-3.5" />
                {order.email}
              </a>
            ) : (
              '—'
            )
          }
        />
        <Field
          label="واتساب"
          value={
            order.whatsapp ? (
              <div className="flex items-center gap-3 flex-wrap">
                <span dir="ltr" className="font-mono text-sm">
                  {order.whatsapp}
                </span>
                {phoneIntl && (
                  <a
                    href={`https://wa.me/${phoneIntl}?text=${encodeURIComponent(waMsg)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-emerald-600 hover:underline"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    راسله على واتساب
                  </a>
                )}
              </div>
            ) : (
              '—'
            )
          }
        />
      </Section>

      {/* Language pair */}
      <Section title="تفاصيل الخدمة">
        <Field label="من لغة" value={order.source_lang || '—'} />
        <Field label="إلى لغة" value={order.target_lang || '—'} />
        {order.dialect && (
          <Field label="اللهجة" value={order.dialect} />
        )}
      </Section>

      {/* Video links */}
      <Section title={`لينكات الفيديوهات (${videoLines.length})`}>
        {videoLines.length === 0 ? (
          <p className="text-sm text-gray-500">مفيش لينكات متسجّلة.</p>
        ) : (
          <ol className="space-y-2">
            {videoLines.map((link, i) => (
              <li
                key={i}
                className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 bg-gray-50"
              >
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-brand-500 text-white text-xs font-bold flex items-center justify-center">
                  {i + 1}
                </span>
                <a
                  href={link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 min-w-0 text-brand-600 hover:underline break-all inline-flex items-start gap-1 text-sm"
                  dir="ltr"
                >
                  <ExternalLink className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                  <span className="break-all">{link}</span>
                </a>
              </li>
            ))}
          </ol>
        )}
      </Section>

      {/* Payment / Stripe */}
      <Section title="الدفع">
        <Field
          label="الحالة"
          value={<StatusBadge status={order.status} />}
        />
        {order.paid_at && (
          <Field
            label="تاريخ الدفع"
            value={
              <span dir="ltr">{new Date(order.paid_at).toLocaleString('ar-EG')}</span>
            }
          />
        )}
        {order.stripe_session_id && (
          <Field
            label="Stripe Session"
            value={
              <span dir="ltr" className="font-mono text-xs text-gray-600">
                {order.stripe_session_id}
              </span>
            }
          />
        )}
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 mb-4">
      <h2 className="font-bold text-sm text-gray-500 uppercase tracking-wide mb-4">
        {title}
      </h2>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Field({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-3 gap-3 items-start">
      <div className="text-xs text-gray-500 pt-0.5">{label}</div>
      <div className="col-span-2 text-sm">{value}</div>
    </div>
  );
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

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { cls: string; icon: any }> = {
    paid: { cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
    pending_payment: { cls: 'bg-amber-50 text-amber-700 border-amber-200', icon: Clock },
    in_progress: { cls: 'bg-brand-500/10 text-brand-700 border-brand-500/30', icon: Clock },
    delivered: { cls: 'bg-gray-100 text-gray-700 border-gray-300', icon: CheckCircle2 },
    cancelled: { cls: 'bg-rose-50 text-rose-700 border-rose-200', icon: XCircle },
    refunded: { cls: 'bg-gray-100 text-gray-600 border-gray-300', icon: XCircle },
  };
  const m = map[status] || map.pending_payment;
  const Icon = m.icon;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold border ${m.cls}`}
    >
      <Icon className="w-4 h-4" />
      {STATUS_LABELS[status] || status}
    </span>
  );
}
