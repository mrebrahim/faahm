import Link from 'next/link';
import { createServiceClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import {
  CheckCircle2,
  MessageCircle,
  Clock,
  Languages,
  ArrowLeft,
} from 'lucide-react';
import {
  deliveryFor,
  DUBBING_SUPPORT_WHATSAPP,
  DUBBING_SUPPORT_WA_MESSAGE,
} from '@/lib/dubbing';
import { APP_NAME } from '@/lib/constants';

export const metadata = {
  title: `شكراً — ${APP_NAME}`,
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

/**
 * Post-payment thank-you page for the dubbing service.
 *
 * Everything the customer sees — minutes, languages, delivery
 * date — is read FROM SUPABASE, not from the URL. The session_id
 * only tells us WHICH order to look up; the numbers themselves
 * are the row's, so no client can inflate the SLA by editing a
 * query param.
 *
 * If the Stripe webhook hasn't landed yet (~1-3s race), we render
 * a softer 'بنأكّد الدفع' state — the order still exists in the
 * pending_payment state, we just don't badge it as paid until the
 * webhook flips it.
 */
export default async function ServiceThankyouPage({
  searchParams,
}: {
  searchParams: { session_id?: string };
}) {
  const sessionId = searchParams.session_id?.trim();

  if (!sessionId) {
    return (
      <NotFoundLayout
        title="مش لاقي تفاصيل الطلب"
        body="لو دفعت لتوّك، استنّى دقيقة وحدّث الصفحة. أو ارجع لصفحة الخدمة وابدأ من جديد."
      />
    );
  }

  const service = createServiceClient();
  const { data: order } = await service
    .from('dubbing_orders')
    .select(
      'name, minutes, source_lang, target_lang, dialect, amount_usd, status'
    )
    .eq('stripe_session_id', sessionId)
    .maybeSingle();

  if (!order) {
    return (
      <NotFoundLayout
        title="مش لاقي الطلب"
        body="ممكن الرابط تعدّل أو الطلب لسه بيتسجّل. حدّث الصفحة خلال دقيقة، ولو المشكلة لسه موجودة كلّمنا واتساب."
      />
    );
  }

  const sla = deliveryFor(order.minutes);
  const isPaid = order.status === 'paid' || order.status === 'in_progress' || order.status === 'delivered';

  const waHref = `https://wa.me/${DUBBING_SUPPORT_WHATSAPP}?text=${encodeURIComponent(DUBBING_SUPPORT_WA_MESSAGE)}`;

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-12 sm:py-16 max-w-2xl">
        {/* HERO */}
        <div className="text-center mb-8">
          <div
            className={`w-20 h-20 mx-auto mb-5 rounded-full flex items-center justify-center ${
              isPaid ? 'bg-emerald-500/15' : 'bg-amber-500/15'
            }`}
          >
            <CheckCircle2
              className={`w-10 h-10 ${isPaid ? 'text-emerald-500' : 'text-amber-500'}`}
            />
          </div>
          <h1 className="font-display text-2xl sm:text-3xl md:text-4xl font-extrabold mb-2">
            {isPaid ? 'شكراً على اشتراكك 🎉' : 'استلمنا طلبك'}
          </h1>
          <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
            {isPaid
              ? `أهلاً${order.name ? ` بيك ${order.name}` : ''} — الدفع اتأكد، وبدأنا شغل الدبلجة.`
              : 'بنأكّد الدفع مع Stripe دلوقتي. لو الحالة ما اتحدثتش خلال دقيقة، حدّث الصفحة.'}
          </p>
        </div>

        {/* SLA BLOCK */}
        <div className="rounded-2xl border border-brand-500/30 bg-white p-5 sm:p-6 mb-5 text-center">
          <div className="inline-flex items-center gap-2 text-brand-700 text-xs font-bold uppercase tracking-wider mb-2">
            <Clock className="w-4 h-4" />
            ميعاد التسليم
          </div>
          <div className="font-display text-3xl sm:text-4xl font-extrabold text-foreground mb-1">
            {sla.human}
          </div>
          <p className="text-xs text-gray-500 leading-relaxed">
            (كل 60 دقيقة فيديو = يوم عمل. طلبك {order.minutes} دقيقة →{' '}
            {sla.days} يوم عمل / {sla.hours} ساعة)
          </p>
        </div>

        {/* ORDER SUMMARY */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 mb-6">
          <h2 className="font-display text-lg font-extrabold mb-4">ملخّص طلبك</h2>
          <div className="space-y-3 text-sm">
            <Row icon={Languages} label="اللغة">
              {order.source_lang || '—'}{' '}
              <ArrowLeft className="w-3 h-3 inline mx-1 text-gray-400" />{' '}
              {order.target_lang || '—'}
              {order.dialect ? (
                <span className="text-gray-500"> · اللهجة: {order.dialect}</span>
              ) : null}
            </Row>
            <Row icon={Clock} label="إجمالي الدقائق">
              {order.minutes} دقيقة
            </Row>
            <Row icon={CheckCircle2} label="المدفوع">
              <span className="font-bold" dir="ltr">
                ${Number(order.amount_usd).toFixed(0)}
              </span>{' '}
              <span className="text-xs text-gray-500">USD</span>
            </Row>
          </div>
        </div>

        {/* WHATSAPP CTA */}
        <a
          href={waHref}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-[#25D366] hover:bg-[#1ebe5b] text-white font-bold text-sm transition-colors mb-3"
        >
          <MessageCircle className="w-5 h-5" />
          استفسار عبر الواتساب
        </a>

        <Button asChild size="lg" variant="outline" className="w-full">
          <Link href="/dubbing">اطلب دبلجة تانية</Link>
        </Button>

        <p className="text-[11px] text-gray-400 text-center mt-6 leading-relaxed">
          فريق فاهم هيراجع اللينكات ويتواصل معاك على الواتساب لأي تفصيل إضافي.
          إيصال الدفع جاي على إيميلك من Stripe.
        </p>
      </div>
    </main>
  );
}

function Row({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-8 h-8 rounded-lg bg-brand-500/10 text-brand-700 inline-flex items-center justify-center flex-shrink-0">
        <Icon className="w-4 h-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-[11px] text-gray-500">{label}</div>
        <div className="text-sm text-foreground font-medium">{children}</div>
      </div>
    </div>
  );
}

function NotFoundLayout({ title, body }: { title: string; body: string }) {
  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-16">
      <div className="max-w-md w-full text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
          <CheckCircle2 className="w-8 h-8 text-gray-400" />
        </div>
        <h1 className="font-display text-2xl font-bold mb-2">{title}</h1>
        <p className="text-sm text-gray-500 mb-6 leading-relaxed">{body}</p>
        <Button asChild>
          <Link href="/dubbing">ارجع لصفحة الخدمة</Link>
        </Button>
      </div>
    </main>
  );
}
