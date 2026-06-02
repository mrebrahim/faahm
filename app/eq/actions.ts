'use server';

import { headers, cookies } from 'next/headers';
import { createServiceClient } from '@/lib/supabase/server';
import { tally } from '@/lib/eq/scoring';
import { matchCoursesForEq } from '@/lib/eq/matching';
import { loadCatalog } from '@/lib/career/catalog.server';
import type { EqAnswer } from '@/lib/eq/types';

export type SubmitEqLeadInput = {
  name: string;
  whatsapp: string;
  email?: string | null;
  answers: EqAnswer[];
};

export type SubmitEqLeadResult =
  | { ok: true; band: string; primarySlug: string | null }
  | { ok: false; error: string };

const PHONE_OK = /^[+0-9()\-\s]{6,32}$/;
const EMAIL_OK = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function submitEqLead(
  input: SubmitEqLeadInput
): Promise<SubmitEqLeadResult> {
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
  const match = matchCoursesForEq(catalog, result);

  const h = headers();
  const ipChain = h.get('x-forwarded-for') ?? '';
  const ip = ipChain.split(',')[0]?.trim() || h.get('x-real-ip') || null;
  const userAgent = h.get('user-agent');
  const referer = h.get('referer');
  const c = cookies();
  const utmSource = c.get('utm_source')?.value ?? null;
  const utmMedium = c.get('utm_medium')?.value ?? null;
  const utmCampaign = c.get('utm_campaign')?.value ?? null;

  const service = createServiceClient();
  const { error } = await service.from('eq_leads').insert({
    name,
    whatsapp,
    email,
    overall_score: result.overallScore,
    band: result.band,
    strongest_domain: result.strongest,
    weakest_domain: result.weakest,
    domain_scores: result.domains,
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
    console.error('[eq] lead insert failed', error);
    return { ok: false, error: 'حصلت مشكلة في حفظ البيانات. حاول مرة تانية.' };
  }

  return {
    ok: true,
    band: result.band,
    primarySlug: match.primary?.slug ?? null,
  };
}
