'use server';

import { headers } from 'next/headers';
import { z } from 'zod';
import { createServiceClient } from '@/lib/supabase/server';
import {
  EMAIL_CONSENT_TEXT,
  UTM_KEYS,
  WHATSAPP_CONSENT_TEXT,
} from '@/lib/lead-consent';

export type ClaudeCourseLeadState =
  | { status: 'idle' }
  | { status: 'ok'; name?: string }
  | { status: 'error'; message: string };

const schema = z.object({
  name: z.string().trim().min(2, 'اكتب اسمك').max(80),
  email: z.string().trim().toLowerCase().email('الإيميل مش مظبوط'),
  whatsapp: z
    .string()
    .trim()
    .max(20)
    .regex(/^\+?[0-9\s-]{8,20}$/, 'رقم الواتساب مش مظبوط')
    .or(z.literal(''))
    .optional(),
  email_consent: z.literal('on', {
    errorMap: () => ({ message: 'لازم توافق على الإيميل عشان نبعتلك لينك الكورس' }),
  }),
  whatsapp_consent: z.literal('on').optional(),
  source: z.string().trim().max(40).default('claude-course'),
  page_path: z.string().trim().max(200).optional(),
});

/**
 * Free Claude course sign-up. Used by /claude-course and the home/course
 * page form (task 62ca1a8a). Writes one row into public.leads with the
 * opt-in log (exact consent text + timestamp). The n8n → Kit webhook is
 * wired later; until then rows sit in leads and are visible in admin.
 */
export async function submitClaudeCourseLead(
  _prev: ClaudeCourseLeadState,
  formData: FormData,
): Promise<ClaudeCourseLeadState> {
  // Honeypot: real users never see or fill this field. Pretend success.
  if (String(formData.get('company') || '').trim()) return { status: 'ok' };

  const raw = Object.fromEntries(
    ['name', 'email', 'whatsapp', 'email_consent', 'whatsapp_consent', 'source', 'page_path']
      .map((k) => [k, formData.get(k) ?? undefined])
      .filter(([, v]) => v !== undefined),
  );
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return { status: 'error', message: parsed.error.issues[0]?.message ?? 'في حاجة ناقصة' };
  }
  const d = parsed.data;
  const whatsapp = d.whatsapp ? d.whatsapp.replace(/[\s-]/g, '') : null;
  const whatsappConsent = Boolean(whatsapp) && d.whatsapp_consent === 'on';

  const utm: Record<string, string> = {};
  for (const k of UTM_KEYS) {
    const v = String(formData.get(k) || '').trim().slice(0, 120);
    if (v) utm[k] = v;
  }

  const h = headers();
  const ip = (h.get('x-forwarded-for') ?? '').split(',')[0]?.trim() || h.get('x-real-ip') || null;

  const consentText = whatsappConsent
    ? `${EMAIL_CONSENT_TEXT}\n${WHATSAPP_CONSENT_TEXT}`
    : EMAIL_CONSENT_TEXT;

  const service = createServiceClient();
  const { error } = await service.from('leads').insert({
    email: d.email,
    source: d.source || 'claude-course',
    name: d.name,
    whatsapp,
    page_path: d.page_path ?? null,
    utm: Object.keys(utm).length ? utm : null,
    email_consent: true,
    whatsapp_consent: whatsappConsent,
    consent_text: consentText,
    consented_at: new Date().toISOString(),
    ip,
    user_agent: h.get('user-agent'),
    referer: h.get('referer'),
  });
  // 23505 = same email already signed up from this source → still success.
  if (error && error.code !== '23505') {
    console.error('[leads/claude-course] insert failed', error);
    return { status: 'error', message: 'حصلت مشكلة، جرّب تاني كمان شوية' };
  }

  return { status: 'ok', name: d.name };
}
