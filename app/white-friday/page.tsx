import Link from 'next/link';
import { ArrowLeft, Bot, Check, Code2, Sparkles, Video } from 'lucide-react';
import { MainNav } from '@/components/main-nav';
import { StickyMobileCTA } from '@/components/sticky-mobile-cta';
import { LandingTracker } from '@/components/landing-tracker';
import { LiteYouTube } from '@/components/lite-youtube';
import { WhiteFridayCountdown } from '@/components/white-friday-countdown';
import { resolveNavAuth } from '@/lib/nav-auth';
import { WHITE_FRIDAY_BUNDLE, checkoutHrefFor } from '@/lib/catalog';

export const metadata = {
  title: 'عرض الجمعة البيضاء | ٣ كورسات AI بسعر كورس واحد — فاهم',
  description: 'اتعلم n8n وAI Video وVibe Coding مع بعض في AI Bundle بسعر 60 دولار مرة واحدة.',
  robots: { index: false, follow: false },
};
export const dynamic = 'force-dynamic';

const product = WHITE_FRIDAY_BUNDLE;
const checkout = checkoutHrefFor(product);
const courses = [
  { icon: Bot, number: '01', slug: 'n8n', videoId: 'Vhetrc4ENHc', title: 'n8n Automation', subtitle: 'خلّي الشغل المتكرر يشتغل لوحده', text: 'اتعلم تبني workflows وتربط أدواتك وتستخدم الذكاء الاصطناعي في الأتمتة.' },
  { icon: Video, number: '02', slug: 'ai-video', videoId: 'asKe1MhYmuA', title: 'AI Video', subtitle: 'حوّل أفكارك لفيديوهات', text: 'اتعلم صناعة محتوى وفيديو باستخدام أدوات الذكاء الاصطناعي من الفكرة للتنفيذ.' },
  { icon: Code2, number: '03', slug: 'vibe-coding', videoId: '_nMiICdn9nA', title: 'Vibe Coding', subtitle: 'ابني أفكارك بالـ AI', text: 'اتعلم تحول أفكارك لمواقع وتطبيقات بمساعدة الذكاء الاصطناعي.' },
];

