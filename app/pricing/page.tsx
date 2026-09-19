import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { APP_NAME, ROUTES, OFFLINE_PAYMENTS } from '@/lib/constants';
import {
  PAID_COURSES,
  PAID_COURSE_SLUGS,
  AI_BUNDLE,
  BUNDLE_ANCHOR_USD,
  BUNDLE_SAVINGS_USD,
  BUNDLE_SAVINGS_PCT,
  COURSE_PRICE_USD,
  COURSE_PRICE_EGP,
  checkoutHrefFor,
} from '@/lib/catalog';
import { SocialProofToast } from '@/components/social-proof-toast';
import { CheckCircle2, ArrowLeft, Sparkles, Star } from 'lucide-react';

export const metadata = {
  title: `الأسعار — ${APP_NAME}`,
  description: `كل كورس بـ $${COURSE_PRICE_USD} مرة واحدة والوصول دايم، أو خد التلات كورسات مع بعض بـ $${AI_BUNDLE.priceUsd} بدل $${BUNDLE_ANCHOR_USD}.`,
};

export const dynamic = 'force-dynamic';

/**
 * The whole price list on one page.
 *
 * There is no subscription any more: every course is bought once and
 * kept forever, and the bundle is the same three courses at a discount.
 * That makes this page simple on purpose — three identical cards and
 * the bundle that beats them, with the arithmetic shown rather than
 * asserted so the saving survives a sceptical reader.
 */
