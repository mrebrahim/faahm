import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { MainNav } from '@/components/main-nav';
import { StickyMobileCTA } from '@/components/sticky-mobile-cta';
import { LandingTracker } from '@/components/landing-tracker';
import { PromoCountdown } from '@/components/promo-countdown';
import { LiteYouTube } from '@/components/lite-youtube';
import { APP_NAME } from '@/lib/constants';
import { getPromoState } from '@/lib/promo';
import {
  ArrowLeft,
  Star,
  CheckCircle2,
  Sparkles,
  Bot,
  Video,
  Code,
  Package,
  ShieldCheck,
  Users,
  Clock,
  Zap,
  Gift,
  MessageCircle,
  RefreshCw,
  Server,
} from 'lucide-react';

export const metadata = {
  title: `AI Bundle — ٣ كورسات AI + سيرفر مجاني بـ $40 | ${APP_NAME}`,
  description: `اتعلم أتمتة n8n + صناعة فيديو AI + برمجة Vibe Coding في Bundle واحد بـ $40 بدلاً من $120. ضمان استرداد ٧ أيام.`,
  openGraph: {
    title: 'AI Bundle — ٣ مصادر دخل. ٩٠ يوم. $40',
    description:
      '٣ كورسات AI عربية + سيرفر مجاني + ١٥,٠٠٠ قالب + دعم WhatsApp. اشترك بـ $40 بدلاً من $120.',
    type: 'website',
  },
  robots: { index: true, follow: true },
};

export const revalidate = 300;

const CHECKOUT_HREF = 'https://n8nar.com/?add-to-cart=3351&quantity=1';
const PRICE = 40;
const ANCHOR = 120;
const SAVINGS_PCT = Math.round(((ANCHOR - PRICE) / ANCHOR) * 100);

// Video IDs — YouTube facades (thumbnail on initial paint, iframe loads
// only when the visitor taps play). Keeps the initial network cost tiny.
const HERO_VSL_ID = 'PA1tnmgkZdU';
const N8N_VIDEO_ID = 'Vhetrc4ENHc';
const AI_VIDEO_ID = 'asKe1MhYmuA';
const VIBE_VIDEO_ID = '_nMiICdn9nA';

// Course thumbnails — hosted on n8nar CDN, re-encoded by Next.js /_next/image
// to AVIF/WebP sized to the requesting viewport so the browser never sees
// the 2000×1000 source.
const N8N_THUMB =
  'https://n8nar.com/wp-content/uploads/2025/05/ezgif.com-jpg-to-webp-converter-2.webp';
const AI_VIDEO_THUMB =
  'https://n8nar.com/wp-content/uploads/2026/03/Gemini_Generated_Image_7ak3qw7ak3qw7ak3-ezgif.com-png-to-webp-converter-scaled.webp';
const VIBE_THUMB =
  'https://n8nar.com/wp-content/uploads/2026/02/Gemini_Generated_Image_iey2hciey2hciey2-ezgif.com-jpg-to-webp-converter.webp';

