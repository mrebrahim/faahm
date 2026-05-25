import Link from 'next/link';
import { createServiceClient } from '@/lib/supabase/server';
import { APP_NAME, ROUTES } from '@/lib/constants';
import { CheckCircle2, XCircle, HelpCircle, Download } from 'lucide-react';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: { code: string } }) {
  const service = createServiceClient();
  const { data: cert } = await service
    .from('certificates')
    .select('student_name, course_title, certificate_number, is_revoked')
    .eq('certificate_number', params.code)
    .maybeSingle();

  if (!cert) {
    return {
      title: 'شهادة غير موجودة — فاهم!',
      robots: { index: false },
    };
  }
  const title = `شهادة ${cert.student_name} — ${cert.course_title}`;
  const description = cert.is_revoked
    ? `هذه الشهادة كانت صادرة من ${APP_NAME} وتم سحبها.`
    : `${APP_NAME} تؤكّد أن ${cert.student_name} قد أتمّ كورس ${cert.course_title}.`;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [`/api/certificates/${cert.certificate_number}/og`],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [`/api/certificates/${cert.certificate_number}/og`],
    },
  };
}

export default async function VerifyPage({ params }: { params: { code: string } }) {
  const service = createServiceClient();
  const { data: cert } = await service
    .from('certificates')
    .select(
      'id, certificate_number, student_name, course_title, score_percent, issued_at, revoked_at, is_revoked'
    )
    .eq('certificate_number', params.code)
    .maybeSingle();

  // Best-effort view counter — fire-and-forget. Read-modify-write is fine
  // here because verify traffic is bursty but not high-concurrency.
  if (cert) {
    const next = ((cert as any).view_count || 0) + 1;
    void service
      .from('certificates')
      .update({ view_count: next })
      .eq('id', cert.id);
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href={ROUTES.home} className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-brand-500 flex items-center justify-center font-display font-extrabold text-white text-lg">
              ف
            </div>
            <span className="font-display font-extrabold text-xl">{APP_NAME}</span>
          </Link>
          <Link href={ROUTES.courses} className="text-sm text-gray-600 hover:text-foreground">
            تصفّح الكورسات
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 max-w-3xl">
        {!cert ? (
          <NotFoundCard code={params.code} />
        ) : cert.is_revoked ? (
          <RevokedCard cert={cert} />
        ) : (
          <ValidCard cert={cert} />
        )}

        <section className="mt-12 p-6 rounded-2xl bg-white border border-gray-200 text-center">
          <h3 className="font-bold mb-2">ما هي منصة فاهم!؟</h3>
          <p className="text-sm text-gray-600 mb-4">
            أول منصة عربية لكورسات بالذكاء الاصطناعي — في الأتمتة، التسويق
            الرقمي، صناعة المحتوى، والبرمجة.
          </p>
          <Link
            href={ROUTES.home}
            className="text-sm font-bold text-brand-600 hover:underline"
          >
            تعرّف أكثر →
          </Link>
        </section>
      </main>
    </div>
  );
}

function ValidCard({ cert }: { cert: any }) {
  return (
    <div className="p-8 rounded-3xl border border-emerald-200 bg-white text-center shadow-sm">
      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-100 flex items-center justify-center">
        <CheckCircle2 className="w-9 h-9 text-emerald-600" />
      </div>
      <h1 className="font-display text-2xl md:text-3xl font-extrabold text-emerald-700 mb-1">
        شهادة موثّقة وصالحة
      </h1>
      <div className="w-16 h-0.5 bg-emerald-200 mx-auto my-4" />

      <p className="text-sm text-gray-600 mb-2">منصة فاهم! تؤكّد أنّ</p>
      <h2 className="font-display text-3xl md:text-4xl font-extrabold mb-3 leading-tight">
        {cert.student_name}
      </h2>
      <p className="text-sm text-gray-600 mb-2">قد أتمّ بنجاح كورس</p>
      <p className="font-bold text-lg text-brand-700 mb-8">«{cert.course_title}»</p>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm max-w-md mx-auto">
        <Stat label="رقم الشهادة" value={cert.certificate_number} mono />
        <Stat
          label="تاريخ الإصدار"
          value={new Date(cert.issued_at).toLocaleDateString('ar-EG', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        />
        {typeof cert.score_percent === 'number' && (
          <Stat label="النتيجة" value={`${cert.score_percent}%`} mono />
        )}
      </div>

      <div className="mt-8">
        <Link
          href={`/certificate/${cert.certificate_number}`}
          target="_blank"
          className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-brand-500 text-white font-bold hover:bg-brand-600 transition-colors text-sm"
        >
          <Download className="w-4 h-4" />
          عرض الشهادة الأصلية
        </Link>
      </div>
    </div>
  );
}

function RevokedCard({ cert }: { cert: any }) {
  return (
    <div className="p-8 rounded-3xl border border-rose-200 bg-white text-center">
      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-rose-100 flex items-center justify-center">
        <XCircle className="w-9 h-9 text-rose-600" />
      </div>
      <h1 className="font-display text-2xl md:text-3xl font-extrabold text-rose-700 mb-2">
        هذه الشهادة مسحوبة
      </h1>
      <p className="text-sm text-gray-600 mb-6 max-w-md mx-auto">
        هذه الشهادة كانت صادرة من منصة فاهم! لكنها مسحوبة حاليًا ولا تُعتبر
        صالحة.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm max-w-md mx-auto">
        <Stat label="رقم الشهادة" value={cert.certificate_number} mono />
        <Stat
          label="صدرت في"
          value={new Date(cert.issued_at).toLocaleDateString('ar-EG')}
        />
        {cert.revoked_at && (
          <Stat
            label="سُحبت في"
            value={new Date(cert.revoked_at).toLocaleDateString('ar-EG')}
          />
        )}
      </div>

      <p className="text-xs text-gray-500 mt-6">
        للاستفسار:{' '}
        <a href="mailto:support@faahm.com" className="text-brand-600 hover:underline">
          support@faahm.com
        </a>
      </p>
    </div>
  );
}

function NotFoundCard({ code }: { code: string }) {
  return (
    <div className="p-8 rounded-3xl border border-gray-200 bg-white text-center">
      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
        <HelpCircle className="w-9 h-9 text-gray-500" />
      </div>
      <h1 className="font-display text-2xl md:text-3xl font-extrabold mb-2">
        لم نعثر على هذه الشهادة
      </h1>
      <p className="text-sm text-gray-600 mb-4">
        الرقم{' '}
        <code dir="ltr" className="bg-gray-100 px-2 py-0.5 rounded">
          {code}
        </code>{' '}
        غير موجود في سجلاتنا.
      </p>
      <ul className="text-sm text-gray-600 space-y-1 max-w-sm mx-auto text-right">
        <li>• تأكّد من الرقم وحاول مرة أخرى.</li>
        <li>
          • أو اتواصل مع{' '}
          <a href="mailto:support@faahm.com" className="text-brand-600 hover:underline">
            support@faahm.com
          </a>
          .
        </li>
      </ul>
    </div>
  );
}

function Stat({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
      <div className="text-[10px] text-gray-500 mb-1">{label}</div>
      <div
        dir={mono ? 'ltr' : undefined}
        className={`text-sm font-bold ${mono ? 'font-mono' : ''}`}
      >
        {value}
      </div>
    </div>
  );
}