export default async function WhiteFridayPage() {
  const { signedIn, isAdmin } = await resolveNavAuth();
  return (
    <main dir="rtl" className="min-h-screen bg-white text-slate-950 pb-20 sm:pb-0">
      <LandingTracker />
      <StickyMobileCTA href={checkout} label={`خد التلات كورسات بـ $${product.priceUsd}`} />
      <div className="bg-red-700 px-4 py-2.5 text-center text-sm font-bold text-white">عرض الجمعة البيضاء • ٣ كورسات بسعر كورس واحد</div>
      <MainNav signedIn={signedIn} isAdmin={isAdmin} />
      <section className="overflow-hidden bg-slate-950 px-4 py-16 text-white sm:py-24">
        <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2">
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-red-400/40 bg-red-500/10 px-4 py-2 text-sm font-bold text-red-200"><Sparkles className="h-4 w-4" /> عرض الجمعة البيضاء من فاهم</div>
            <h1 className="text-4xl font-extrabold leading-tight sm:text-6xl">٣ كورسات AI<br /><span className="text-red-400">بسعر كورس واحد.</span></h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-slate-300">الـ AI بيتطور كل يوم، والمهارات اللي هتتعلمها النهارده ممكن تساعدك تواكب التغيير. ابدأ بـ n8n وAI Video وVibe Coding في باقة واحدة، بسعر كورس واحد.</p>
            <div className="mt-8 flex flex-wrap items-baseline gap-4"><span className="text-5xl font-black sm:text-6xl" dir="ltr">${product.priceUsd}</span><span className="text-xl text-slate-400 line-through" dir="ltr">${product.anchorUsd}</span><span className="rounded-full bg-red-600 px-3 py-1 text-sm font-bold">وفّر $120</span></div>
            <p className="mt-2 text-sm text-slate-400">بدل شراء كل كورس لوحده بـ $60 • دفعة واحدة • وصول دائم</p>
            <WhiteFridayCountdown />
            <Link href={checkout} className="mt-8 inline-flex min-h-[56px] w-full items-center justify-center gap-3 rounded-xl bg-red-600 px-8 text-lg font-bold text-white shadow-lg shadow-red-900/30 transition hover:bg-red-500 sm:w-auto">اشترك في الـ AI Bundle الآن <ArrowLeft className="h-5 w-5" /></Link>
            <p className="mt-4 text-sm text-slate-400">دفع بالبطاقة · <Link href="/white-friday/paypal" className="underline underline-offset-4 hover:text-white">PayPal</Link> · <Link className="underline underline-offset-4 hover:text-white" href={`/offline/egp?product=${product.id}`}>الدفع من مصر بـ InstaPay أو Vodafone Cash</Link></p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-2xl sm:p-8">
            <div className="mb-6 flex items-center justify-between"><span className="text-sm font-bold text-red-300">AI BUNDLE</span><span className="text-xs text-slate-400">٣ كورسات · وصول دائم</span></div>
            <div className="space-y-3">{courses.map(({ icon: Icon, title, subtitle, number }) => <div key={title} className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-4"><div className="rounded-xl bg-red-500/15 p-3 text-red-300"><Icon className="h-6 w-6" /></div><div className="flex-1"><p className="font-bold" dir="ltr">{title}</p><p className="mt-1 text-sm text-slate-400">{subtitle}</p></div><span className="text-sm text-slate-500">{number}</span></div>)}</div>
            <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-5"><span className="font-bold">التلات كورسات مع بعض</span><span className="text-3xl font-black" dir="ltr">${product.priceUsd}</span></div>
          </div>
        </div>
      </section>
      <section className="bg-slate-50 px-4 py-16 sm:py-20"><div className="mx-auto max-w-4xl text-center"><p className="font-bold text-red-700">المستقبل بيتغيّر بسرعة</p><h2 className="mt-3 text-3xl font-extrabold sm:text-4xl">خلّي الـ AI أداة في إيدك</h2><p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-slate-600">كل يوم بتظهر أدوات جديدة بتغيّر طريقة الشغل. بدل ما تكتفي بالفرجة، ابدأ تتعلم تستخدمها: وفّر وقتك بالأتمتة، اصنع محتوى، وحوّل أفكارك لمشاريع. مفيش ضمان لنتيجة معينة، لكن البداية خطوة مهمة لتطوير مهاراتك.</p></div></section>
      <section className="mx-auto max-w-6xl px-4 py-20 sm:py-24" id="courses"><div className="mx-auto max-w-2xl text-center"><p className="font-bold text-red-700">٣ مهارات. باقة واحدة.</p><h2 className="mt-3 text-3xl font-extrabold sm:text-4xl">شوف بنفسك هتتعلم إيه</h2><p className="mt-4 leading-7 text-slate-600">اتفرج على الفيديو التعريفي لكل كورس، واختار تبدأ بالمهارة اللي تناسب هدفك.</p></div><div className="mt-12 grid gap-5 md:grid-cols-3">{courses.map(({ icon: Icon, title, subtitle, text, number, slug, videoId }) => <article key={title} className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"><LiteYouTube videoId={videoId} title={`فيديو تعريفي لكورس ${title}`} rounded="" /><div className="p-7"><div className="flex items-center justify-between"><Icon className="h-8 w-8 text-red-600" /><span className="font-bold text-slate-300">{number}</span></div><h3 className="mt-6 text-2xl font-extrabold" dir="ltr">{title}</h3><p className="mt-3 font-bold">{subtitle}</p><p className="mt-3 leading-7 text-slate-600">{text}</p><Link href={`/course/${slug}`} className="mt-5 inline-flex items-center gap-2 font-bold text-red-700">شوف محتوى الكورس <ArrowLeft className="h-4 w-4" /></Link></div></article>)}</div><div className="mt-10 text-center"><Link href={checkout} className="inline-flex min-h-[54px] items-center justify-center gap-3 rounded-xl bg-red-700 px-8 font-bold text-white hover:bg-red-600">خد التلات كورسات بـ ${product.priceUsd} <ArrowLeft className="h-5 w-5" /></Link></div></section>
      <section id="pricing" className="bg-red-50 px-4 py-20"><div className="mx-auto max-w-3xl rounded-3xl border border-red-200 bg-white p-6 shadow-xl shadow-red-950/5 sm:p-10"><div className="text-center"><span className="rounded-full bg-red-100 px-4 py-2 text-sm font-bold text-red-700">عرض الجمعة البيضاء</span><h2 className="mt-6 text-3xl font-extrabold sm:text-4xl">كل اللي تحتاجه لتبدأ، في باقة واحدة</h2><p className="mt-4 text-slate-600">٣ كورسات كاملة بسعر كورس واحد</p></div><div className="mx-auto mt-8 max-w-md space-y-4 border-y border-slate-100 py-6">{courses.map(c => <div key={c.title} className="flex items-center gap-3 font-bold"><Check className="h-5 w-5 text-red-600" /><span dir="ltr">{c.title}</span></div>)}<div className="flex items-center gap-3 font-bold"><Check className="h-5 w-5 text-red-600" />وصول دائم للكورسات</div></div><div className="mt-7 text-center"><p className="text-slate-500">القيمة عند شراء الكورسات منفصلة: <span className="line-through" dir="ltr">${product.anchorUsd}</span></p><p className="mt-2 text-5xl font-black" dir="ltr">${product.priceUsd}</p><p className="mt-2 text-sm text-slate-500">دفعة واحدة، بدون اشتراك</p><Link href={checkout} className="mx-auto mt-6 flex min-h-[56px] max-w-md items-center justify-center gap-3 rounded-xl bg-red-700 px-6 font-bold text-white transition hover:bg-red-600">احصل على الكورسات الثلاثة الآن <ArrowLeft className="h-5 w-5" /></Link><Link href="/white-friday/paypal" className="mt-4 block text-sm font-bold text-blue-700 underline underline-offset-4">أو ادفع بـ PayPal</Link><Link href={`/offline/egp?product=${product.id}`} className="mt-4 inline-block text-sm text-slate-600 underline underline-offset-4">من مصر؟ ادفع {product.priceEgp.toLocaleString('en-US')} ج.م عبر InstaPay أو Vodafone Cash</Link></div></div></section>
      <section className="mx-auto max-w-3xl px-4 py-20"><h2 className="text-center text-3xl font-extrabold">أسئلة ممكن تكون في بالك</h2><div className="mt-8 divide-y divide-slate-200">{[['هل السعر للتلات كورسات؟', 'أيوه، السعر يشمل كورسات n8n وAI Video وVibe Coding مع بعض.'], ['هل الدفع مرة واحدة؟', 'أيوه، دفعة واحدة ووصول دائم للكورسات، من غير اشتراك متكرر.'], ['إزاي أدفع من مصر؟', 'تقدر تدفع بـ InstaPay أو Vodafone Cash، وبعد تأكيد الدفع يتم تفعيل الوصول.']].map(([q,a]) => <details key={q} className="group py-5"><summary className="cursor-pointer list-none font-bold"><span className="flex justify-between gap-4">{q}<span className="text-red-600 group-open:rotate-45">+</span></span></summary><p className="mt-3 leading-7 text-slate-600">{a}</p></details>)}</div><div className="mt-10 text-center"><Link href={checkout} className="inline-flex items-center gap-2 font-bold text-red-700">ابدأ بالكورسات الثلاثة <ArrowLeft className="h-4 w-4" /></Link></div></section>
    </main>
  );
}
