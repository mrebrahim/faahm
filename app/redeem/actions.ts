'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { validateCouponCode } from '@/lib/coupons';
import { auditLog } from '@/lib/admin-audit';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CODE_COOKIE = 'redeem_code';
const CODE_COOKIE_TTL = 60 * 30; // 30 min

/**
 * Step 1: apply the coupon code. If valid, stash the code in a short-lived
 * cookie and advance to the details form. Every invalid case surfaces the
 * same generic message so a would-be attacker can't tell exhausted-vs-typo.
 */
export async function applyCoupon(formData: FormData) {
  const code = String(formData.get('code') || '').trim().toUpperCase();
  const result = await validateCouponCode(code);

  const GENERIC_ERR = 'الكوبون مش صالح.';

  if (!result.ok) {
    redirect(
      `/redeem?stage=code&error=${encodeURIComponent(GENERIC_ERR)}` +
        `&code=${encodeURIComponent(code)}`
    );
  }

  if (result.coupon.discount_type !== 'free_course' || !result.coupon.course_id) {
    // We only support the free-course flow on /redeem for now. Discount
    // coupons still ride through /checkout as before.
    redirect(
      `/redeem?stage=code&error=${encodeURIComponent(
        'الكوبون ده مش من نوع دخول مجاني. لو خصم استعمله في صفحة الدفع.'
      )}`
    );
  }

  cookies().set({
    name: CODE_COOKIE,
    value: code,
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/redeem',
    maxAge: CODE_COOKIE_TTL,
  });

  redirect('/redeem?stage=details');
}

/**
 * Step 2: send the OTP after collecting name + phone. Re-validates the code
 * from the cookie (visitor could have tampered) and calls Supabase to send
 * a 6-digit code to the email. Name + phone travel in the raw_user_meta_data
 * so profile trigger picks them up on first verify.
 */
export async function sendRedemptionOtp(formData: FormData) {
  const c = cookies();
  const code = c.get(CODE_COOKIE)?.value;
  if (!code) redirect('/redeem?stage=code&error=' + encodeURIComponent('انتهت صلاحية الجلسة. ابدأ تاني.'));

  const email = String(formData.get('email') || '').trim().toLowerCase();
  const fullName = String(formData.get('full_name') || '').trim();
  const phone = String(formData.get('phone') || '').trim();

  const params = new URLSearchParams({ stage: 'details' });
  if (email) params.set('email', email);
  if (fullName) params.set('name', fullName);
  if (phone) params.set('phone', phone);

  if (!EMAIL_REGEX.test(email)) {
    params.set('error', 'الإيميل غير صحيح.');
    redirect(`/redeem?${params.toString()}`);
  }
  if (!fullName || fullName.length < 2) {
    params.set('error', 'اكتب اسمك بالكامل.');
    redirect(`/redeem?${params.toString()}`);
  }
  // Phone required. E.164-ish: 8–15 digits, optional leading +.
  if (!/^\+?[0-9]{8,15}$/.test(phone)) {
    params.set('error', 'رقم الموبايل غير صحيح. اكتبه بالأرقام الدولية.');
    redirect(`/redeem?${params.toString()}`);
  }

  // Re-validate the code — reject on any change since step 1.
  const result = await validateCouponCode(code);
  if (!result.ok || result.coupon.discount_type !== 'free_course') {
    redirect('/redeem?stage=code&error=' + encodeURIComponent('الكوبون مش صالح.'));
  }

  const supabase = createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
      data: {
        full_name: fullName,
        phone,
        redeem_coupon: code,
      },
    },
  });

  if (error) {
    void auditLog(
      { userId: null, userEmail: email, userRole: null },
      { action: 'redeem.otp_send_failed', result: 'failure', errorMessage: error.message }
    );
    params.set('error', 'فشل إرسال الكود. حاول تاني.');
    redirect(`/redeem?${params.toString()}`);
  }

  void auditLog(
    { userId: null, userEmail: email, userRole: null },
    { action: 'redeem.otp_sent', metadata: { coupon_code: code } }
  );

  const otpParams = new URLSearchParams({
    stage: 'otp',
    email,
    sent: '1',
  });
  redirect(`/redeem?${otpParams.toString()}`);
}

