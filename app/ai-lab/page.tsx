import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/server';
import { APP_NAME, OFFLINE_PAYMENTS } from '@/lib/constants';
import {
  AI_LAB_MONTHLY,
  AI_LAB_YEARLY,
  AI_LAB_YEARLY_SAVINGS_USD,
  checkoutHrefFor,
  type PurchasableProduct,
} from '@/lib/catalog';
import { getAiLabMembership } from '@/lib/ai-lab';
import {
  CTA_LABEL,
  FAQS,
  PHASES,
  cohortStartLabel,
  daysUntilCohort,
} from '@/lib/ai-lab-launch';
import { AiLabTracker } from '@/components/ai-lab-tracker';
import {
  ArrowLeft,
  CheckCircle2,
  CalendarClock,
  ClipboardCheck,
  MessageCircle,
  ShieldCheck,
  Video,
  XCircle,
} from 'lucide-react';

export const metadata = {
  title: `فاهم AI Lab — ١٢ أسبوع، ٣ مشاريع، وحد بيراجع شغلك | ${APP_NAME}`,
  description: `مش كورسات جديدة — ده جدول وديدلاين ومراجعة على شغلك على n8n و AI Video و Vibe Coding. $${AI_LAB_MONTHLY.priceUsd}/شهر أو $${AI_LAB_YEARLY.priceUsd}/سنة.`,
  robots: { index: true, follow: true },
};

export const dynamic = 'force-dynamic';

/**
 * AI Lab landing page.
 *
 * One conversion action and nothing else: buy a membership. No nav, no
 * "browse the courses", no newsletter — every second link on a landing
 * page is an exit, and this page has exactly one job.
 *
 * Section order is result → pain → mechanism → proof → price → risk
 * removal → objections → close. The old draft opened by accusing the
 * visitor of never finishing anything, before telling them what they
 * get; that belongs in the mirror section, not the hero.
 *
 * Two rules held deliberately:
 *   - No testimonial block until there are real ones. An empty slot is
 *     the clearest possible evidence that nobody has results.
 *   - No "only 100 seats" counter. The scarcity here is a real cohort
 *     date; invented scarcity costs more trust than it buys sales.
 */