export default async function AIBundlePage() {
  const promo = getPromoState();

  return (
    <main className="relative min-h-screen overflow-hidden bg-white">
      <StickyMobileCTA />
      <LandingTracker />
      <MainNav signedIn={false} isAdmin={false} />

      {/* ═════════════════════════  HERO  ═════════════════════════ */}
      <section className="relative px-4 pt-8 sm:pt-14 pb-14 sm:pb-20">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[900px] rounded-full bg-brand-500/5 blur-[120px]"
        />
        <div className="relative container mx-auto max-w-5xl text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 mb-5 rounded-full border border-emerald-500/30 bg-emerald-500/10">
            <Sparkles className="w-4 h-4 text-emerald-600" />
            <span className="text-sm font-medium text-emerald-700">
              AI Bundle — ٣ مصادر دخل في مسار واحد
            </span>
          </div>

          <h1 className="font-display text-3xl sm:text-5xl md:text-6xl font-extrabold leading-tight mb-4">
            أول <span className="text-gradient-brand">$1000</span> من الـ AI في{' '}
            <span className="text-gradient-brand">٩٠ يوم</span>
            <br className="hidden sm:inline" />
            <span className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-600 block mt-3">
              بضمان استرداد ٧ أيام
            </span>
          </h1>

          <p className="max-w-2xl mx-auto text-sm sm:text-lg text-gray-600 mb-8 leading-relaxed">
            <strong>٣ كورسات عربية عملية</strong> في مسار واحد: أتمتة n8n · فيديو AI ·
            تطبيقات Vibe Coding — مع سيرفر مجاني + ١٥,٠٠٠ قالب + دعم WhatsApp مباشر.
          </p>

          {/* VSL — click-to-load facade so the ~1MB YouTube iframe doesn't
              block LCP. Thumbnail is a ~30KB WebP served by ytimg + Next
              re-encode. */}
          <div className="max-w-3xl mx-auto mb-6 rounded-2xl overflow-hidden shadow-2xl shadow-brand-500/10 border border-gray-200">
            <LiteYouTube videoId={HERO_VSL_ID} title="AI Bundle — الفيديو التعريفي" rounded="" />
          </div>

          {/* Price + CTA */}
          <div className="mx-auto max-w-md rounded-2xl border-2 border-brand-500/40 bg-white shadow-lg px-5 py-6">
            <div className="text-sm text-gray-600 mb-3">
              خد الـ Bundle بـ{' '}
              <span className="text-lg text-gray-400 line-through font-medium mx-1" dir="ltr">
                ${ANCHOR}
              </span>
              <span className="font-display text-4xl sm:text-5xl font-extrabold text-brand-700 align-baseline" dir="ltr">
                ${PRICE}
              </span>
              <span className="block text-[11px] text-gray-400 mt-1">
                خصم {SAVINGS_PCT}% لفترة محدودة · ضمان استرداد ٧ أيام
              </span>
            </div>
            <div className="mb-3 py-2 px-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium">
              <div className="inline-flex items-center gap-1.5 flex-wrap justify-center">
                <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                العرض ينتهي خلال:{' '}
                <PromoCountdown deadlineMs={promo.promoEndsAtMs} compact />
              </div>
            </div>
            <Button asChild size="lg" className="w-full font-bold min-h-[52px] text-base">
              <Link href={CHECKOUT_HREF}>
                <Gift className="w-5 h-5" />
                خد الـ Bundle بـ ${PRICE} دلوقتي
                <ArrowLeft className="w-4 h-4" />
              </Link>
            </Button>
            <div className="mt-3 text-[11px] text-gray-500 leading-relaxed">
              ✓ وصول فوري · 🛡️ ضمان ٧ أيام · 💬 دعم بالعربي 100%
            </div>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-3xl mx-auto text-center mt-8">
            <TrustStat icon={Users} value="+1,000" label="طالب انضم" />
            <TrustStat icon={Star} value="4.9★" label="متوسط التقييم" />
            <TrustStat icon={Video} value="+180" label="محاضرة" />
            <TrustStat icon={Gift} value="$394" label="بونصات مجاناً" />
          </div>
        </div>
      </section>

      {/* ═════════════════  PROBLEM STATEMENT  ═════════════════ */}
      <section className="px-4 py-14 sm:py-20 bg-gray-50 border-y border-gray-200">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center mb-10">
            <h2 className="font-display text-2xl sm:text-4xl font-extrabold mb-3">
              لو انت حاسس بأي حاجة من دي...
            </h2>
            <p className="text-gray-600">مش لوحدك. ده اللي بيمر بيه ٩ من كل ١٠ حد بيحاول يتعلم AI.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <PainCard
              emoji="😩"
              pain="بشوف فيديوهات AI مذهلة على السوشيال ومش عارف أعملها"
              solution="خطوة بخطوة — من الصفر لأول فيديو احترافي"
            />
            <PainCard
              emoji="🌍"
              pain="كل الكورسات إنجليزي — نص المعنى بيضيع مني"
              solution="عربي كامل بأمثلة من السوق العربي"
            />
            <PainCard
              emoji="🤯"
              pain="Runway ولا Kling ولا Veo؟ تخبطت — لا عرفت أختار ولا نفّذت"
              solution="مقارنات + متى تستخدم كل واحدة + قوالب جاهزة"
            />
            <PainCard
              emoji="💸"
              pain="الإنتاج التقليدي غالي — مبقدرش أتحمّل استوديو ومصور"
              solution="بلابتوب عادي + Wi-Fi = محتوى احترافي"
            />
          </div>
        </div>
      </section>

      {/* ═════════════════  THE MECHANISM  ═════════════════ */}
      <section className="px-4 py-16 sm:py-24">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center mb-12">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-500/10 text-brand-700 text-xs font-bold mb-3">
              <Zap className="w-3.5 h-3.5" />
              الطريقة اللي شغّالة
            </span>
            <h2 className="font-display text-3xl sm:text-5xl font-extrabold mb-4">
              مسار الـ <span className="text-gradient-brand">٣ مصادر</span>
            </h2>
            <p className="max-w-2xl mx-auto text-gray-600 leading-relaxed">
              ٩٠% من الناس بيتعلموا مهارة واحدة، وبعدها يستنوا العميل الأول.
              <br />
              <strong className="text-foreground">
                إحنا هنبني معاك ٣ مصادر دخل موازية — عشان لو واحد بطّئ، الباقيين شغّالين.
              </strong>
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <PathCard icon={Bot} month="الشهر ١" title="أتمتة n8n" outcome="عملاء أتمتة — ROI فوري" accent="brand" />
            <PathCard icon={Video} month="الشهر ٢" title="فيديو AI" outcome="محتوى قابل للبيع أو الاستخدام" accent="emerald" />
            <PathCard icon={Code} month="الشهر ٣" title="Vibe Coding" outcome="تطبيق SaaS كأصل رقمي" accent="indigo" />
          </div>

          <div className="rounded-2xl bg-gradient-to-br from-brand-500/5 to-white border-2 border-brand-500/30 p-6 sm:p-8 text-center">
            <p className="text-lg sm:text-xl text-gray-700 italic leading-relaxed mb-4">
              "بديت بـ n8n، بعدين AI Video، دلوقتي عندي <strong className="not-italic text-brand-700">٣ عملاء ثابتين</strong>"
            </p>
            <div className="text-xs text-gray-500 mb-6">
              — أحمد خالد, القاهرة · <span className="text-amber-500">⭐⭐⭐⭐⭐</span>
            </div>
            <Button asChild size="lg" className="font-bold min-h-[52px]">
              <Link href={CHECKOUT_HREF}>
                ابدأ مسار الـ ٣ مصادر
                <ArrowLeft className="w-4 h-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ═════════════════  COMPARISON TABLE  ═════════════════ */}
      <section className="px-4 py-14 sm:py-20 bg-gray-50 border-y border-gray-200">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center mb-10">
            <h2 className="font-display text-2xl sm:text-4xl font-extrabold mb-3">
              الفرق بيننا وبين البدايل
            </h2>
            <p className="text-gray-600">قارن بنفسك — الأرقام تتكلم.</p>
          </div>
          <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
            <table className="w-full text-sm bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <thead className="bg-brand-500 text-white">
                <tr>
                  <th className="text-start px-3 sm:px-4 py-3 font-bold">المقارنة</th>
                  <th className="text-center px-3 sm:px-4 py-3 font-bold bg-brand-600">AI Bundle</th>
                  <th className="text-center px-3 sm:px-4 py-3 font-medium opacity-80">كورسات إنجليزي</th>
                  <th className="text-center px-3 sm:px-4 py-3 font-medium opacity-80">مدرّب خاص</th>
                  <th className="text-center px-3 sm:px-4 py-3 font-medium opacity-80">لوحدك</th>
                </tr>
              </thead>
              <tbody className="text-xs sm:text-sm">
                <CompareRow feature="السعر" bundle={`$${PRICE}`} a="$500-2000" b="$3000+" c="مجاني (بضريبة الوقت)" />
                <CompareRow feature="اللغة" bundle="✅ عربي كامل" a="❌ إنجليزي" b="حسب المدرّب" c="حسب المصدر" />
                <CompareRow feature="الوقت للنتيجة" bundle="✅ ٧ أيام" a="30-60 يوم" b="60-90 يوم" c="❌ 6-12 شهر" />
                <CompareRow feature="٣ مهارات موازية" bundle="✅" a="❌" b="❌" c="❌" />
                <CompareRow feature="دعم عربي مباشر" bundle="✅ WhatsApp" a="❌" b="✅ (غالي)" c="❌" />
                <CompareRow feature="ضمان استرداد" bundle="✅ ٧ أيام" a="نادراً" b="نادراً" c="لا يوجد" />
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ═════════════════  WHAT'S INSIDE — 3 COURSES with previews  ═════════════════ */}
      <section className="px-4 py-16 sm:py-24">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl sm:text-5xl font-extrabold mb-3">
              اللي جوّه الـ <span className="text-gradient-brand">Bundle</span>
            </h2>
            <p className="text-gray-600 max-w-xl mx-auto">
              ٣ كورسات كاملة — كل كورس بيديك مهارة تكسب بيها من أول أسبوع. اضغط على الصورة تشوف فيديو تعريفي.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <CourseCard
              icon={Bot}
              accent="brand"
              title="أتمتة n8n"
              stats="+80 محاضرة · سيرفر مجاني"
              audience="فريلانسر / صاحب بيزنس / موظف"
              firstWin="أول أتمتة WhatsApp شغّالة في ٧ أيام"
              thumb={N8N_THUMB}
              videoId={N8N_VIDEO_ID}
            />
            <CourseCard
              icon={Video}
              accent="emerald"
              title="AI Video Master"
              stats="+80 محاضرة · مشروع فيلم ٣٠ دقيقة"
              audience="Content creator / مسوّق / صانع محتوى"
              firstWin="أول فيديو AI احترافي جاهز للنشر في ٧ أيام"
              thumb={AI_VIDEO_THUMB}
              videoId={AI_VIDEO_ID}
            />
            <CourseCard
              icon={Code}
              accent="indigo"
              title="Vibe Coding"
              stats="+40 محاضرة · +8 مشاريع SaaS"
              audience="رواد أعمال / أصحاب أفكار تطبيقات"
              firstWin="أول تطبيق shippable في ٧ أيام"
              thumb={VIBE_THUMB}
              videoId={VIBE_VIDEO_ID}
            />
          </div>

          <div className="text-center mt-10">
            <Button asChild size="lg" className="font-bold">
              <Link href={CHECKOUT_HREF}>
                خد الـ ٣ كورسات بـ ${PRICE}
                <ArrowLeft className="w-4 h-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ═════════════════  BONUS STACK  ═════════════════ */}
      <section className="px-4 py-16 sm:py-24 bg-gradient-to-br from-amber-50 via-white to-brand-500/5 border-y border-amber-200">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500 text-white text-xs font-bold mb-3">
              <Gift className="w-4 h-4" />
              بونصات مجانية
            </div>
            <h2 className="font-display text-3xl sm:text-5xl font-extrabold mb-3">
              <span className="text-amber-600">$394</span> بونصات إضافية
            </h2>
            <p className="text-gray-600">مع كل Bundle — بدون أي تكلفة إضافية.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <BonusCard icon={Video} title="+5,000 فيديو AI جاهز" desc="مكتبة PLR/MRR تستخدمها في مشاريعك أو تعيد بيعها." value={244} />
            <BonusCard icon={Package} title="15,000 سكربت أتمتة n8n" desc="قوالب جاهزة لكل صناعة — بس ابدأ استخدامها." value={50} />
            <BonusCard icon={Server} title="سيرفر n8n مجاني — سنة كاملة" desc="مش محتاج تدفع hosting — السيرفر عندنا." value={30} />
            <BonusCard icon={MessageCircle} title="مجتمع WhatsApp + دعم مباشر" desc="اسأل أي سؤال، رد خلال ساعات، مش يومين." value={30} />
            <BonusCard icon={RefreshCw} title="تحديثات مجانية — سنة كاملة" desc="كل كورس جديد أو تحديث بيوصلك مجاناً." value={40} wide />
          </div>

          <div className="mt-8 text-center">
            <p className="text-sm text-gray-600 mb-1">إجمالي قيمة البونصات:</p>
            <p className="font-display text-3xl sm:text-4xl font-extrabold text-amber-600" dir="ltr">
              $394 <span className="text-lg font-medium text-gray-500">— مجاناً</span>
            </p>
          </div>
        </div>
      </section>

      {/* ═════════════════  VALUE RECAP  ═════════════════ */}
      <section className="px-4 py-16 sm:py-24">
        <div className="container mx-auto max-w-2xl">
          <div className="text-center mb-8">
            <h2 className="font-display text-2xl sm:text-4xl font-extrabold mb-2">الحسبة كاملة</h2>
            <p className="text-gray-600">شوف اللي هتاخده مقابل اللي هتدفعه.</p>
          </div>

          <div className="rounded-2xl border-2 border-brand-500/40 bg-white p-5 sm:p-6 shadow-lg">
            <ValueRow icon="🤖" text="كورس n8n Automation" value={40} />
            <ValueRow icon="🎬" text="كورس AI Video Master" value={40} />
            <ValueRow icon="💻" text="كورس Vibe Coding" value={40} />
            <div className="my-3 border-t border-dashed border-gray-200" />
            <ValueRow icon="🎁" text="+5,000 فيديو AI (PLR/MRR)" value={244} />
            <ValueRow icon="📦" text="15,000 سكربت أتمتة n8n" value={50} />
            <ValueRow icon="🖥️" text="سيرفر n8n سنة كاملة" value={30} />
            <ValueRow icon="💬" text="مجتمع WhatsApp + دعم" value={30} />
            <ValueRow icon="🔄" text="تحديثات مجانية سنة كاملة" value={40} />
            <div className="my-4 border-t-2 border-gray-300" />
            <div className="flex items-center justify-between text-lg font-bold mb-2">
              <span>القيمة الإجمالية:</span>
              <span dir="ltr" className="line-through text-gray-400">$514</span>
            </div>
            <div className="flex items-center justify-between text-2xl sm:text-3xl font-extrabold text-brand-700">
              <span>سعرك اليوم:</span>
              <span dir="ltr">${PRICE}</span>
            </div>
            <div className="mt-4 py-2 px-3 rounded-lg bg-emerald-100 text-emerald-800 text-center text-sm font-bold">
              ✅ وفّرت $474 — خصم 92%
            </div>
          </div>

          <div className="mt-6 text-center">
            <Button asChild size="lg" className="font-bold w-full sm:w-auto min-h-[56px]">
              <Link href={CHECKOUT_HREF}>
                <Gift className="w-5 h-5" />
                خد كل ده بـ ${PRICE} دلوقتي
                <ArrowLeft className="w-4 h-4" />
              </Link>
            </Button>
            <p className="mt-3 text-[11px] text-gray-500">
              🔒 دفع آمن · ⚡ وصول فوري · 🛡️ ضمان استرداد ٧ أيام
            </p>
          </div>
        </div>
      </section>

      {/* ═════════════════  TESTIMONIALS  ═════════════════ */}
      <section className="px-4 py-16 sm:py-24 bg-gray-50 border-y border-gray-200">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center mb-10">
            <h2 className="font-display text-3xl sm:text-5xl font-extrabold mb-3">+1,000 طالب بدأوا رحلتهم</h2>
            <p className="text-gray-600 max-w-xl mx-auto">دي حقيقة أرقام حصلت لناس زيّك بالظبط.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Testimonial tag="n8n" name="أحمد خالد" city="القاهرة" quote="بديت بـ n8n، بعدين AI Video. دلوقتي عندي ٣ عملاء ثابتين بيدفعوا شهرياً." />
            <Testimonial tag="AI Video" name="سارة المنصور" city="الرياض" quote="أول فيديو AI عمله وصل مليون مشاهدة. البراند بتاعي كبر ٣ أضعاف في شهرين." />
            <Testimonial tag="Vibe Coding" name="محمد العمري" city="الكويت" quote="طلعت أول SaaS بتاعي في ٦ أسابيع. دلوقتي بيجيبلي $800/شهر." />
            <Testimonial tag="Bundle" name="لينا حسن" city="بيروت" quote="دخلي زاد ٣ أضعاف في ٤ شهور. الـ ٣ كورسات مكمّلين بعض." />
            <Testimonial tag="n8n" name="عمر الرشيد" city="دبي" quote="كنت باخد ساعتين على كل مهمة روتينية. دلوقتي ١٥ دقيقة." />
            <Testimonial tag="AI Video" name="نور الدين بوعزيز" city="تونس" quote="بعت ٥ فيديوهات لعميل بسعر $2000. عيالي بيبيعوا محتوى AI دلوقتي." />
          </div>
        </div>
      </section>

      {/* ═════════════════  GUARANTEE  ═════════════════ */}
      <section className="px-4 py-16 sm:py-24">
        <div className="container mx-auto max-w-2xl text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-emerald-500/10 flex items-center justify-center border-2 border-emerald-500/30">
            <ShieldCheck className="w-10 h-10 text-emerald-600" />
          </div>
          <h2 className="font-display text-3xl sm:text-4xl font-extrabold mb-4">ضمان استرداد كامل — ٧ أيام</h2>
          <p className="text-lg text-gray-700 leading-relaxed mb-3">
            جرّب الـ ٣ كورسات لمدة ٧ أيام كاملة. لو مش راضي لأي سبب —
            <strong> هترد فلوسك كاملة بدون أي أسئلة.</strong>
          </p>
          <p className="text-sm text-gray-500">
            كلّمنا على واتساب خلال ٧ أيام من الشراء، وهنرجّعلك المبلغ على نفس طريقة الدفع.
          </p>
          <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 text-emerald-700 text-sm font-bold">
            <CheckCircle2 className="w-4 h-4" />
            صفر مخاطرة عليك
          </div>
        </div>
      </section>

      {/* ═════════════════  MINI-FAQ  ═════════════════ */}
      <section className="px-4 py-14 bg-gray-50 border-y border-gray-200">
        <div className="container mx-auto max-w-2xl">
          <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-center mb-8">
            أسئلة سريعة قبل ما تشترك
          </h2>
          <div className="space-y-3">
            <FaqItem q="أنا مبتدئ تماماً — هينفع معايا؟" a="أيوه، الـ ٣ كورسات مصممين من الصفر. الدرس الأول في كل كورس بيفترض إنك لسه ما استخدمتش أي أداة قبل كده." />
            <FaqItem q="لو مش عاجبني، هرجّع فلوسي إزاي؟" a="كلّمنا على واتساب خلال ٧ أيام من تاريخ الشراء، ابعت رقم الطلب، وهنرجّعلك المبلغ كامل خلال ٤٨ ساعة." />
            <FaqItem q="الوصول امتى؟" a="فوري بعد الدفع. الإيميل والوصول للـ ٣ كورسات بيوصلك في نفس اللحظة." />
          </div>
        </div>
      </section>

      {/* ═════════════════  FINAL CTA  ═════════════════ */}
      <section className="px-4 py-16 sm:py-24 bg-gradient-to-br from-brand-500 via-brand-600 to-emerald-700 text-white text-center">
        <div className="container mx-auto max-w-3xl">
          <h2 className="font-display text-3xl sm:text-5xl font-extrabold mb-4 leading-tight">
            ٣ مصادر دخل. ٩٠ يوم. <span dir="ltr">${PRICE}</span> فقط.
          </h2>
          <p className="text-lg opacity-95 mb-8">قرارك النهارده هيحدد الـ ٩٠ يوم اللي جاية.</p>

          <div className="max-w-md mx-auto rounded-2xl bg-white/10 backdrop-blur border border-white/30 p-4 mb-6">
            <div className="text-xs opacity-90 mb-2">العرض ينتهي خلال:</div>
            <PromoCountdown deadlineMs={promo.promoEndsAtMs} />
          </div>

          <Button asChild size="lg" className="bg-white text-brand-700 hover:bg-gray-100 font-bold min-h-[60px] text-base sm:text-lg w-full sm:w-auto">
            <Link href={CHECKOUT_HREF}>
              <Gift className="w-5 h-5" />
              اشترك في الـ Bundle بـ ${PRICE}
              <ArrowLeft className="w-5 h-5" />
            </Link>
          </Button>

          <div className="mt-6 text-sm opacity-90 flex items-center justify-center gap-4 flex-wrap">
            <span>🔒 دفع آمن</span>
            <span>·</span>
            <span>⚡ وصول فوري</span>
            <span>·</span>
            <span>🛡️ ضمان ٧ أيام</span>
          </div>

          <div className="mt-8 p-5 rounded-xl bg-white/10 backdrop-blur border border-white/20 max-w-md mx-auto">
            <div className="text-amber-300 mb-2">⭐⭐⭐⭐⭐</div>
            <p className="text-sm italic opacity-95 mb-2">"دخلي زاد ٣ أضعاف في ٤ شهور."</p>
            <div className="text-xs opacity-80">— لينا حسن, Digital Agency, بيروت</div>
          </div>
        </div>
      </section>

      {/* ═════════════════  FULL FAQ  ═════════════════ */}
      <section className="px-4 py-16 sm:py-24">
        <div className="container mx-auto max-w-2xl">
          <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-center mb-8">أسئلة شائعة</h2>
          <div className="space-y-3">
            <FaqItem q="الكورسات مناسبة للمبتدئين؟" a="أيوه — كل كورس من الـ ٣ بيبدأ من الصفر. لو مبتدئ في الأدوات دي، مش هتحتاج أي خلفية تقنية سابقة." />
            <FaqItem q="امتى هاخد الوصول؟" a="فوراً بعد الدفع. بتوصلك رسالة تأكيد فيها بيانات الدخول لكل الكورسات." />
            <FaqItem q="سياسة الاسترداد؟" a="ضمان استرداد كامل خلال ٧ أيام من الشراء — بدون أسئلة. كلّمنا على واتساب وارجعلك فلوسك." />
            <FaqItem q="الكورسات محدثة لـ 2026؟" a="أيوه. الأدوات (n8n, Runway, Kling, Cursor, إلخ) بتتحدث كل شوية، وإحنا بنحدث الكورسات باستمرار. التحديثات كلها مجاناً لسنة كاملة." />
            <FaqItem q="طرق الدفع المتاحة؟" a="بطاقات فيزا وماستركارد (عبر Stripe) و PayPal. للعملاء في مصر: InstaPay أو Vodafone Cash. للعملاء في السعودية: Barq." />
            <FaqItem q="الدعم الفني بعد الشراء؟" a="مجتمع WhatsApp خاص فيه المدرّبين + الطلاب. ترد على أي سؤال خلال ساعات، مش يومين." />
            <FaqItem q="أقدر أشتري كورس واحد بس؟" a="أيوه — الكورسات متاحة فرادى بسعر $40 لكل كورس. بس الـ Bundle بيديك الـ ٣ + البونصات ($394 قيمة إضافية) بنفس السعر — عرض أفضل بمراحل." />
          </div>
        </div>
      </section>
    </main>
  );
}