export default async function PricingPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // /api/checkout/course redirects here with ?error=checkout_failed when
  // the Stripe session couldn't be opened. Beats a raw 500 for the buyer.
  const failed = searchParams.error === 'checkout_failed';

  return (
    <div className="min-h-screen bg-gray-50">
      <SocialProofToast />

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

      <main className="container mx-auto px-4 py-12 sm:py-16 max-w-4xl">
        <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 mb-6 rounded-full border border-brand-500/30 bg-brand-500/10">
            <Sparkles className="w-4 h-4 text-brand-500" />
            <span className="text-sm font-medium text-brand-700">
              تدفع مرة واحدة — من غير اشتراك ولا تجديد
            </span>
          </div>
          <h1 className="font-display text-3xl sm:text-4xl md:text-6xl font-extrabold mb-4">
            اختار <span className="text-gradient-brand">كورسك</span>
          </h1>
          <p className="text-gray-600 text-base sm:text-lg leading-relaxed">
            كل كورس بتشتريه يفضل معاك للأبد، بكل تحديثاته الجاية.
          </p>
        </div>

        {failed && (
          <div className="max-w-2xl mx-auto mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-start">
            <div className="text-sm font-bold text-amber-800 mb-1">
              في مشكلة بسيطة في بوابة الدفع
            </div>
            <p className="text-xs text-amber-700 leading-relaxed">
              ما قدرناش نوصّلك لصفحة Stripe دلوقتي. جرّب تاني بعد دقيقة، أو ادفع
              بـ InstaPay أو Vodafone Cash، أو كلّمنا على واتساب.
            </p>
          </div>
        )}

        {/* ── The bundle first: it is the offer, the single courses are
            the comparison that makes it look right. ────────────────── */}
        <div className="rounded-3xl border-2 border-brand-500/40 bg-gradient-to-br from-brand-500/5 to-white p-6 sm:p-8 mb-8">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 mb-4 rounded-full bg-brand-500 text-white text-xs font-bold">
              <Star className="w-3.5 h-3.5 fill-white" />
              الأوفر
            </div>
            <h2 className="font-display text-2xl sm:text-3xl font-extrabold mb-1">
              AI Bundle — التلات كورسات
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              أتمتة n8n + AI Video Master + Vibe Coding
            </p>

            <div className="mb-2">
              <span
                className="text-xl text-gray-400 line-through font-medium me-2"
                dir="ltr"
              >
                ${BUNDLE_ANCHOR_USD}
              </span>
              <span
                className="font-display text-5xl sm:text-6xl font-extrabold text-brand-700"
                dir="ltr"
              >
                ${AI_BUNDLE.priceUsd}
              </span>
            </div>
            <p className="text-sm font-bold text-emerald-700 mb-6">
              وفّر ${BUNDLE_SAVINGS_USD} ({BUNDLE_SAVINGS_PCT}%) — و{BUNDLE_ANCHOR_USD}$ هو
              سعر التلاتة لو اشتريتهم واحد واحد
            </p>

            <ul className="max-w-sm mx-auto space-y-2.5 mb-6 text-start">
              <Feature text="التلات كورسات كاملة" />
              <Feature text="وصول دائم — من غير تجديد" />
              <Feature text="كل التحديثات المستقبلية مجاناً" />
              <Feature text="سيرفر n8n مجاني + ١٥,٠٠٠ قالب" />
              <Feature text="شهادة إتمام لكل كورس" />
              <Feature text="ضمان استرداد ٧ أيام" />
            </ul>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button asChild size="lg" className="w-full sm:w-auto font-bold">
                <Link href={checkoutHrefFor(AI_BUNDLE)}>
                  خد الـ Bundle بـ ${AI_BUNDLE.priceUsd}
                  <ArrowLeft className="w-4 h-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="w-full sm:w-auto">
                <Link href="/ai-bundle">شوف التفاصيل</Link>
              </Button>
            </div>
          </div>
        </div>

        {/* ── Single courses ───────────────────────────────────────── */}
        <div className="text-center mb-5">
          <h2 className="font-display text-xl sm:text-2xl font-extrabold mb-1">
            أو كورس لوحده
          </h2>
          <p className="text-sm text-gray-600">
            كل كورس بـ ${COURSE_PRICE_USD}، والوصول دايم برضه.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
          {PAID_COURSE_SLUGS.map((slug) => {
            const product = PAID_COURSES[slug];
            return (
              <div
                key={slug}
                className="rounded-2xl border border-gray-200 bg-white p-5 text-center flex flex-col"
              >
                <div className="font-bold text-sm sm:text-base mb-2 min-w-0">
                  {product.titleAr}
                </div>
                <div
                  className="font-display text-3xl font-extrabold text-brand-700 mb-4"
                  dir="ltr"
                >
                  ${product.priceUsd}
                </div>
                <div className="mt-auto flex flex-col gap-2">
                  <Button asChild size="sm" className="w-full">
                    <Link href={checkoutHrefFor(product)}>اشتري</Link>
                  </Button>
                  {/* Nobody spends $60 on a syllabus they haven't read. */}
                  <Link
                    href={ROUTES.course(slug)}
                    className="text-xs text-gray-600 hover:text-brand-700"
                  >
                    شوف المحتوى
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

        {/* Egypt is the largest slice of the audience and most of it
            can't pay on Stripe — the local rail has to be visible here,
            not buried in an FAQ. */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 text-center mb-10">
          <div className="text-sm font-bold mb-1">من مصر؟</div>
          <p className="text-xs text-gray-600 leading-relaxed mb-3">
            ادفع بـ InstaPay أو Vodafone Cash — الكورس بـ {COURSE_PRICE_EGP.toLocaleString('en')} ج.م
            والـ Bundle بـ {AI_BUNDLE.priceEgp.toLocaleString('en')} ج.م.
          </p>
          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <Button asChild size="sm" variant="outline">
              <Link href={`/offline/egp?product=${AI_BUNDLE.id}`}>ادفع محلياً</Link>
            </Button>
            <a
              href={`https://wa.me/${OFFLINE_PAYMENTS.confirmationWhatsApp}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-emerald-200 text-emerald-800 text-sm font-medium hover:bg-emerald-50 transition-colors"
            >
              كلّمنا على واتساب
            </a>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 max-w-3xl mx-auto text-sm">
          <TrustItem text="وصول فوري بعد الدفع" />
          <Link
            href="/refund-policy"
            className="flex items-center justify-center gap-2 rounded-xl bg-white border border-emerald-200 px-4 py-3 text-emerald-800 font-medium text-xs sm:text-sm hover:border-emerald-300 hover:bg-emerald-50/60 transition-colors"
          >
            <span aria-hidden>🛡️</span>
            ضمان استرداد 7 أيام
          </Link>
          <TrustItem text="دفع آمن عبر Stripe" />
        </div>

        <div className="mt-12 sm:mt-16 text-center">
          <h3 className="font-display text-xl sm:text-2xl font-bold mb-2">عندك سؤال؟</h3>
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

function Feature({ text }: { text: string }) {
  return (
    <li className="flex items-start gap-3 text-sm">
      <CheckCircle2 className="w-5 h-5 text-brand-500 flex-shrink-0 mt-0.5" />
      <span className="text-gray-700">{text}</span>
    </li>
  );
}

function TrustItem({ text }: { text: string }) {
  return (
    <div className="flex items-center justify-center gap-2 rounded-xl bg-white border border-gray-200 px-4 py-3 text-gray-700 font-medium text-xs sm:text-sm">
      <CheckCircle2 className="w-4 h-4 text-brand-500 flex-shrink-0" />
      {text}
    </div>
  );
}
