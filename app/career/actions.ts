'use server';

import { headers, cookies } from 'next/headers';
import { createServiceClient } from '@/lib/supabase/server';
import { tally } from '@/lib/career/scoring';
import { matchArchetype } from '@/lib/career/archetypes';
import { loadCatalog, matchCourses } from '@/lib/career/matching';
import type { Answer } from '@/lib/career/types';

export type SubmitCareerLeadInput = {
  name: string;
  whatsapp: string;
  email?: string | null;
  answers: Answer[];
  /** UTMs forwarded from the landing page so we can attribute the lead. */
  utm?: {
    source?: string | null;
    medium?: string | null;
    campaign?: string | null;
  };
};

export type SubmitCareerLeadResult =
  | { ok: true; archetypeId: string; primarySlug: string | null }
  | { ok: false; error: string };

const PHONE_OK = /^[+0-9()\-\s]{6,32}$/;
const EMAIL_OK = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Persist a completed career-test lead. The browser ran tally() to
 * render its own preview, but we re-run it on the server so the
 * stored archetype + course match come from the same trusted source.
 */
export async function submitCareerLead(
  input: SubmitCareerLeadInput
): Promise<SubmitCareerLeadResult> {
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
  const archetype = matchArchetype(result);
  const catalog = await loadCatalog();
  const match = matchCourses(catalog, result);

  const h = headers();
  const ipChain = h.get('x-forwarded-for') ?? '';
  const ip = ipChain.split(',')[0]?.trim() || h.get('x-real-ip') || null;
  const userAgent = h.get('user-agent');
  const referer = h.get('referer');
  // UTM cookies set by the landing page client-side fall back to
  // input.utm so direct API callers can still attribute.
  const c = cookies();
  const utmSource = input.utm?.source ?? c.get('utm_source')?.value ?? null;
  const utmMedium = input.utm?.medium ?? c.get('utm_medium')?.value ?? null;
  const utmCampaign = input.utm?.campaign ?? c.get('utm_campaign')?.value ?? null;

  const service = createServiceClient();
  const { error } = await service.from('career_leads').insert({
    name,
    whatsapp,
    email,
    archetype: archetype.id,
    top_codes: result.topCodes,
    riasec: result.riasec,
    drivers: result.drivers,
    work_style: result.workStyle,
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
    console.error('[career] lead insert failed', error);
    return { ok: false, error: 'حصلت مشكلة في حفظ البيانات. حاول مرة تانية.' };
  }

  return { ok: true, archetypeId: archetype.id, primarySlug: match.primary?.slug ?? null };
}
