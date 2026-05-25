import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createServiceClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/admin-guard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  ArrowRight,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ExternalLink,
  Trash2,
  RotateCcw,
  Download,
} from 'lucide-react';
import {
  revokeCertificate,
  reinstateCertificate,
  deleteCertificate,
} from '../actions';

export const metadata = { title: 'تفاصيل شهادة — إدارة فاهم!' };

export default async function CertificateDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { success?: string; error?: string };
}) {
  await requireAdmin();
  const service = createServiceClient();

  const { data: cert } = await service
    .from('v_certificates_admin')
    .select('*')
    .eq('id', params.id)
    .maybeSingle();
  if (!cert) notFound();

  const { data: audit } = await service
    .from('admin_audit_log')
    .select('id, action, user_email, result, error_message, created_at, metadata')
    .eq('resource_type', 'certificate')
    .eq('resource_id', params.id)
    .order('created_at', { ascending: false })
    .limit(50);

  return (
    <div className="p-6 lg:p-8 max-w-5xl">
      <Link
        href="/admin/certificates"
        className="text-sm text-brand-600 hover:text-brand-700 inline-flex items-center gap-1 mb-3"
      >
        <ArrowRight className="w-4 h-4" />
        العودة للشهادات
      </Link>

      <div className="flex items-center justify-between gap-3 flex-wrap mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <code dir="ltr" className="font-mono text-xl bg-gray-100 px-2 py-1 rounded">
              {cert.certificate_number}
            </code>
            {cert.is_revoked ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-rose-50 text-rose-700">
                <XCircle className="w-3 h-3" /> مسحوبة
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-emerald-50 text-emerald-700">
                <CheckCircle2 className="w-3 h-3" /> صالحة
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500">
            صدرت في{' '}
            <span dir="ltr">
              {new Date(cert.issued_at).toLocaleDateString('ar-EG', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <a
              href={`/verify/${cert.certificate_number}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="w-4 h-4" />
              صفحة التحقق
            </a>
          </Button>
          <Button asChild size="sm">
            <a
              href={`/certificate/${cert.certificate_number}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Download className="w-4 h-4" />
              عرض الشهادة
            </a>
          </Button>
        </div>
      </div>

      {searchParams.error && (
        <Alert kind="error" message={decodeURIComponent(searchParams.error)} />
      )}
      {searchParams.success && (
        <Alert
          kind="success"
          message={
            searchParams.success === 'issued'
              ? 'تم إصدار الشهادة.'
              : searchParams.success === 'revoked'
                ? 'تم سحب الشهادة.'
                : searchParams.success === 'reinstated'
                  ? 'تم إعادة تفعيل الشهادة.'
                  : 'تم.'
          }
        />
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card title="معلومات الشهادة">
            <Row label="الطالب">
              <div>
                {cert.student_name}
                {cert.user_email && (
                  <div className="text-xs text-gray-500" dir="ltr">
                    {cert.user_email}
                  </div>
                )}
              </div>
            </Row>
            <Row label="الكورس">
              {cert.course_slug ? (
                <Link
                  href={`/course/${cert.course_slug}`}
                  target="_blank"
                  className="text-brand-600 hover:underline"
                >
                  {cert.course_title}
                </Link>
              ) : (
                cert.course_title
              )}
            </Row>
            {typeof cert.score_percent === 'number' && (
              <Row label="النتيجة">
                <span dir="ltr" className="font-bold">
                  {cert.score_percent}%
                </span>
              </Row>
            )}
            {cert.duration_sec > 0 && (
              <Row label="مدة الكورس">
                <span dir="ltr">{Math.round(cert.duration_sec / 60)} دقيقة</span>
              </Row>
            )}
            <Row label="مصدر الإصدار">
              {cert.issued_by ? (
                <span>
                  يدوي
                  {cert.issue_reason && (
                    <span className="block text-xs text-gray-500">
                      السبب: {cert.issue_reason}
                    </span>
                  )}
                </span>
              ) : (
                <span>تلقائي (Trigger)</span>
              )}
            </Row>
            {cert.is_revoked && (
              <>
                <Row label="تاريخ السحب">
                  <span dir="ltr">
                    {cert.revoked_at &&
                      new Date(cert.revoked_at).toLocaleDateString('ar-EG')}
                  </span>
                </Row>
                {cert.revoke_reason && (
                  <Row label="سبب السحب">{cert.revoke_reason}</Row>
                )}
              </>
            )}
            <Row label="مشاهدات صفحة التحقق">
              <span dir="ltr">{cert.view_count || 0}</span>
            </Row>
          </Card>

          {/* Actions */}
          <Card title="إجراءات">
            {!cert.is_revoked ? (
              <details>
                <summary className="text-sm font-medium text-rose-600 cursor-pointer mb-2">
                  🚫 سحب الشهادة
                </summary>
                <form action={revokeCertificate} className="space-y-3 mt-3">
                  <input type="hidden" name="id" value={cert.id} />
                  <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900">
                    ⚠ صفحة التحقق هتعرض "مسحوبة". صفحة الشهادة هتعرض watermark.
                    الإجراء قابل للإعادة من نفس الصفحة.
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="reason">السبب</Label>
                    <Input
                      id="reason"
                      name="reason"
                      required
                      placeholder="احتيال / معلومات خاطئة / طلب الطالب..."
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="confirm">اكتب REVOKE للتأكيد</Label>
                    <Input id="confirm" name="confirm" required dir="ltr" />
                  </div>
                  <Button type="submit" variant="destructive">
                    تأكيد السحب
                  </Button>
                </form>
              </details>
            ) : (
              <form action={reinstateCertificate}>
                <input type="hidden" name="id" value={cert.id} />
                <Button type="submit" variant="outline">
                  <RotateCcw className="w-4 h-4" />
                  إعادة تفعيل الشهادة
                </Button>
              </form>
            )}

            <details className="mt-4">
              <summary className="text-sm font-medium text-rose-600 cursor-pointer">
                🗑 حذف نهائي
              </summary>
              <form action={deleteCertificate} className="mt-3 space-y-2">
                <input type="hidden" name="id" value={cert.id} />
                <p className="text-xs text-rose-700">
                  الحذف بيمسح الصف نهائيًا — صفحة التحقق هترجع 404. يفضّل
                  استخدام "سحب" بدل الحذف.
                </p>
                <Button type="submit" variant="destructive" size="sm">
                  <Trash2 className="w-4 h-4" />
                  حذف
                </Button>
              </form>
            </details>
          </Card>

          {/* Timeline */}
          <Card title="السجل">
            {(audit || []).length === 0 ? (
              <p className="text-sm text-gray-500">مفيش أحداث.</p>
            ) : (
              <ul className="space-y-2">
                {(audit || []).map((a: any) => (
                  <li key={a.id} className="text-sm flex items-start gap-2">
                    <span
                      className="text-[10px] text-gray-400 mt-0.5 whitespace-nowrap"
                      dir="ltr"
                    >
                      {new Date(a.created_at).toLocaleString('ar-EG')}
                    </span>
                    <div className="min-w-0">
                      <div className="font-medium" dir="ltr">
                        {a.action}
                        {a.result === 'failure' && (
                          <span className="text-rose-600"> (failed)</span>
                        )}
                      </div>
                      {a.user_email && (
                        <div className="text-[11px] text-gray-500" dir="ltr">
                          {a.user_email}
                        </div>
                      )}
                      {a.error_message && (
                        <div className="text-[11px] text-rose-600">{a.error_message}</div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="رابط التحقق">
            <code dir="ltr" className="block text-xs bg-gray-100 p-2 rounded break-all">
              /verify/{cert.certificate_number}
            </code>
          </Card>
          <Card title="رابط الشهادة">
            <code dir="ltr" className="block text-xs bg-gray-100 p-2 rounded break-all">
              /certificate/{cert.certificate_number}
            </code>
            <p className="text-[11px] text-gray-500 mt-2">
              الطالب يقدر يفتح الرابط ويعمل "Save as PDF" من المتصفح.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5">
      <h2 className="font-bold mb-3">{title}</h2>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 text-sm py-1">
      <span className="text-gray-500 flex-shrink-0">{label}</span>
      <span className="text-left">{children}</span>
    </div>
  );
}

function Alert({ kind, message }: { kind: 'success' | 'error'; message: string }) {
  const Icon = kind === 'success' ? CheckCircle2 : AlertCircle;
  const cls =
    kind === 'success'
      ? 'bg-brand-500/10 border-brand-500/30 text-brand-700'
      : 'bg-destructive/10 border-destructive/30 text-destructive';
  return (
    <div className={`mb-6 p-3 rounded-lg border ${cls} text-sm flex items-center gap-2`}>
      <Icon className="w-4 h-4" />
      {message}
    </div>
  );
}