/**
 * Step 3: verify the OTP, and once the user is authenticated, insert the
 * enrollment + redemption + increment the coupon counter atomically enough
 * (Postgres transactional inserts + a small race window on used_count that
 * we accept in exchange for a simpler impl — the coupon.used_count is a
 * best-effort display counter, actual gating is via the unique redemption
 * index).
 */
export async function verifyRedemptionOtp(formData: FormData) {
  const c = cookies();
  const code = c.get(CODE_COOKIE)?.value;
  const email = String(formData.get('email') || '').trim().toLowerCase();
  const token = String(formData.get('token') || '').trim();

  const back = (err: string) =>
    redirect(
      `/redeem?stage=otp&email=${encodeURIComponent(email)}&sent=1&error=${encodeURIComponent(err)}`
    );

  if (!code) redirect('/redeem?stage=code&error=' + encodeURIComponent('انتهت صلاحية الجلسة. ابدأ تاني.'));
  if (!EMAIL_REGEX.test(email)) back('الإيميل غير صحيح.');
  if (!/^[0-9]{4,8}$/.test(token)) back('الكود لازم يكون أرقام بس.');

  const supabase = createClient();
  const { data, error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: 'email',
  });

  if (error || !data.session) {
    void auditLog(
      { userId: null, userEmail: email, userRole: null },
      { action: 'redeem.otp_verify_failed', result: 'failure', errorMessage: error?.message || 'no session' }
    );
    back('الكود غير صحيح أو منتهي.');
  }

  const userId = data!.session!.user.id;

  // Re-validate coupon under the new session — this is where per-user
  // "already redeemed" also gets caught cleanly.
  const result = await validateCouponCode(code, userId);
  if (!result.ok || result.coupon.discount_type !== 'free_course' || !result.coupon.course_id) {
    const reason =
      result.ok === false && result.reason === 'already_redeemed'
        ? 'الكوبون ده مستخدم بالفعل على حسابك — الكورس مفتوح.'
        : 'الكوبون مش صالح.';
    // Clear the cookie so a subsequent attempt starts fresh.
    c.delete(CODE_COOKIE);
    // Route them to the course they already have or the courses list.
    const courseSlug = await lookupCourseSlug(result.ok ? result.coupon.course_id : null);
    redirect(courseSlug ? `/course/${courseSlug}?msg=${encodeURIComponent(reason)}` : '/courses');
  }

  const service = createServiceClient();
  const { coupon } = result;

  // 1. Insert the enrollment. source='coupon' → canAccessCourse picks it up.
  const { error: enrollErr } = await service.from('enrollments').insert({
    user_id: userId,
    course_id: coupon.course_id,
    source: 'coupon',
    notes: `Redeemed coupon: ${coupon.code}`,
  });
  // If a duplicate enrollment already exists, that's fine — proceed.
  if (enrollErr && !enrollErr.message.toLowerCase().includes('duplicate')) {
    void auditLog(
      { userId, userEmail: email, userRole: null },
      { action: 'redeem.enrollment_failed', result: 'failure', errorMessage: enrollErr.message }
    );
    back('فشل تفعيل الكورس. جرّب تاني.');
  }

  // 2. Insert the redemption row — unique index on (coupon_id, user_id)
  //    will surface a duplicate-key error if the same user retries.
  await service.from('coupon_redemptions').insert({
    coupon_id: coupon.id,
    user_id: userId,
    email,
  });

  // 3. Bump used_count. Racy under heavy contention but fine for a hand-run
  //    campaign — the real cap lives on the unique index above.
  await service
    .from('coupons')
    .update({ used_count: (coupon.used_count || 0) + 1 })
    .eq('id', coupon.id);

  void auditLog(
    { userId, userEmail: email, userRole: null },
    { action: 'redeem.success', metadata: { coupon_code: coupon.code, course_id: coupon.course_id } }
  );

  c.delete(CODE_COOKIE);

  const slug = await lookupCourseSlug(coupon.course_id);
  revalidatePath('/', 'layout');
  redirect(slug ? `/course/${slug}?welcome=coupon` : '/courses?welcome=coupon');
}

async function lookupCourseSlug(courseId: string | null | undefined): Promise<string | null> {
  if (!courseId) return null;
  const service = createServiceClient();
  const { data } = await service
    .from('courses')
    .select('slug')
    .eq('id', courseId)
    .maybeSingle();
  return data?.slug ?? null;
}