export default async function AiLabPage({
  searchParams,
}: {
  searchParams: { variant?: string };
}) {
  const {
    data: { user },
  } = await createClient().auth.getUser();
  const membership = await getAiLabMembership(user?.id);

  const startsIn = daysUntilCohort();
  const startLabel = cohortStartLabel();
  const variant = searchParams.variant ?? 'default';

  return (
    <main className="relative min-h-screen bg-white pb-24 sm:pb-0">
      <AiLabTracker variant={variant} />

      {/* ═══ 1 · TOP BAR — logo, date, one CTA. No nav. ═══ */}
      <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/90 backdrop-blur">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center font-display font-extrabold text-white">
              ف
            </div>
            <span className="font-display font-extrabold hidden sm:inline">
              {APP_NAME} AI Lab
            </span>
          </div>
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-[11px] sm:text-xs text-gray-500 truncate">
              الدفعة تبدأ {startLabel}
            </span>
            <Button asChild size="sm" className="flex-shrink-0">
              <Link href="#pricing" data-track-cta="topbar">
                احجز مكانك
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* ═══ 2 · HERO ═══ */}
      <section className="px-4 pt-10 sm:pt-16 pb-12">
        <div className="container mx-auto max-w-3xl text-center">
          {startsIn > 0 && (
            <div className="inline-flex items-center gap-2 px-4 py-1.5 mb-5 rounded-full border border-indigo-500/30 bg-indigo-500/10">
              <CalendarClock className="w-4 h-4 text-indigo-600" />
              <span className="text-sm font-medium text-indigo-700">
                الدفعة الجاية تبدأ {startLabel} — فاضل {startsIn} يوم
              </span>
            </div>
          )}

          <h1 className="font-display text-3xl sm:text-5xl font-extrabold leading-tight mb-4">
            اطلع من ١٢ أسبوع بـ<span className="text-gradient-brand">٣ حاجات شغالة</span>،
            <br className="hidden sm:inline" /> مش بـ٣ كورسات مفتوحة
          </h1>

          <p className="max-w-xl mx-auto text-sm sm:text-lg text-gray-600 mb-8 leading-relaxed">
            فاهم AI Lab مش كورسات جديدة. ده <strong>جدول</strong> و<strong>ديدلاين</strong>{' '}
            و<strong>مراجعة على شغلك</strong> على نفس التلات كورسات — n8n و AI Video و
            Vibe Coding — لحد ما تطلع بمنتج تقدر تعرضه.
          </p>

          {membership ? (
            <MemberCard daysLeft={membership.daysLeft} />
          ) : (
            <>
              <Plans position="hero" />
              <TrustRow />
            </>
          )}
        </div>
      </section>

      {/* ═══ 3 · THE MIRROR ═══ */}
      <section className="px-4 py-12 sm:py-16 bg-gray-50 border-y border-gray-200">
        <div className="container mx-auto max-w-2xl">
          <div className="space-y-3 mb-8">
            <Mirror text="اشتريت كورس ولا اتنين، وفتحتهم مرة واحدة بس." />
            <Mirror text="كل مرة بتقول الأسبوع الجاي هبدأ بجد." />
            <Mirror text="بتتفرج على ناس بتعمل حاجات بالـAI وانت لسه في الدرس التالت." />
            <Mirror text="محدش لاحظ إنك وقفت، لأن محدش كان مستنيك." />
          </div>
          <p className="text-center font-display text-lg sm:text-2xl font-extrabold leading-relaxed">
            المشكلة مش إنك ناقصك محتوى.
            <br />
            <span className="text-brand-700">المشكلة إنك بتبدأ لوحدك ومحدش مستنيك تسلّم.</span>
          </p>
        </div>
      </section>

      {/* ═══ 4 · MECHANISM ═══ */}
      <section className="px-4 py-14 sm:py-20">
        <div className="container mx-auto max-w-3xl">
          <h2 className="font-display text-2xl sm:text-4xl font-extrabold text-center mb-3">
            ليه ده هيشتغل والكورس لأ
          </h2>
          <p className="text-center text-gray-600 mb-10 text-sm sm:text-base">
            تلات حاجات الكورس المسجّل مايقدرش يعملهم.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Mechanism
              icon={CalendarClock}
              title="جدول بتاريخ"
              desc="module كل أسبوع بيتفتح في يوم محدد. مش مكتبة مفتوحة تأجّلها للأبد."
            />
            <Mechanism
              icon={ClipboardCheck}
              title="مشروع بمراجعة"
              desc="بتسلّم شغل، وحد بيفتحه ويقولك غلط فين. الديدلاين بيخلق الالتزام."
            />
            <Mechanism
              icon={Video}
              title="لايف أسبوعي"
              desc="ساعة ونص بتسأل فيها وانت شغال، مش بعد ما تقف بشهر."
            />
          </div>
        </div>
      </section>

      {/* ═══ 5 · THE 12 WEEKS ═══ */}
      <section className="px-4 py-14 sm:py-20 bg-gray-50 border-y border-gray-200">
        <div className="container mx-auto max-w-2xl">
          <h2 className="font-display text-2xl sm:text-4xl font-extrabold text-center mb-10">
            الـ<span className="text-gradient-brand">١٢ أسبوع</span>
          </h2>
          <div className="relative space-y-4">
            {PHASES.map((p) => (
              <div
                key={p.title}
                className="rounded-2xl border border-gray-200 bg-white p-5 flex flex-col sm:flex-row gap-4"
              >
                <div className="flex-shrink-0">
                  <span className="inline-flex px-3 py-1 rounded-lg bg-brand-500/10 text-brand-700 text-sm font-bold whitespace-nowrap">
                    أسبوع {p.weeks}
                  </span>
                </div>
                <div className="min-w-0">
                  <h3 className="font-display text-lg font-extrabold mb-1">{p.title}</h3>
                  <p className="text-sm text-gray-700 mb-1">
                    <strong>المخرج:</strong> {p.outcome}
                  </p>
                  <p className="text-xs text-gray-500">{p.note}</p>
                </div>
              </div>
            ))}
            <div className="rounded-2xl border-2 border-brand-500/40 bg-gradient-to-br from-brand-500/5 to-white p-5">
              <div className="text-xs font-bold text-brand-700 mb-1">🏁 المشروع النهائي</div>
              <p className="text-sm text-gray-700 leading-relaxed">
                منتج واحد بيجمع التلاتة: tool مبني بالـVibe Coding، بيتسوّق بفيديو AI،
                ومربوط بأتمتة n8n. ده اللي بتعرضه بعد كده.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ 6 · WHAT YOU GET ═══ */}
      <section className="px-4 py-14 sm:py-20">
        <div className="container mx-auto max-w-2xl">
          <h2 className="font-display text-2xl sm:text-4xl font-extrabold text-center mb-8">
            اللي بتاخده
          </h2>
          <div className="rounded-2xl border border-gray-200 overflow-hidden">
            <Get title="مسار ١٢ أسبوع بجدول ثابت" desc="module كل أسبوع بتاريخ محدد" />
            <Get title="لايف أسبوعي" desc="ورشة ٦٠–٩٠ دقيقة، والتسجيل متاح خلال ٢٤ ساعة" />
            <Get title="مراجعة ٣ مشاريع" desc="ملاحظات مكتوبة على شغلك، مش تقييم آلي" />
            <Get title="شهادة إتمام" desc="بكود تحقّق، وشهادة AI Builder للمشروع النهائي" />
            <Get title="غرفة الدفعة" desc="مع باقي الأعضاء — أسئلة ومكاسب ومشاريع" />
            <Get title="ضمان ٧ أيام" desc="استرداد كامل من غير أسئلة" last />
          </div>
        </div>
      </section>

      {/* ═══ 7 · WHO REVIEWS YOUR WORK ═══ */}
      <section className="px-4 py-14 sm:py-20 bg-gray-50 border-y border-gray-200">
        <div className="container mx-auto max-w-2xl">
          <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-center mb-8">
            مين اللي هيراجع شغلك
          </h2>
          <div className="rounded-2xl bg-white border border-gray-200 p-6 flex flex-col sm:flex-row gap-5 items-center sm:items-start">
            {/* Photo pending. Rendering initials beats rendering a broken
                image icon, but this section is weaker without a face —
                the programme sells personal review. */}
            <div className="w-24 h-24 rounded-2xl bg-brand-500 text-white flex items-center justify-center font-display text-3xl font-extrabold flex-shrink-0">
              إ
            </div>
            <div className="min-w-0 text-center sm:text-start">
              <h3 className="font-display text-xl font-extrabold mb-1">إبراهيم خليل</h3>
              <p className="text-sm text-gray-600 mb-3">
                مؤسس فاهم، وبيراجع مشاريع الدفعة بنفسه.
              </p>
              <ul className="space-y-1.5 text-sm text-gray-700">
                <li>• بنى منصة فاهم وكورساتها التلاتة</li>
                <li>• بيشتغل بالـn8n والـAI في مشاريع حقيقية مش أمثلة</li>
                <li>• بيرد على أسئلة الطلبة بنفسه في كل لايف</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ 8 · testimonials: intentionally absent until real ones exist ═══ */}

      {/* ═══ 9 · PRICE ═══ */}
      <section id="pricing" className="px-4 py-14 sm:py-20 scroll-mt-16">
        <div className="container mx-auto max-w-2xl text-center">
          <h2 className="font-display text-2xl sm:text-4xl font-extrabold mb-2">
            احجز مكانك
          </h2>
          <p className="text-sm text-gray-600 mb-8">
            الدفعة تبدأ {startLabel}. بتدخل غرفة الأعضاء من ساعة الاشتراك.
          </p>

          {membership ? (
            <MemberCard daysLeft={membership.daysLeft} />
          ) : (
            <>
              <Plans position="pricing" />

              {/* Egypt pays the same price — this rail exists because
                  InstaPay cannot send dollars, not as a discount. */}
              <div className="mt-6 rounded-2xl border border-gray-200 bg-gray-50 p-5">
                <div className="font-bold text-sm mb-1">من مصر؟</div>
                <p className="text-xs text-gray-600 leading-relaxed mb-3">
                  السنوي بـ{' '}
                  <strong>{AI_LAB_YEARLY.priceEgp.toLocaleString('en')} ج.م</strong> عبر
                  InstaPay أو Vodafone Cash. بتحوّل، بتبعت صورة التحويل، وبنفعّل حسابك
                  خلال ٢٤ ساعة.
                </p>
                <div className="text-xs text-gray-500 mb-3">
                  الرقم:{' '}
                  <span dir="ltr" className="font-mono font-bold text-gray-800">
                    {OFFLINE_PAYMENTS.vodafoneCash.phone}
                  </span>
                </div>
                <Button asChild variant="outline" size="sm" className="w-full sm:w-auto">
                  <Link
                    href={`/offline/egp?product=${AI_LAB_YEARLY.id}`}
                    data-track-cta="instapay"
                  >
                    ادفع بـ InstaPay
                  </Link>
                </Button>
              </div>
            </>
          )}
        </div>
      </section>

      {/* ═══ 10 · GUARANTEE ═══ */}
      <section className="px-4 py-14 sm:py-20 bg-gray-50 border-y border-gray-200">
        <div className="container mx-auto max-w-xl text-center">
          <div className="w-16 h-16 mx-auto mb-5 rounded-full bg-emerald-500/10 border-2 border-emerald-500/30 flex items-center justify-center">
            <ShieldCheck className="w-8 h-8 text-emerald-600" />
          </div>
          <h2 className="font-display text-2xl sm:text-3xl font-extrabold mb-3">
            ضمان استرداد ٧ أيام
          </h2>
          <p className="text-gray-700 leading-relaxed">
            احضر أول لايف، شوف الجدول، وجرّب أول module. لو حسّيت إنها مش ليك، كلّمنا
            على واتساب خلال ٧ أيام و<strong>بنرجّعلك المبلغ كامل</strong> من غير أسئلة.
          </p>
        </div>
      </section>

      {/* ═══ 11 · FAQ — hardest objection first ═══ */}
      <section className="px-4 py-14 sm:py-20">
        <div className="container mx-auto max-w-2xl">
          <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-center mb-8">
            أسئلة قبل ما تحجز
          </h2>
          <div className="space-y-3">
            {FAQS.map((f, i) => (
              <details
                key={f.q}
                className="group rounded-xl border border-gray-200 bg-white p-4 sm:p-5 open:border-brand-500/40 open:bg-brand-500/5 transition-colors"
              >
                <summary
                  className="cursor-pointer font-bold list-none flex items-start justify-between gap-3"
                  data-track-faq={`q${i + 1}`}
                >
                  <span className="text-sm sm:text-base">{f.q}</span>
                  <span className="text-brand-500 text-xl flex-shrink-0 transition-transform group-open:rotate-45 leading-none">
                    +
                  </span>
                </summary>
                <p className="mt-3 text-sm text-gray-600 leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ 12 · CLOSE ═══ */}
      <section className="px-4 py-16 sm:py-24 bg-gradient-to-br from-brand-500 via-brand-600 to-emerald-700 text-white text-center">
        <div className="container mx-auto max-w-2xl">
          <h2 className="font-display text-2xl sm:text-4xl font-extrabold mb-4 leading-tight">
            الدفعة تبدأ {startLabel}
          </h2>
          <p className="opacity-95 mb-8 text-sm sm:text-base leading-relaxed">
            بعد ١٢ أسبوع هتبقى إما في نفس المكان، أو معاك تلات حاجات شغالة تعرضها.
          </p>
          <Button
            asChild
            size="lg"
            className="bg-white text-brand-700 hover:bg-gray-100 font-bold min-h-[56px] w-full sm:w-auto"
          >
            <Link href="#pricing" data-track-cta="final">
              {CTA_LABEL}
              <ArrowLeft className="w-5 h-5" />
            </Link>
          </Button>
          <p className="mt-4 text-xs opacity-90">
            ضمان استرداد ٧ أيام · Stripe أو InstaPay
          </p>
        </div>
      </section>

      <div className="px-4 py-8 text-center">
        <a
          href={`https://wa.me/${OFFLINE_PAYMENTS.confirmationWhatsApp}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-brand-700"
        >
          <MessageCircle className="w-4 h-4" />
          عندك سؤال تاني؟ كلّمنا على واتساب
        </a>
      </div>

      {/* ═══ 13 · STICKY BAR (mobile) ═══ */}
      {!membership && (
        <div
          className="sm:hidden fixed inset-x-0 bottom-0 z-50 border-t border-gray-200 bg-white/95 backdrop-blur px-4 py-3 flex items-center gap-3"
          style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}
        >
          <div className="min-w-0 flex-1">
            <div className="font-display text-lg font-extrabold text-brand-700" dir="ltr">
              ${AI_LAB_MONTHLY.priceUsd}
              <span className="text-xs text-gray-500 font-sans"> /شهر</span>
            </div>
            <div className="text-[10px] text-gray-500 truncate">
              تبدأ {startLabel}
            </div>
          </div>
          <Button asChild className="flex-shrink-0 font-bold">
            <Link href="#pricing" data-track-cta="sticky">
              {CTA_LABEL}
            </Link>
          </Button>
        </div>
      )}
    </main>
  );
}

/* ═══════════════  BITS  ═══════════════ */

function Plans({ position }: { position: string }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl mx-auto text-start">
      <PlanCard product={AI_LAB_YEARLY} featured position={position} />
      <PlanCard product={AI_LAB_MONTHLY} position={position} />
    </div>
  );
}

function PlanCard({
  product,
  featured = false,
  position,
}: {
  product: PurchasableProduct;
  featured?: boolean;
  position: string;
}) {
  const yearly = product.interval === 'year';

  return (
    <div
      className={`rounded-2xl bg-white p-5 flex flex-col ${
        featured ? 'border-2 border-brand-500/50 shadow-lg' : 'border border-gray-200'
      }`}
    >
      {featured ? (
        <span className="self-start px-2.5 py-1 mb-3 rounded-full bg-brand-500 text-white text-[11px] font-bold">
          وفّر ${AI_LAB_YEARLY_SAVINGS_USD}
        </span>
      ) : (
        <div className="h-[29px] mb-3" />
      )}

      <div className="font-bold text-sm mb-1">{yearly ? 'سنوي' : 'شهري'}</div>
      <div className="mb-1">
        {product.anchorUsd && (
          <span className="text-base text-gray-400 line-through font-medium me-2" dir="ltr">
            ${product.anchorUsd}
          </span>
        )}
        <span className="font-display text-4xl font-extrabold text-brand-700" dir="ltr">
          ${product.priceUsd}
        </span>
        <span className="text-sm text-gray-500 ms-1">/ {yearly ? 'سنة' : 'شهر'}</span>
      </div>
      <p className="text-xs text-gray-500 mb-4 leading-relaxed">
        {yearly
          ? `بدل $${product.anchorUsd} لو دفعت شهري على مدار السنة`
          : 'توقف التجديد في أي وقت'}
      </p>

      <Button
        asChild
        size="lg"
        variant={featured ? 'default' : 'outline'}
        className="w-full font-bold mt-auto"
      >
        <Link
          href={checkoutHrefFor(product)}
          data-track-cta={`${position}-${yearly ? 'yearly' : 'monthly'}`}
        >
          {CTA_LABEL}
          <ArrowLeft className="w-4 h-4" />
        </Link>
      </Button>
    </div>
  );
}

function TrustRow() {
  return (
    <p className="mt-4 text-[11px] sm:text-xs text-gray-500 leading-relaxed">
      🛡️ ضمان استرداد ٧ أيام · 💳 Stripe أو InstaPay · ⚡ تدخل غرفة الأعضاء فوراً
    </p>
  );
}

function MemberCard({ daysLeft }: { daysLeft: number }) {
  return (
    <div className="mx-auto max-w-md rounded-2xl border-2 border-emerald-500/40 bg-emerald-50 px-5 py-6">
      <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
      <p className="font-bold mb-1">عضويتك شغالة ✅</p>
      <p className="text-sm text-gray-600 mb-4">فاضل {daysLeft} يوم على التجديد.</p>
      <Button asChild size="lg" className="w-full font-bold">
        <Link href="/community">
          ادخل على غرفة الأعضاء
          <ArrowLeft className="w-4 h-4" />
        </Link>
      </Button>
    </div>
  );
}

function Mirror({ text }: { text: string }) {
  return (
    <div className="rounded-xl bg-white border border-gray-200 px-4 py-3 text-sm text-gray-700 flex items-start gap-2.5">
      <XCircle className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
      <span>{text}</span>
    </div>
  );
}

function Mechanism({
  icon: Icon,
  title,
  desc,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5">
      <div className="w-10 h-10 rounded-xl bg-brand-500/10 text-brand-600 flex items-center justify-center mb-3">
        <Icon className="w-5 h-5" />
      </div>
      <h3 className="font-bold text-sm mb-1">{title}</h3>
      <p className="text-xs text-gray-600 leading-relaxed">{desc}</p>
    </div>
  );
}

function Get({
  title,
  desc,
  last = false,
}: {
  title: string;
  desc: string;
  last?: boolean;
}) {
  return (
    <div
      className={`flex items-start gap-3 p-4 bg-white ${
        last ? '' : 'border-b border-gray-100'
      }`}
    >
      <CheckCircle2 className="w-5 h-5 text-brand-500 mt-0.5 flex-shrink-0" />
      <div className="min-w-0">
        <div className="font-bold text-sm">{title}</div>
        <div className="text-xs text-gray-600 mt-0.5">{desc}</div>
      </div>
    </div>
  );
}
