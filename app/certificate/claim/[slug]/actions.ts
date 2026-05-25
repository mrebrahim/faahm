'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient, createServiceClient } from '@/lib/supabase/server';

const MIN_NAME_LEN = 3;
const MAX_NAME_LEN = 80;

/**
 * Student-initiated certificate claim. Validates eligibility server-side,
 * persists the confirmed name on the profile (so future certs use the
 * same), and asks the SQL try_issue_certificate function to do the
 * actual insert. Failures redirect back to the claim page with an
 * Arabic error string the form renders.
 */
export async function claimCertificate(formData: FormData) {
  const slug = String(formData.get('slug') || '').trim();
  const fullName = String(formData.get('full_name') || '').trim();

  if (!slug) redirect('/certificates');

  const back = (msg: string) =>
    `/certificate/claim/${encodeURIComponent(slug)}?error=${encodeURIComponent(msg)}`;

  if (fullName.length < MIN_NAME_LEN || fullName.length > MAX_NAME_LEN) {
    redirect(back('الاسم لازم يكون بين 3 و 80 حرف.'));
  }
  // Reject obvious noise (email-looking strings, URLs).
  if (/@|https?:|\.com|\.net/i.test(fullName)) {
    redirect(back('اكتب اسمك الكامل، مش الإيميل أو رابط.'));
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/login?redirect=${encodeURIComponent(`/certificate/claim/${slug}`)}`);
  }

  const service = createServiceClient();

  // Resolve the course id from the slug.
  const { data: course } = await service
    .from('courses')
    .select('id, title_ar, slug, is_published')
    .eq('slug', slug)
    .maybeSingle();
  if (!course || !course.is_published) {
    redirect('/certificates?error=' + encodeURIComponent('الكورس مش موجود أو مش منشور.'));
  }

  // Re-verify eligibility under the user's identity (defense in depth —
  // the page also checks before rendering the form).
  const { data: eligible, error: eligErr } = await service.rpc(
    'check_certificate_eligibility',
    { p_user_id: user.id, p_course_id: course.id }
  );
  if (eligErr) {
    redirect(back('فشل التحقق من الأهلية. حاول تاني.'));
  }
  if (!eligible) {
    redirect(back('لسه ما أكملتش متطلبات الشهادة.'));
  }

  // Persist the confirmed name on the profile so subsequent certs reuse
  // it without prompting again.
  await service
    .from('profiles')
    .update({ full_name: fullName, updated_at: new Date().toISOString() })
    .eq('id', user.id);

  const { data: certId, error: issueErr } = await service.rpc(
    'try_issue_certificate',
    {
      p_user_id: user.id,
      p_course_id: course.id,
      p_issued_by: null,
      p_issue_reason: null,
      p_bypass: false,
    }
  );

  if (issueErr) {
    redirect(back(issueErr.message || 'فشل إصدار الشهادة. حاول تاني.'));
  }
  if (!certId) {
    redirect(back('فيه شهادة نشطة بالفعل، أو الأهلية اتغيّرت في اللحظة دي.'));
  }

  // Load the new cert number so we can deep-link to the cert page.
  const { data: cert } = await service
    .from('certificates')
    .select('certificate_number')
    .eq('id', certId as string)
    .maybeSingle();

  revalidatePath('/certificates');
  redirect(
    cert
      ? `/certificate/${cert.certificate_number}?claimed=1`
      : '/certificates?success=claimed'
  );
}
