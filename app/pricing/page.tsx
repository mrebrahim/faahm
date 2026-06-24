import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { APP_NAME, ROUTES } from '@/lib/constants';
import { pricingFor, resolveRegion, type Region } from '@/lib/region';
import { CheckCircle2, XCircle, ArrowLeft, Sparkles, Star, Zap } from 'lucide-react';

export const metadata = {
  title: 'الأسعار — فاهم!',
  description:
    'اشتراك واحد بسيط بيفتحلك كل كورسات فاهم — اختار الباقة اللي تناسبك وابدأ التعلم.',
};

export const dynamic = 'force-dynamic';

/**
 * Pricing page styled after the "split + anchor" psychology spec:
 *  - Yearly card lands first visually (RTL: right side) so the eye
 *    catches the "best deal" before scanning the monthly comparison.
 *  - Yearly headline price is shown as a per-month figure (40÷12 ≈ 3.33)
 *    to remove the sticker shock of the annual total — the small print
 *    underneath spells out the real $40/year charge.
 *  - Yearly card carries an anchored $5/month strikethrough that
 *    establishes the comparison price BEFORE the $3.33 figure is shown.
 *  - Monthly card is intentionally neutral (gray/dark CTA) so it works
 *    as a comparison anchor rather than a competing call-to-action.
 *  Real price ($40/year) and the Stripe Price IDs are unchanged — only
 *  the way the deal is presented changes.
 */
