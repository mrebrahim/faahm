'use server';

import { headers, cookies } from 'next/headers';
import { createServiceClient } from '@/lib/supabase/server';
import { tally } from '@/lib/personality/scoring';
import { matchCoursesForPersonality } from '@/lib/personality/matching';
import { loadCatalog } from '@/lib/career/catalog.server';
import type { PersonalityAnswer } from '@/lib/personality/types';

export type SubmitPersonalityLeadInput = {
  name: string;
  whatsapp: string;
  email?: string | null;
  answers: PersonalityAnswer[];
  utm?: {
    source?: string | null;
    medium?: string | null;
    campaign?: string | null;
  };
};

export type SubmitPersonalityLeadResult =
  | { ok: true; code: string; primarySlug: string | null }
  | { ok: false; error: string };

const PHONE_OK = /^[+0-9()\-\s]{6,32}$/;
const EMAIL_OK = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function submitPersonalityLead(
  input: SubmitPersonalityLeadInput
): Promise<SubmitPersonalityLeadResult> {
  const name = input.name?.trim();
  const whatsapp = input.whatsapp?.trim();
  const email = input.email?.trim().toLowerCase() || null;

  if (!name || name.length < 2) return { ok: false, error: 'الاسم مطلوب.' };
  if (!whatsapp || !PHONE_OK.test(whatsapp))
    return { ok: false, error: 'رقم واتساب مش صحيح.' };
  if (email && !EMAIL_OK.test(email))
    return { ok: false, error: 'البريد الإلكتروني مش صحيح.' };
  if (!Array.isArray(input.answers) || input.answers.length === 0)
    return { ok: false, error: 'الإجابات مش موجودة.' };

  const result = tally(input.answers);
  const catalog = await loadCatalog();
  const match = matchCoursesForPersonality(catalog, result);

  const h = headers();
  const ipChain = h.get('x-forwarded-for') ?? '';
  const ip = ipChain.split(',')[0]?.trim() || h.get('x-real-ip') || null;
  const userAgent = h.get('user-agent');
  const referer = h.get('referer');
  const c = cookies();
  const utmSource = input.utm?.source ?? c.get('utm_source')?.value ?? null;
  const utmMedium = input.utm?.medium ?? c.get('utm_medium')?.value ?? null;
  const utmCampaign = input.utm?.campaign ?? c.get('utm_campaign')?.value ?? null;

  const service = createServiceClient();
  const { error } = await service.from('personality_leads').insert({
    name,
    whatsapp,
    email,
    type_code: result.code,
    axis_scores: result.scores,
    axis_confidences: result.confidences,
    primary_course_slug: match.primary?.slug ?? null,
    also_explore_slugs: match.alsoExplore.map((c) => c.slug),
    answers: input.answers,
    utm_source: utmSource,
    utm_medium: utmMedium,
    utm_campaign: utmCampaign,
    ip,
    user_agent: userAgent,
    referer,
  });

  if (error) {
    console.error('[personality] lead insert failed', error);
    return { ok: false, error: 'حصلت مشكلة في حفظ البيانات. حاول مرة تانية.' };
  }

  return { ok: true, code: result.code, primarySlug: match.primary?.slug ?? null };
}
