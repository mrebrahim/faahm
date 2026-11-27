import { Suspense } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { LiteYouTube } from '@/components/lite-youtube';
import { ClaudeCourseLeadForm } from '@/components/claude-course-lead-form';

const VIDEO_ID = 'y5G-1ocBij4';

export const metadata: Metadata = {
  title: { absolute: 'كورس Claude مجاني بالعربي من الصفر | فاهم' },
  description:
    'اتعلم تستخدم Claude في شغلك خطوة بخطوة — كورس مجاني بالمصري من إبراهيم خليل، اتفرج عليه أكتر من ١٣٠ ألف مرة. سيب إيميلك ونبعتلك اللينك.',
  alternates: { canonical: '/claude-course' },
  openGraph: {
    title: 'كورس Claude مجاني — بالمصري ومن الصفر',
    description:
      'كورس Claude كامل ومجاني من إبراهيم خليل. سيب إيميلك ونبعتلك اللينك.',
    url: '/claude-course',
    type: 'website',
    images: [
      {
        // TODO: swap for Mariam's 1200×630 WebP once delivered.
        url: `https://i.ytimg.com/vi/${VIDEO_ID}/maxresdefault.jpg`,
        width: 1280,
        height: 720,
        alt: 'كورس Claude مجاني بالعربي من إبراهيم خليل',
      },
    ],
  },
};

// Chapters copied from the video's own timestamps (YouTube description,
// checked 27/11). Don't add lessons that aren't in the video.
const LEARN = [
  'Claude Chat وSkills & Plugins — إزاي تخليه يشتغل معاك في الكتابة والتحليل كل يوم',
  'Claude في Excel وPowerPoint — تحليل بيانات وعروض من غير ما تتعب',
  'Claude Design ومنتج ديجيتال — تحوّل فكرة لحاجة تقدر تبيعها',
  'Claude في n8n وClaude Code — أوتوميشن وتطبيقات وإضافة Chrome، حتى لو مش مبرمج',
];

const FAQ = [
  { q: 'مجاني فعلاً؟', a: 'أيوه، مجاني بالكامل.' },
  { q: 'محتاج أكون مبرمج؟', a: 'لأ، الكورس من الصفر.' },
  {
    q: 'هيوصلني إزاي؟',
    a: 'لينك على إيميلك فورًا بعد التسجيل (وصفحة الشكر فيها اللينك كمان).',
  },
];

function FormCard({ id }: { id?: string }) {
  return (
    <div
      id={id}
      className="w-full min-w-0 rounded-2xl border bg-white p-4 sm:p-6 shadow-sm"
    >
      <Suspense fallback={<div className="h-80" aria-hidden="true" />}>
        <ClaudeCourseLeadForm source="claude-course" pagePath="/claude-course" />
      </Suspense>
    </div>
  );
}

export default function ClaudeCoursePage() {
  return (
    <main className="relative overflow-hidden">
      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4 py-6 sm:py-10">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-start lg:gap-10">
          <div className="order-1 lg:order-2 min-w-0 flex flex-col gap-4">
            <LiteYouTube
              videoId={VIDEO_ID}
              title="كورس Claude مجاني بالعربي من إبراهيم خليل"
            />
            <p className="text-sm text-gray-600 text-start">
              ▶️ أكتر من ١٣٠ ألف مشاهدة على يوتيوب
            </p>
          </div>

          <div className="order-2 lg:order-1 min-w-0 flex flex-col gap-4">
            <h1 className="text-2xl sm:text-3xl md:text-5xl font-bold leading-tight">
              كورس Claude مجاني — بالمصري ومن الصفر
            </h1>
            <p className="text-base sm:text-lg text-gray-700">
              اتعلم تخلّي Claude يشتغل معاك بجد: كتابة، تحليل، وأفكار شغل — من غير
              ما تكون مبرمج.
            </p>
            <FormCard id="signup" />
          </div>
        </div>
      </section>

      {/* What you'll learn */}
      <section className="mx-auto max-w-3xl px-4 py-6 sm:py-10">
        <h2 className="text-xl sm:text-2xl md:text-3xl font-bold mb-4">
          هتتعلم إيه
        </h2>
        <ul className="flex flex-col gap-3">
          {LEARN.map((item) => (
            <li key={item} className="flex items-start gap-2 min-w-0">
              <CheckCircle2 className="mt-1 h-5 w-5 flex-shrink-0 text-primary" />
              <span className="min-w-0">{item}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* About Ibrahim */}
      <section className="mx-auto max-w-3xl px-4 py-6 sm:py-10">
        <h2 className="text-xl sm:text-2xl md:text-3xl font-bold mb-3">
          مين إبراهيم
        </h2>
        <p className="text-gray-700">
          إبراهيم خليل — بيعلّم أدوات الذكاء الاصطناعي والأوتوميشن بالعربي، وقناته
          على يوتيوب فيها الكورس ده وكورسات n8n وVibe Coding.
        </p>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-4 py-6 sm:py-10">
        <h2 className="text-xl sm:text-2xl md:text-3xl font-bold mb-4">
          أسئلة بتتسأل كتير
        </h2>
        <div className="flex flex-col gap-3">
          {FAQ.map((f) => (
            <details key={f.q} className="rounded-xl border p-4">
              <summary className="cursor-pointer font-semibold">{f.q}</summary>
              <p className="mt-2 text-gray-700">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Second CTA */}
      <section className="mx-auto max-w-3xl px-4 py-6 sm:py-10 flex flex-col gap-4">
        <h2 className="text-xl sm:text-2xl md:text-3xl font-bold">
          يلا نبدأ — الكورس يوصلك على إيميلك
        </h2>
        <a
          href="#signup"
          className="inline-flex w-full sm:w-auto items-center justify-center rounded-md bg-primary px-6 py-3 font-semibold text-primary-foreground"
        >
          ابعتلي الكورس على إيميلي
        </a>
        <Link
          href="/courses"
          className="inline-flex items-center gap-1 text-sm text-gray-600 underline"
        >
          خلّصت الكورس؟ كمّل مع كورسات فاهم
          <ArrowLeft className="h-4 w-4" />
        </Link>
      </section>
    </main>
  );
}
