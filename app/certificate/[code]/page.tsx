import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createServiceClient } from '@/lib/supabase/server';
import { APP_NAME, APP_URL } from '@/lib/constants';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import { PrintButton } from './print-button';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: { code: string } }) {
  const service = createServiceClient();
  const { data: cert } = await service
    .from('certificates')
    .select('student_name, course_title, certificate_number')
    .eq('certificate_number', params.code)
    .maybeSingle();
  if (!cert) return { title: 'شهادة — فاهم!' };
  return {
    title: `${cert.student_name} — ${cert.course_title}`,
    openGraph: {
      images: [`/api/certificates/${cert.certificate_number}/og`],
    },
  };
}

/**
 * Public, printable certificate page. The layout is sized to A4 landscape so
 * Chrome's "Save as PDF" produces a one-page file with no clipping. The
 * surrounding toolbar is hidden via @media print so the printed page is just
 * the certificate.
 */
export default async function CertificatePage({
  params,
}: {
  params: { code: string };
}) {
  const service = createServiceClient();
  const { data: cert } = await service
    .from('certificates')
    .select(
      'id, certificate_number, student_name, course_title, score_percent, duration_sec, issued_at, is_revoked'
    )
    .eq('certificate_number', params.code)
    .maybeSingle();

  if (!cert) notFound();

  const issued = new Date(cert.issued_at);
  const issuedAr = issued.toLocaleDateString('ar-EG', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const verifyUrl = `${APP_URL.replace(/\/$/, '')}/verify/${cert.certificate_number}`;

  return (
    <>
      {/* Toolbar — hidden when printing */}
      <div className="print:hidden bg-gray-100 border-b border-gray-200">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <Link
            href={`/verify/${cert.certificate_number}`}
            className="text-sm text-brand-600 hover:underline inline-flex items-center gap-1"
          >
            <ShieldCheck className="w-4 h-4" />
            صفحة التحقق
          </Link>
          <div className="flex items-center gap-2 text-sm">
            <PrintButton />
          </div>
        </div>
      </div>

      <div className="cert-shell">
        <div className={`cert ${cert.is_revoked ? 'cert--revoked' : ''}`}>
          <div className="cert__borderOuter" />
          <div className="cert__borderInner" />

          {/* Header band */}
          <div className="cert__header">
            <div className="cert__logo">ف</div>
            <div className="cert__brand">
              <div className="cert__brandName">{APP_NAME}</div>
              <div className="cert__brandTagline">منصة الكورسات بالذكاء الاصطناعي</div>
            </div>
          </div>

          {/* Body */}
          <div className="cert__body">
            <h1 className="cert__title">شهادة إتمام الكورس</h1>
            <div className="cert__rule" />
            <p className="cert__lead">تشهد منصة {APP_NAME} أنّ</p>
            <h2 className="cert__name">{cert.student_name}</h2>
            <p className="cert__lead">قد أتمّ بنجاح كورس</p>
            <h3 className="cert__course">«{cert.course_title}»</h3>
            <p className="cert__meta">
              {typeof cert.score_percent === 'number' && (
                <>
                  بتقدير <strong dir="ltr">{cert.score_percent}%</strong>
                </>
              )}
              {cert.duration_sec > 0 && (
                <>
                  {' '}
                  · <strong dir="ltr">{Math.round(cert.duration_sec / 60)}</strong> دقيقة
                  دراسية
                </>
              )}
            </p>
          </div>

          {/* Footer band */}
          <div className="cert__footer">
            <div className="cert__signature">
              <div className="cert__signatureLine" />
              <div className="cert__signatureName">Ibrahim</div>
              <div className="cert__signatureRole">مؤسس فاهم!</div>
            </div>
            <div className="cert__meta-block">
              <div dir="ltr" className="cert__date">
                {issuedAr}
              </div>
              <div dir="ltr" className="cert__number">
                {cert.certificate_number}
              </div>
              <div className="cert__metaLabel">تاريخ الإصدار / الرقم</div>
            </div>
          </div>

          <div className="cert__verify">
            تحقق من صحة هذه الشهادة:{' '}
            <span dir="ltr">{verifyUrl}</span>
          </div>

          {cert.is_revoked && <div className="cert__revokedStamp">REVOKED — مسحوبة</div>}
        </div>
      </div>

      <div className="print:hidden text-center py-6">
        <Link
          href={`/verify/${cert.certificate_number}`}
          className="text-sm text-gray-500 hover:text-brand-600 inline-flex items-center gap-1"
        >
          <ArrowRight className="w-4 h-4" />
          العودة لصفحة التحقق
        </Link>
      </div>

      <style>{certStyles}</style>
    </>
  );
}

// Scoped CSS for the certificate. Sized for A4 landscape so the browser
// "Save as PDF" / "Print" workflow produces a single tidy page.
const certStyles = `
  @page { size: A4 landscape; margin: 0; }
  @media print {
    html, body { background: #fff !important; }
  }
  .cert-shell {
    min-height: 100vh;
    background: #f3f4f6;
    padding: 24px 16px;
    display: flex;
    align-items: flex-start;
    justify-content: center;
  }
  @media print {
    .cert-shell { padding: 0; min-height: auto; }
  }
  .cert {
    position: relative;
    width: 100%;
    max-width: 297mm;
    aspect-ratio: 297 / 210;
    background: #FAFAF9;
    box-shadow: 0 30px 60px rgba(0,0,0,0.08);
    border-radius: 8px;
    overflow: hidden;
    color: #0a0a0a;
    direction: rtl;
    font-family: 'Cairo', 'Tajawal', 'Segoe UI', sans-serif;
  }
  @media print {
    .cert { box-shadow: none; border-radius: 0; max-width: none; }
  }
  .cert__borderOuter {
    position: absolute; inset: 14px;
    border: 8px solid #22C55E;
    border-radius: 12px;
    pointer-events: none;
  }
  .cert__borderInner {
    position: absolute; inset: 28px;
    border: 2px solid #D4AF37;
    border-radius: 8px;
    pointer-events: none;
  }
  .cert__header {
    position: absolute;
    top: 48px;
    right: 64px;
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .cert__logo {
    width: 56px; height: 56px;
    border-radius: 14px;
    background: #22C55E;
    color: #fff;
    display: flex; align-items: center; justify-content: center;
    font-weight: 900;
    font-size: 32px;
    line-height: 1;
  }
  .cert__brand {
    display: flex; flex-direction: column;
  }
  .cert__brandName {
    font-weight: 800; font-size: 22px; color: #0a0a0a;
  }
  .cert__brandTagline {
    font-size: 11px; color: #6b7280;
  }
  .cert__body {
    position: absolute;
    inset: 130px 80px 130px 80px;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
  }
  .cert__title {
    font-size: 28px;
    font-weight: 700;
    margin: 0;
    color: #111827;
  }
  .cert__rule {
    width: 140px;
    height: 3px;
    background: #22C55E;
    margin: 14px 0 28px;
    border-radius: 2px;
  }
  .cert__lead {
    font-size: 14px;
    color: #4b5563;
    margin: 6px 0;
  }
  .cert__name {
    font-size: 48px;
    font-weight: 800;
    margin: 8px 0 4px;
    letter-spacing: -0.5px;
    color: #0a0a0a;
  }
  .cert__course {
    font-size: 24px;
    font-weight: 600;
    font-style: italic;
    color: #16A34A;
    margin: 16px 0 10px;
  }
  .cert__meta {
    font-size: 14px;
    color: #6b7280;
    margin-top: 14px;
  }
  .cert__footer {
    position: absolute;
    bottom: 70px;
    left: 80px;
    right: 80px;
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    color: #4b5563;
    font-size: 12px;
  }
  .cert__signature {
    display: flex; flex-direction: column; align-items: flex-start;
  }
  .cert__signatureLine {
    width: 140px; height: 1px; background: #9ca3af;
    margin-bottom: 6px;
  }
  .cert__signatureName { font-weight: 700; color: #0a0a0a; }
  .cert__signatureRole { font-size: 11px; color: #6b7280; }
  .cert__meta-block {
    text-align: left;
  }
  .cert__date { font-weight: 600; color: #0a0a0a; }
  .cert__number {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 12px; color: #16A34A; margin-top: 2px;
  }
  .cert__metaLabel { font-size: 10px; color: #9ca3af; margin-top: 4px; }
  .cert__verify {
    position: absolute;
    bottom: 36px;
    left: 0; right: 0;
    text-align: center;
    font-size: 11px;
    color: #6b7280;
  }
  .cert--revoked .cert__body,
  .cert--revoked .cert__footer,
  .cert--revoked .cert__verify {
    opacity: 0.4;
  }
  .cert__revokedStamp {
    position: absolute;
    top: 50%; left: 50%;
    transform: translate(-50%, -50%) rotate(-18deg);
    border: 6px solid #dc2626;
    color: #dc2626;
    font-weight: 900;
    font-size: 56px;
    padding: 8px 28px;
    letter-spacing: 4px;
    text-transform: uppercase;
    opacity: 0.65;
    pointer-events: none;
  }
`;