/* ═════════════════════════════════════════════════════════════
   BITS
   ═════════════════════════════════════════════════════════════ */

function TrustStat({
  icon: Icon,
  value,
  label,
}: {
  icon: React.ComponentType<{ className?: string }>;
  value: string;
  label: string;
}) {
  return (
    <div className="rounded-xl bg-white border border-gray-200 p-3">
      <Icon className="w-4 h-4 text-brand-500 mx-auto mb-1.5" />
      <div className="font-display text-lg sm:text-xl font-extrabold">{value}</div>
      <div className="text-[10px] sm:text-xs text-gray-500 mt-0.5">{label}</div>
    </div>
  );
}

function PainCard({ emoji, pain, solution }: { emoji: string; pain: string; solution: string }) {
  return (
    <div className="rounded-2xl bg-white border border-gray-200 p-5 sm:p-6 hover:border-brand-500/40 transition-colors">
      <div className="text-3xl mb-3">{emoji}</div>
      <p className="text-gray-800 font-bold mb-3 leading-snug">"{pain}"</p>
      <div className="pt-3 border-t border-gray-100 text-sm text-brand-700 flex items-start gap-2">
        <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
        <span>{solution}</span>
      </div>
    </div>
  );
}

function PathCard({
  icon: Icon,
  month,
  title,
  outcome,
  accent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  month: string;
  title: string;
  outcome: string;
  accent: 'brand' | 'emerald' | 'indigo';
}) {
  const grad = {
    brand: 'from-brand-500 to-brand-600 border-brand-500/40',
    emerald: 'from-emerald-500 to-emerald-600 border-emerald-500/40',
    indigo: 'from-indigo-500 to-indigo-600 border-indigo-500/40',
  }[accent];

  return (
    <div className={`rounded-2xl bg-white border-2 ${grad.split(' ')[2]} overflow-hidden shadow-sm`}>
      <div className={`bg-gradient-to-br ${grad.split(' ').slice(0, 2).join(' ')} text-white p-5 text-center`}>
        <Icon className="w-8 h-8 mx-auto mb-2 opacity-90" />
        <div className="text-xs opacity-90 mb-1">{month}</div>
        <div className="font-display text-xl font-extrabold">{title}</div>
      </div>
      <div className="p-4 text-center">
        <div className="text-xs text-gray-500 mb-1">النتيجة:</div>
        <div className="text-sm font-medium text-gray-800">{outcome}</div>
      </div>
    </div>
  );
}

