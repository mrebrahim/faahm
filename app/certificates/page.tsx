import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { APP_NAME, ROUTES, APP_URL } from '@/lib/constants';
import {
  Award,
  ShieldCheck,
  Download,
  Linkedin,
  ArrowLeft,
} from 'lucide-react';

export const metadata = { title: 'شهاداتي — فاهم!' };

export default async function StudentCertificatesPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login?redirect=/certificates');
  }

  const service = createServiceClient();
  const { data: certs } = await service
    .from('certificates')
    .select(
      'id, certificate_number, course_title, course_id, score_percent, duration_sec, issued_at, is_revoked'
    )
    .eq('user_id', user.id)
    .eq('is_revoked', false)
    .order('issued_at', { ascending: false });

  const list = certs || [];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href={ROUTES.home} className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-brand-500 flex items-center justify-center font-display font-extrabold text-white text-lg">
              ف
            </div>
            <span className="font-display font-extrabold text-xl">{APP_NAME}</span>
          </Link>
          <Button asChild variant="ghost" size="sm">
            <Link href={ROUTES.dashboard}>لوحتي</Link>
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-10 max-w-5xl">
        <div className="mb-8">
          <h1 className="font-display text-3xl md:text-4xl font-extrabold mb-2">
            شهاداتي
          </h1>
          <p className="text-gray-600 text-sm">
            {list.length === 0
              ? 'كمّل كورس وكويزاته للحصول على أول شهادة معتمدة من فاهم!.'
              : `لديك ${list.length} شهادة معتمدة من ${APP_NAME}.`}
          </p>
        </div>

        {list.length === 0 ? (
          <div className="p-16 rounded-2xl border border-gray-200 bg-white text-center">
            <Award className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <h3 className="font-bold mb-2">لسه ما حصلتش على شهادة</h3>
            <p className="text-sm text-gray-500 mb-4 max-w-md mx-auto">
              عشان تستحق الشهادة، لازم تكمّل كل دروس الكورس وتعدّي كل الكويزات
              بنسبة 70% أو أعلى.
            </p>
            <Button asChild>
              <Link href={ROUTES.courses}>تصفّح الكورسات</Link>
            </Button>
          </div>
        ) : (
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {list.map((c) => (
              <CertCard key={c.id} cert={c} />
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}

function CertCard({ cert }: { cert: any }) {
  const issued = new Date(cert.issued_at);
  const verifyUrl = `${APP_URL.replace(/\/$/, '')}/verify/${cert.certificate_number}`;
  const linkedInUrl =
    `https://www.linkedin.com/profile/add?startTask=CERTIFICATION_NAME` +
    `&name=${encodeURIComponent(cert.course_title)}` +
    `&issueYear=${issued.getFullYear()}` +
    `&issueMonth=${issued.getMonth() + 1}` +
    `&certId=${encodeURIComponent(cert.certificate_number)}` +
    `&certUrl=${encodeURIComponent(verifyUrl)}`;

  return (
    <li className="rounded-2xl border border-gray-200 bg-white overflow-hidden flex flex-col">
      <div className="aspect-[1200/630] bg-gray-50 border-b border-gray-200 overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/api/certificates/${cert.certificate_number}/og`}
          alt={cert.course_title}
          className="w-full h-full object-cover"
        />
      </div>
      <div className="p-4 flex-1 flex flex-col gap-1.5">
        <h3 className="font-bold leading-snug line-clamp-2">{cert.course_title}</h3>
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <span dir="ltr">
            {issued.toLocaleDateString('ar-EG', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            })}
          </span>
          {typeof cert.score_percent === 'number' && (
            <span dir="ltr" className="font-bold text-emerald-700">
              {cert.score_percent}%
            </span>
          )}
        </div>
        <div className="mt-3 flex items-center gap-2 flex-wrap">
          <Button asChild size="sm">
            <Link
              href={`/certificate/${cert.certificate_number}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Download className="w-3.5 h-3.5" />
              عرض / Save as PDF
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <a href={linkedInUrl} target="_blank" rel="noopener noreferrer">
              <Linkedin className="w-3.5 h-3.5" />
              LinkedIn
            </a>
          </Button>
          <Button asChild size="sm" variant="ghost">
            <Link href={`/verify/${cert.certificate_number}`} target="_blank">
              <ShieldCheck className="w-3.5 h-3.5" />
              التحقق
              <ArrowLeft className="w-3 h-3" />
            </Link>
          </Button>
        </div>
      </div>
    </li>
  );
}
