import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { MainNav } from '@/components/main-nav';
import { resolveNavAuth } from '@/lib/nav-auth';
import { createClient } from '@/lib/supabase/server';
import { APP_NAME, ROUTES, OFFLINE_PAYMENTS } from '@/lib/constants';
import {
  AI_LAB_MONTHLY,
  AI_LAB_YEARLY,
  AI_LAB_YEARLY_SAVINGS_USD,
  checkoutHrefFor,
  type PurchasableProduct,
} from '@/lib/catalog';
import { getAiLabMembership } from '@/lib/ai-lab';
import {
  ArrowLeft,
  CheckCircle2,
  CalendarClock,
  Video,
  ClipboardCheck,
  Award,
  Users,
  Flame,
  XCircle,
} from 'lucide-react';

export const metadata = {
  title: `فاهم AI Lab — مسار ١٢ أسبوع بلايف أسبوعي ومراجعة مشاريع | ${APP_NAME}`,
  description: `مش كورسات تانية — ده جدول ومتابعة. ١٢ أسبوع على n8n و AI Video و Vibe Coding، لايف أسبوعي، مراجعة مشاريعك، وشهادة. $${AI_LAB_MONTHLY.priceUsd}/شهر أو $${AI_LAB_YEARLY.priceUsd}/سنة.`,
  robots: { index: true, follow: true },
};

export const dynamic = 'force-dynamic';

/**
 * AI Lab — the programme sold beside the courses, not above them.
 *
 * The hardest thing this page has to do is answer "why am I paying
 * again when I already own the courses?". The honest answer is that
 * the videos are not what's being sold: the schedule, the deadline and
 * someone looking at your work are. Every section is built around
 * that, and the "what this is NOT" block says it outright — a visitor
 * who feels tricked here asks for a refund a week later.
 */