function CompareRow({
  feature, bundle, a, b, c,
}: { feature: string; bundle: string; a: string; b: string; c: string }) {
  return (
    <tr className="border-t border-gray-100">
      <td className="px-3 sm:px-4 py-3 font-medium">{feature}</td>
      <td className="px-3 sm:px-4 py-3 text-center bg-brand-500/5 font-bold text-brand-700">{bundle}</td>
      <td className="px-3 sm:px-4 py-3 text-center text-gray-600">{a}</td>
      <td className="px-3 sm:px-4 py-3 text-center text-gray-600">{b}</td>
      <td className="px-3 sm:px-4 py-3 text-center text-gray-600">{c}</td>
    </tr>
  );
}

function CourseCard({
  icon: Icon,
  accent,
  title,
  stats,
  audience,
  firstWin,
  thumb,
  videoId,
}: {
  icon: React.ComponentType<{ className?: string }>;
  accent: 'brand' | 'emerald' | 'indigo';
  title: string;
  stats: string;
  audience: string;
  firstWin: string;
  thumb: string;
  videoId: string;
}) {
  const iconBg = {
    brand: 'bg-brand-500/10 text-brand-600',
    emerald: 'bg-emerald-500/10 text-emerald-600',
    indigo: 'bg-indigo-500/10 text-indigo-600',
  }[accent];

  return (
    <div className="rounded-2xl bg-white border border-gray-200 overflow-hidden hover:border-brand-500/40 hover:shadow-md transition-all flex flex-col">
      {/* Poster image with click-to-play video overlay */}
      <div className="relative">
        <PosterWithVideo posterSrc={thumb} posterAlt={title} videoId={videoId} title={title} />
      </div>

      <div className="p-6 flex-1 flex flex-col">
        <div className={`w-11 h-11 rounded-xl ${iconBg} flex items-center justify-center mb-3`}>
          <Icon className="w-5 h-5" />
        </div>
        <h3 className="font-display text-xl font-extrabold mb-1">{title}</h3>
        <p className="text-xs text-gray-500 mb-4">{stats}</p>

        <div className="text-xs text-gray-500 mb-1 uppercase tracking-wide font-semibold">من هيستفيد:</div>
        <p className="text-sm text-gray-700 mb-4">{audience}</p>

        <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 mt-auto">
          <div className="text-[10px] font-bold text-amber-800 uppercase tracking-wide mb-1">
            🏆 First Win في ٧ أيام
          </div>
          <p className="text-xs text-amber-900 leading-snug">{firstWin}</p>
        </div>
      </div>
    </div>
  );
}

