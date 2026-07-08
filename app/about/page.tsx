import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { APP_NAME, APP_TAGLINE, ROUTES } from '@/lib/constants';
import { pricingFor } from '@/lib/region';
import {
  Sparkles,
  Target,
  Users,
  Globe,
  Heart,
  ArrowLeft,
} from 'lucide-react';

export const metadata = {
  title: `عن ${APP_NAME}`,
  description: `${APP_NAME} — ${APP_TAGLINE}. تعرّف على رسالتنا، رؤيتنا، والطريقة اللي بنبني بيها أول منصة عربية لكورسات الذكاء الاصطناعي.`,
};

export const dynamic = 'force-dynamic';

export default function AboutPage() {
  const pricing = pricingFor('us');
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white/80 backdrop-blur-xl sticky top-0 z-40">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href={ROUTES.home} className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-brand-500 flex items-center justify-center font-display font-extrabold text-white">
              ف
            </div>
            <span className="font-display font-extrabold text-xl">{APP_NAME}</span>
          </Link>
          <Button asChild variant="outline" size="sm">
            <Link href={ROUTES.courses}>تصفّح الكورسات</Link>
          </Button>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] rounded-full bg-brand-500/5 blur-[160px]"
        />
        <div className="relative container mx-auto px-4 py-16 sm:py-24 text-center max-w-3xl">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-500/10 text-brand-700 text-xs font-medium mb-5">
            <Sparkles className="w-3.5 h-3.5" />
            عن المنصة
          </span>
          <h1 className="font-display text-4xl sm:text-5xl font-extrabold leading-tight mb-5">
            بنخلّي تعلّم الذكاء الاصطناعي
            <br />
            <span className="text-brand-600">سهل وعربي وعملي</span>
          </h1>
          <p className="text-lg text-gray-600 leading-relaxed">
            {APP_NAME} أول منصة عربية متخصصة في كورسات الذكاء الاصطناعي، الأتمتة،
            والتسويق الرقمي. هدفنا إنك تتعلّم من خبراء عرب بلغتك، وتطبّق فورًا
            بأدوات شغّالة في السوق.
          </p>
        </div>
      </section>

      {/* Mission */}
      <section className="container mx-auto px-4 py-16 max-w-4xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Card icon={Target} title="رسالتنا">
            نخلّي المعرفة المتقدمة في الذكاء الاصطناعي والأتمتة متاحة لأي
            طالب عربي — بلغته، بأمثلة بتمسّ شغله الحقيقي، وبأسعار تناسب السوق
            بدل ما يدفع مئات الدولارات لكورس أجنبي ما يقدرش يتابعه.
          </Card>
          <Card icon={Globe} title="رؤيتنا">
            نشوف العالم العربي وهو يقود مشاريع ذكاء اصطناعي بدل ما يكون مستهلك
            بس. ده يبدأ بإن في جيل كامل بيتعلّم الأدوات الصح بطريقة سليمة من
            أول يوم.
          </Card>
          <Card icon={Users} title="مين بيشتغل في فاهم؟">
            فريق صغير من المطوّرين والمدرّبين والمصمّمين، كلهم عرب وبيستخدموا
            نفس الأدوات اللي بيعلّموها. مفيش محتوى مترجم آلي ولا دروس عامة
            مأخوذة من مكان تاني.
          </Card>
          <Card icon={Heart} title="القيم اللي بنشتغل بيها">
            صراحة في كل درس (مفيش وعود "هتبقى مليونير"). تطبيق فوق النظري.
            دعم حقيقي لما تتعلّق. ومحتوى بيتحدّث مع تطوّر الأدوات، مش ثابت
            من سنتين.
          </Card>
        </div>
      </section>

      {/* What we offer */}
      <section className="bg-gray-50 py-16">
        <div className="container mx-auto px-4 max-w-4xl">
          <h2 className="font-display text-3xl font-bold text-center mb-10">
            إيه اللي هتلاقيه في فاهم؟
          </h2>
          <div className="space-y-4">
            <Bullet
              n="01"
              title="كورسات شاملة بالعربي"
              body="من n8n والأتمتة، لـ Vibe Coding، لإنشاء الفيديوهات بالذكاء الاصطناعي، لـ ChatGPT وأدوات الإنتاجية. كل كورس بيتدرّس من صفر."
            />
            <Bullet
              n="02"
              title="مدرّبين عرب بخبرة فعلية"
              body="مش أكاديميين، أصحاب مشاريع وشغل حقيقي بيشاركوا اللي بيشتغل معاهم — مش بس النظرية."
            />
            <Bullet
              n="03"
              title="اشتراك واحد، وصول لكل حاجة"
              body={`بدل ما تدفع لكل كورس لوحده، اشترك بـ $${pricing.yearlyAmount}/سنة (بدل $${pricing.yearlyAnchor} — خصم ${pricing.savingsPct}% لفترة محدودة) وافتح كل المحتوى. تقدر تلغي في أي وقت.`}
            />
            <Bullet
              n="04"
              title="ملفات وموارد قابلة للتحميل"
              body="مع كل درس، الـ workflows والـ prompts والشيت الجاهز عشان تطبّق دغري بدل ما تعيد كتابة كل حاجة من الأول."
            />
            <Bullet
              n="05"
              title="مسابقات وشهادات إتمام"
              body="اختبر فهمك بكويزات ع كل كورس، وخد شهادة لما تخلص — تقدر تشاركها على لينكدإن."
            />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-4 py-20 text-center max-w-2xl">
        <h2 className="font-display text-3xl sm:text-4xl font-bold mb-4">
          جاهز تبدأ رحلتك؟
        </h2>
        <p className="text-gray-600 mb-8 leading-relaxed">
          ابدأ بتصفّح الكورسات أو اشترك دلوقتي وافتح كل المحتوى.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button asChild size="lg">
            <Link href={ROUTES.pricing}>
              اشترك دلوقتي
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href={ROUTES.courses}>تصفّح الكورسات</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}

function Card({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6">
      <div className="w-11 h-11 rounded-xl bg-brand-500/10 flex items-center justify-center mb-4">
        <Icon className="w-5 h-5 text-brand-600" />
      </div>
      <h3 className="font-bold text-lg mb-2">{title}</h3>
      <p className="text-sm text-gray-600 leading-relaxed">{children}</p>
    </div>
  );
}

function Bullet({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <div className="flex gap-4 p-5 rounded-xl bg-white border border-gray-200">
      <div className="font-display font-extrabold text-brand-500 text-2xl leading-none flex-shrink-0">
        {n}
      </div>
      <div className="min-w-0">
        <h3 className="font-bold mb-1">{title}</h3>
        <p className="text-sm text-gray-600 leading-relaxed">{body}</p>
      </div>
    </div>
  );
}