export default async function AiLabPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const { signedIn, isAdmin } = await resolveNavAuth();

  const {
    data: { user },
  } = await createClient().auth.getUser();
  const membership = await getAiLabMembership(user?.id);

  return (
    <main className="min-h-screen bg-white">
      <MainNav signedIn={signedIn} isAdmin={isAdmin} />

      {/* ═══════════════  HERO  ═══════════════ */}
      <section className="px-4 pt-10 sm:pt-16 pb-12 sm:pb-20">
        <div className="container mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 mb-5 rounded-full border border-indigo-500/30 bg-indigo-500/10">
            <Flame className="w-4 h-4 text-indigo-600" />
            <span className="text-sm font-medium text-indigo-700">
              فاهم AI Lab — مسار ١٢ أسبوع
            </span>
          </div>

          <h1 className="font-display text-3xl sm:text-5xl font-extrabold leading-tight mb-4">
            المشكلة مش إنك مش لاقي كورس.
            <br />
            <span className="text-gradient-brand">المشكلة إنك بتبدأ ومبتكمّلش.</span>
          </h1>

          <p className="max-w-xl mx-auto text-sm sm:text-lg text-gray-600 mb-8 leading-relaxed">
            AI Lab مش كورسات جديدة. ده <strong>جدول</strong> و<strong>ديدلاين</strong> و
            <strong>حد بيراجع شغلك</strong> — ١٢ أسبوع بتخرج منهم بتلات حاجات شغالة
            تقدر تعرضها.
          </p>

          {membership ? (
            <div className="mx-auto max-w-md rounded-2xl border-2 border-emerald-500/40 bg-emerald-50 px-5 py-6">
              <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
              <p className="font-bold mb-1">عضويتك شغالة ✅</p>
              <p className="text-sm text-gray-600 mb-4">
                فاضل {membership.daysLeft} يوم على انتهاء العضوية.
              </p>
              <Button asChild size="lg" className="w-full font-bold">
                <Link href="/community">
                  ادخل على المجتمع
                  <ArrowLeft className="w-4 h-4" />
                </Link>
              </Button>
            </div>
          ) : (
            <>
              {searchParams.error === 'sold_out' && (
                <p className="mx-auto max-w-md mb-4 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg py-2 px-3">
                  عضويات التأسيس خلصت. الأسعار اللي تحت هي السارية دلوقتي.
                </p>
              )}
              <Plans />
            </>
          )}
        </div>
      </section>

      {/* ═══════════════  WHAT IT IS NOT  ═══════════════ */}
      <section className="px-4 py-12 sm:py-16 bg-gray-50 border-y border-gray-200">
        <div className="container mx-auto max-w-3xl">
          <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-center mb-3">
            خلينا نكون واضحين
          </h2>
          <p className="text-center text-gray-600 mb-8 text-sm sm:text-base">
            عشان متدفعش في حاجة انت فاكرها حاجة تانية.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-2xl bg-white border border-gray-200 p-5">
              <div className="flex items-center gap-2 mb-3 font-bold text-gray-500">
                <XCircle className="w-5 h-5" />
                ده مش…
              </div>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• كورسات جديدة — نفس التلات كورسات</li>
                <li>• كورسات بتتقفل لو وقفت الاشتراك — اللي اشتريته يفضل معاك</li>
                <li>• محتوى مقفول عنك لو مشتري الكورسات</li>
              </ul>
            </div>
            <div className="rounded-2xl bg-white border-2 border-brand-500/40 p-5">
              <div className="flex items-center gap-2 mb-3 font-bold text-brand-700">
                <CheckCircle2 className="w-5 h-5" />
                ده…
              </div>
              <ul className="space-y-2 text-sm text-gray-700">
                <li>• ترتيب وتوقيت للمحتوى اللي عندك</li>
                <li>• لايف أسبوعي تسأل فيه وانت شغال</li>
                <li>• حد بيراجع مشروعك ويقولك غلط فين</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════  THE 12 WEEKS  ═══════════════ */}
      <section className="px-4 py-14 sm:py-20">
        <div className="container mx-auto max-w-3xl">
          <h2 className="font-display text-2xl sm:text-4xl font-extrabold text-center mb-3">
            الـ<span className="text-gradient-brand">١٢ أسبوع</span>
          </h2>
          <p className="text-center text-gray-600 mb-10 text-sm sm:text-base">
            كل مرحلة بتنتهي بحاجة شغالة، مش بشهادة حضور.
          </p>

          <div className="space-y-4">
            <Phase
              weeks="١–٤"
              title="أتمتة n8n"
              outcome="workflow شغال بيحل مشكلة حقيقية عندك"
              why="أول واحد لأنه بيدي نتيجة ملموسة بأسرع وقت"
            />
            <Phase
              weeks="٥–٨"
              title="AI Video"
              outcome="فيديو أو ريلز منتج بالكامل بالـAI"
              why="بيبني عليه مهارة تسويق اللي هتعمله"
            />
            <Phase
              weeks="٩–١٢"
              title="Vibe Coding"
              outcome="tool أو SaaS صغير شغال"
              why="آخر واحد لأنه الأصعب والأطول"
            />
            <div className="rounded-2xl border-2 border-brand-500/40 bg-gradient-to-br from-brand-500/5 to-white p-5">
              <div className="text-xs font-bold text-brand-700 mb-1">
                🏁 المشروع النهائي
              </div>
              <p className="text-sm text-gray-700 leading-relaxed">
                منتج واحد بيجمع التلاتة: tool مبني بالـVibe Coding، بيتسوّق بفيديو AI،
                ومربوط بأتمتة n8n. ده اللي بتعرضه بعد كده.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════  WHAT YOU GET  ═══════════════ */}
      <section className="px-4 py-14 sm:py-20 bg-gray-50 border-y border-gray-200">
        <div className="container mx-auto max-w-3xl">
          <h2 className="font-display text-2xl sm:text-4xl font-extrabold text-center mb-10">
            اللي بتاخده
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Perk
              icon={CalendarClock}
              title="جدول أسبوعي ثابت"
              desc="module كل أسبوع بتاريخ محدد. مش مكتبة مفتوحة تتوه فيها."
            />
            <Perk
              icon={Video}
              title="لايف أسبوعي"
              desc="ورشة ٦٠–٩٠ دقيقة، تسأل فيها وانت شغال. التسجيل متاح خلال ٢٤ ساعة."
            />
            <Perk
              icon={ClipboardCheck}
              title="مراجعة مشاريعك"
              desc="بتسلّم، وبنقولك غلط فين وإزاي تصلّحه. مش تقييم آلي."
            />
            <Perk
              icon={Award}
              title="شهادة إتمام"
              desc="بكود تحقّق، لكل كورس + شهادة AI Builder للمشروع النهائي."
            />
            <Perk
              icon={Users}
              title="مجتمع الأعضاء"
              desc="غرفة الأعضاء مع باقي الدفعة — أسئلة ومكاسب ومشاريع."
            />
            <Perk
              icon={CheckCircle2}
              title="ضمان ٧ أيام"
              desc="لو حضرت أول لايف وحسّيت إنها مش ليك، بنرجّعلك فلوسك."
            />
          </div>
        </div>
      </section>

      {/* ═══════════════  PRICE  ═══════════════ */}
      <section className="px-4 py-14 sm:py-20">
        <div className="container mx-auto max-w-2xl text-center">
          <h2 className="font-display text-2xl sm:text-4xl font-extrabold mb-6">
            السعر
          </h2>
          {membership ? (
            <p className="text-sm text-gray-600">
              عضويتك شغالة بالفعل — فاضل {membership.daysLeft} يوم.
            </p>
          ) : (
            <Plans />
          )}

          {/* Same price as everywhere else, just payable locally —
              InstaPay can't send dollars. Yearly only: a manual
              monthly transfer would be reviewed twelve times a year. */}
          <Link
            href={`/offline/egp?product=${AI_LAB_YEARLY.id}`}
            className="mt-5 block text-[11px] text-gray-500 hover:text-brand-700 underline underline-offset-4"
          >
            من مصر؟ ادفع السنوي بـ InstaPay أو Vodafone Cash (
            {AI_LAB_YEARLY.priceEgp.toLocaleString('en')} ج.م)
          </Link>
        </div>
      </section>

      {/* ═══════════════  FAQ  ═══════════════ */}
      <section className="px-4 py-14 bg-gray-50 border-t border-gray-200">
        <div className="container mx-auto max-w-2xl">
          <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-center mb-8">
            أسئلة قبل ما تشترك
          </h2>
          <div className="space-y-3">
            <Faq
              q="أنا شاري الكورسات خلاص — ليه أدفع تاني؟"
              a="مش بتدفع في الفيديوهات — دي معاك بالفعل وهتفضل معاك. بتدفع في الجدول واللايف الأسبوعي ومراجعة مشاريعك والشهادة. لو انت من النوع اللي بيخلّص لوحده، مش محتاج AI Lab."
            />
            <Faq
              q="أنا مش شاري أي كورس — ينفع أدخل؟"
              a="أيوه. عضوية AI Lab بتفتحلك محتوى المسار طول مدة الدفعة. لو عايز الكورسات تفضل معاك للأبد بعد كده، تقدر تشتريها منفصلة في أي وقت."
            />
            <Faq
              q="لو مقدرتش أحضر اللايف؟"
              a="التسجيل بيبقى متاح خلال ٢٤ ساعة، ومش بنقفله عشان نجبرك تحضر. بس اللي بيحضر بيسأل، واللي بيسأل بيخلّص."
            />
            <Faq
              q="العضوية بتتجدد لوحدها؟"
              a="أيوه — دي عضوية في برنامج مستمر، فبتتجدد شهري أو سنوي حسب اللي اخترته. تقدر توقف التجديد في أي وقت من الإعدادات، وتفضل عضو لحد آخر يوم دفعت فيه. الكورسات اللي اشتريتها منفصلة تماماً وبتفضل معاك للأبد سواء كملت في AI Lab أو لأ."
            />
            <Faq
              q="امتى بتبدأ الدفعة؟"
              a="بنعلن تاريخ بداية كل دفعة قبلها بأسبوع على الأقل، وبيوصلك على واتساب. لو اشتركت والدفعة لسه مبدأتش، بتدخل المجتمع من يومها."
            />
          </div>
        </div>
      </section>

      <div className="px-4 py-10 text-center">
        <a
          href={`https://wa.me/${OFFLINE_PAYMENTS.confirmationWhatsApp}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-gray-600 hover:text-brand-700 underline underline-offset-4"
        >
          عندك سؤال تاني؟ كلّمنا على واتساب
        </a>
      </div>
    </main>
  );
}

/* ═══════════════  BITS  ═══════════════ */

function Plans() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto text-start">
      <PlanCard product={AI_LAB_YEARLY} featured />
      <PlanCard product={AI_LAB_MONTHLY} />
    </div>
  );
}

function PlanCard({
  product,
  featured = false,
}: {
  product: PurchasableProduct;
  featured?: boolean;
}) {
  const yearly = product.interval === 'year';

  return (
    <div
      className={`rounded-2xl bg-white p-5 sm:p-6 flex flex-col ${
        featured ? 'border-2 border-brand-500/50 shadow-lg' : 'border border-gray-200'
      }`}
    >
      {featured ? (
        <div className="inline-flex self-start items-center gap-1.5 px-2.5 py-1 mb-3 rounded-full bg-brand-500 text-white text-[11px] font-bold">
          <Flame className="w-3 h-3" />
          وفّر ${AI_LAB_YEARLY_SAVINGS_USD}
        </div>
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
        <span
          className="font-display text-4xl font-extrabold text-brand-700"
          dir="ltr"
        >
          ${product.priceUsd}
        </span>
        <span className="text-sm text-gray-500 ms-1">/ {yearly ? 'سنة' : 'شهر'}</span>
      </div>

      <p className="text-xs text-gray-500 mb-4 leading-relaxed">
        {yearly
          ? `بدل $${AI_LAB_YEARLY.anchorUsd} لو دفعت شهري على مدار السنة`
          : 'تقدر توقف التجديد في أي وقت'}
      </p>

      <Button
        asChild
        size="lg"
        variant={featured ? 'default' : 'outline'}
        className="w-full font-bold mt-auto"
      >
        <Link href={checkoutHrefFor(product)}>
          احجز مكانك
          <ArrowLeft className="w-4 h-4" />
        </Link>
      </Button>
    </div>
  );
}

function Phase({
  weeks,
  title,
  outcome,
  why,
}: {
  weeks: string;
  title: string;
  outcome: string;
  why: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 flex flex-col sm:flex-row gap-4">
      <div className="flex-shrink-0">
        <div className="inline-flex items-center justify-center px-3 py-1 rounded-lg bg-brand-500/10 text-brand-700 text-sm font-bold">
          أسبوع {weeks}
        </div>
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="font-display text-lg font-extrabold mb-1">{title}</h3>
        <p className="text-sm text-gray-700 mb-1">
          <strong>المخرج:</strong> {outcome}
        </p>
        <p className="text-xs text-gray-500">{why}</p>
      </div>
    </div>
  );
}

function Perk({
  icon: Icon,
  title,
  desc,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc: string;
}) {
  return (
    <div className="rounded-2xl bg-white border border-gray-200 p-5">
      <div className="w-10 h-10 rounded-xl bg-brand-500/10 text-brand-600 flex items-center justify-center mb-3">
        <Icon className="w-5 h-5" />
      </div>
      <h3 className="font-bold text-sm mb-1">{title}</h3>
      <p className="text-xs text-gray-600 leading-relaxed">{desc}</p>
    </div>
  );
}

function Faq({ q, a }: { q: string; a: string }) {
  return (
    <details className="group rounded-xl border border-gray-200 bg-white p-4 sm:p-5 open:border-brand-500/40 open:bg-brand-500/5 transition-colors">
      <summary className="cursor-pointer font-bold list-none flex items-start justify-between gap-3">
        <span className="text-sm sm:text-base">{q}</span>
        <span className="text-brand-500 text-xl flex-shrink-0 transition-transform group-open:rotate-45 leading-none">
          +
        </span>
      </summary>
      <p className="mt-3 text-sm text-gray-600 leading-relaxed">{a}</p>
    </details>
  );
}