export default async function PricingPage({
  searchParams,
}: {
  searchParams: { region?: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Region drives the entire pricing display + the price IDs handed to
  // Stripe later. Defaults to USD; Saudi visitors get the SAR funnel
  // either by URL (/sa/pricing forces ?region=sa), CDN geo header
  // (cf-ipcountry / x-vercel-ip-country = SA), or sticky cookie set
  // once they've landed on the SAR funnel before.
  const region: Region = resolveRegion(searchParams.region ?? null);
  const pricing = pricingFor(region);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href={ROUTES.home} className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-brand-500 flex items-center justify-center font-display font-extrabold text-white text-lg">
              ف
            </div>
            <span className="font-display font-extrabold text-xl">{APP_NAME}</span>
          </Link>
          <div className="flex items-center gap-2">
            {user ? (
              <Button asChild variant="ghost" size="sm">
                <Link href={ROUTES.dashboard}>لوحتي</Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="ghost" size="sm">
                  <Link href={ROUTES.login}>دخول</Link>
                </Button>
                <Button asChild size="sm">
                  <Link href={ROUTES.signup}>تسجيل</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 sm:py-16 max-w-5xl">
        {/* Page header */}
        <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 mb-6 rounded-full border border-brand-500/30 bg-brand-500/10">
            <Sparkles className="w-4 h-4 text-brand-500" />
            <span className="text-sm font-medium text-brand-700">
              اشتراك واحد، كل الكورسات
            </span>
          </div>
          <h1 className="font-display text-3xl sm:text-4xl md:text-6xl font-extrabold mb-4">
            اختار <span className="text-gradient-brand">الباقة</span> اللي تناسبك
          </h1>
          <p className="text-gray-600 text-base sm:text-lg">
            ابدأ النهارده، والغي في أي وقت من غير أسئلة.
          </p>
        </div>

        {/* Plans — yearly first in DOM ⇒ lands on the RIGHT in RTL */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6 max-w-3xl mx-auto">
          <YearlyCard
            user={user}
            region={region}
            anchorYearDisplay={pricing.yearlyAnchorDisplay}
            perMonthDisplay={pricing.yearlyPerMonthDisplay}
            yearTotalDisplay={pricing.yearlyDisplay}
            savingsDisplay={pricing.savingsDisplay}
            savingsPct={pricing.savingsPct}
          />
          <MonthlyCard
            user={user}
            region={region}
            priceDisplay={pricing.monthlyDisplay}
          />
        </div>

        {/* Trust strip */}
        <div className="mt-10 sm:mt-12 grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 max-w-3xl mx-auto text-sm">
          <TrustItem text="إلغاء في أي وقت" />
          <TrustItem text="ضمان استرداد 7 أيام" />
          <TrustItem text="دفع آمن عبر Stripe و PayPal" />
        </div>

        {/* FAQ Hint */}
        <div className="mt-12 sm:mt-16 text-center">
          <h3 className="font-display text-xl sm:text-2xl font-bold mb-2">
            عندك سؤال؟
          </h3>
          <p className="text-gray-500 mb-4 text-sm sm:text-base">
            تواصل معانا على واتساب أو شوف الأسئلة الشائعة
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button variant="outline" asChild>
              <Link href="/help">اتواصل معانا</Link>
            </Button>
            <Button variant="ghost" asChild>
              <Link href="/faq">أسئلة شائعة</Link>
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}

function YearlyCard({
  user,
  region,
  anchorYearDisplay,
  perMonthDisplay,
  yearTotalDisplay,
  savingsDisplay,
  savingsPct,
}: {
  user: any;
  region: Region;
  anchorYearDisplay: string;
  perMonthDisplay: string;
  yearTotalDisplay: string;
  savingsDisplay: string;
  savingsPct: number;
}) {
  // Guest checkout: send everyone straight to /checkout. The page itself
  // collects an email if there's no session, and the account is
  // provisioned on the success page after the payment lands. The region
  // travels with the request so the Stripe price ID picked downstream
  // matches the currency we showed the visitor here.
  void user;
  const href = `/checkout?plan=yearly&region=${region}`;
  const isSar = region === 'sa';

  return (
    <div className="relative rounded-2xl overflow-hidden border-2 border-brand-500 bg-white shadow-2xl shadow-brand-500/20 md:scale-[1.03] md:order-1">
      {/* Corner savings badge — independent of the inline copy below so
          the discount catches the eye even before scanning the card. */}
      <div className="absolute top-3 start-3 z-10 px-2 py-0.5 rounded-full bg-emerald-500 text-white text-[10px] font-extrabold shadow">
        وفّر {savingsPct}%
      </div>

      {/* Green header band */}
      <div className="bg-brand-500 text-white text-center py-4 px-4">
        <div className="font-display text-xl sm:text-2xl font-extrabold">سنوي</div>
        <div className="inline-flex items-center gap-1 mt-1 text-xs font-bold opacity-95">
          <Star className="w-3 h-3 fill-white" />
          الأكثر مبيعاً
        </div>
      </div>

      <div className="p-6 sm:p-8">
        {/* Anchor (strikethrough) — the *real* full-year cost of paying
            month-to-month at the monthly plan's rate, framed so the
            headline price below reads as a cut, not just a number. */}
        <div
          dir={isSar ? 'rtl' : 'ltr'}
          className="text-sm text-gray-400 line-through font-medium text-center mb-1"
        >
          {anchorYearDisplay}/سنة
        </div>

        {/* Hero price — split per month */}
        <div className="text-center mb-3">
          <div
            className="flex items-baseline justify-center gap-1.5"
            dir={isSar ? 'rtl' : 'ltr'}
          >
            <span className="text-5xl sm:text-6xl font-extrabold font-display text-foreground">
              {perMonthDisplay}
            </span>
          </div>
          <div className="text-sm text-gray-500 mt-1">/ شهر</div>
        </div>

        {/* Total + savings line — anchor = what billing monthly for 12mo
            would cost, framed against the actual yearly charge. */}
        <p className="text-xs sm:text-sm text-center text-gray-700 bg-brand-500/5 border border-brand-500/20 rounded-lg py-2 px-3 mb-5 leading-relaxed">
          * تدفع{' '}
          <span className="font-bold">{yearTotalDisplay}</span> بدلاً من{' '}
          <span className="font-bold line-through text-gray-400">
            {anchorYearDisplay}
          </span>{' '}
          سنوياً — وفّر{' '}
          <span className="font-bold text-brand-700">{savingsDisplay}</span>{' '}
          ({savingsPct}%)
        </p>

        {/* Feature list */}
        <ul className="space-y-2.5 mb-6">
          <Feature text="وصول كامل لكل الكورسات" />
          <Feature text="المساعد الذكي فاهم" />
          <Feature text="شهادة إتمام لكل كورس" />
          <Feature text="أولوية الدعم الفني" />
          <Feature text="وصول مبكر للكورسات الجديدة" />
        </ul>

        {/* CTA — solid green */}
        <Button asChild size="lg" className="w-full font-bold">
          <Link href={href}>
            <Zap className="w-4 h-4" />
            اشتراك الآن
            <ArrowLeft className="w-4 h-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}

function MonthlyCard({
  user,
  region,
  priceDisplay,
}: {
  user: any;
  region: Region;
  priceDisplay: string;
}) {
  void user;
  const href = `/checkout?plan=monthly&region=${region}`;
  const isSar = region === 'sa';

  return (
    <div className="relative rounded-2xl overflow-hidden border border-gray-200 bg-white md:order-2">
      {/* Neutral header band */}
      <div className="bg-gray-100 text-gray-700 text-center py-4 px-4">
        <div className="font-display text-xl sm:text-2xl font-bold">شهري</div>
        <div className="mt-1 text-xs text-gray-500">مرونة بدون التزام طويل</div>
      </div>

      <div className="p-6 sm:p-8">
        {/* Spacer to vertical-align with the yearly card's anchor row */}
        <div className="h-5 mb-1" />

        <div className="text-center mb-3">
          <div
            className="flex items-baseline justify-center gap-1.5"
            dir={isSar ? 'rtl' : 'ltr'}
          >
            <span className="text-5xl sm:text-6xl font-extrabold font-display text-foreground">
              {priceDisplay}
            </span>
          </div>
          <div className="text-sm text-gray-500 mt-1">/ شهر</div>
        </div>

        {/* Spacer to vertical-align with the savings callout on the yearly card */}
        <div className="h-[60px] mb-5" />

        {/* Monthly is intentionally feature-gated to "courses only" so
            the comparison vs. yearly isn't just price — the visitor sees
            exactly what they lose if they don't take the yearly. */}
        <ul className="space-y-2.5 mb-6">
          <Feature text="وصول كامل لكل الكورسات" muted />
          <MissingFeature text="بدون المساعد الذكي فاهم" />
          <MissingFeature text="بدون شهادة إتمام" />
          <MissingFeature text="بدون أولوية الدعم الفني" />
        </ul>

        {/* CTA — dark/secondary so it doesn't compete with the yearly green */}
        <Button asChild size="lg" variant="outline" className="w-full font-bold">
          <Link href={href}>
            اشتراك الآن
            <ArrowLeft className="w-4 h-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}

function Feature({ text, muted = false }: { text: string; muted?: boolean }) {
  return (
    <li className="flex items-start gap-2.5 text-sm leading-relaxed">
      <CheckCircle2
        className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
          muted ? 'text-gray-400' : 'text-brand-500'
        }`}
      />
      <span className={muted ? 'text-gray-600' : 'text-gray-800'}>{text}</span>
    </li>
  );
}

function MissingFeature({ text }: { text: string }) {
  return (
    <li className="flex items-start gap-2.5 text-sm leading-relaxed">
      <XCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-gray-300" />
      <span className="text-gray-400 line-through decoration-gray-300">
        {text}
      </span>
    </li>
  );
}

function TrustItem({ text }: { text: string }) {
  return (
    <div className="flex items-center justify-center gap-2 rounded-xl bg-white border border-gray-200 px-4 py-3 text-gray-700">
      <CheckCircle2 className="w-4 h-4 text-brand-500 flex-shrink-0" />
      <span className="font-medium text-xs sm:text-sm">{text}</span>
    </div>
  );
}