/**
 * Course-card hero image. Shows the n8nar poster on mount (via Next Image
 * so we get AVIF + responsive sizes for free) and swaps to a lite-youtube
 * facade the moment the visitor taps play.
 */
function PosterWithVideo({
  posterSrc,
  posterAlt,
  videoId,
  title,
}: {
  posterSrc: string;
  posterAlt: string;
  videoId: string;
  title: string;
}) {
  // We defer the interactivity to LiteYouTube; it renders its own
  // thumbnail from ytimg. To honor the branded poster the merchant
  // supplied, stack it on top with pointer-events-none until click.
  return (
    <div className="relative w-full aspect-video bg-gray-900 group">
      {/* Branded poster from n8nar CDN, Next-optimized */}
      <Image
        src={posterSrc}
        alt={posterAlt}
        fill
        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 400px"
        className="object-cover"
        loading="lazy"
      />
      {/* Click layer that swaps to LiteYouTube via the button below.
          We render LiteYouTube as an absolute overlay so its play button
          sits on top of the poster and its iframe replaces the whole area
          when active. */}
      <div className="absolute inset-0">
        <LiteYouTube videoId={videoId} title={title} rounded="" />
      </div>
    </div>
  );
}

function BonusCard({
  icon: Icon, title, desc, value, wide = false,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc: string;
  value: number;
  wide?: boolean;
}) {
  return (
    <div className={`rounded-2xl bg-white border border-amber-200 p-5 hover:border-amber-400 transition-colors ${wide ? 'sm:col-span-2' : ''}`}>
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center flex-shrink-0">
          <Icon className="w-6 h-6 text-amber-600" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-sm mb-1">{title}</h3>
          <p className="text-xs text-gray-600 leading-relaxed">{desc}</p>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs text-gray-500 line-through" dir="ltr">${value}</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500 text-white font-bold">
              🎁 مجاناً
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function ValueRow({ icon, text, value }: { icon: string; text: string; value: number }) {
  return (
    <div className="flex items-center justify-between py-2 text-sm">
      <span className="flex items-center gap-2 min-w-0">
        <span className="text-lg flex-shrink-0">{icon}</span>
        <span className="text-gray-700 truncate">{text}</span>
      </span>
      <span dir="ltr" className="font-bold text-gray-800 flex-shrink-0">${value}</span>
    </div>
  );
}

function Testimonial({ tag, name, city, quote }: { tag: string; name: string; city: string; quote: string }) {
  const initial = name.charAt(0);
  const tagColor = {
    n8n: 'bg-brand-500/10 text-brand-700',
    'AI Video': 'bg-emerald-500/10 text-emerald-700',
    'Vibe Coding': 'bg-indigo-500/10 text-indigo-700',
    Bundle: 'bg-amber-500/10 text-amber-700',
  }[tag] || 'bg-gray-100 text-gray-700';

  return (
    <div className="rounded-2xl bg-white border border-gray-200 p-5 h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${tagColor}`}>{tag}</span>
        <span className="text-amber-500 text-xs">⭐⭐⭐⭐⭐</span>
      </div>
      <p className="text-sm text-gray-700 leading-relaxed flex-1 mb-4">"{quote}"</p>
      <div className="flex items-center gap-3 pt-3 border-t border-gray-100">
        <div className="w-9 h-9 rounded-full bg-brand-500 text-white flex items-center justify-center font-bold flex-shrink-0">
          {initial}
        </div>
        <div className="min-w-0">
          <div className="text-sm font-bold truncate">{name}</div>
          <div className="text-[11px] text-gray-500 truncate">{city}</div>
        </div>
      </div>
    </div>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  return (
    <details className="group rounded-xl border border-gray-200 bg-white p-4 sm:p-5 open:border-brand-500/40 open:bg-brand-500/5 transition-colors">
      <summary className="cursor-pointer font-bold list-none flex items-start justify-between gap-3">
        <span className="text-sm sm:text-base">{q}</span>
        <span className="text-brand-500 text-xl flex-shrink-0 transition-transform group-open:rotate-45 leading-none">+</span>
      </summary>
      <p className="mt-3 text-sm text-gray-600 leading-relaxed">{a}</p>
    </details>
  );
}
