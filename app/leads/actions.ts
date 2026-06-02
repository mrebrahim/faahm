'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { createServiceClient } from '@/lib/supabase/server';

/**
 * Capture a marketing-form email into public.leads. Idempotent on
 * (lower(email), source) thanks to the unique index, so the same
 * visitor re-submitting from the same form is a no-op rather than
 * piling up duplicates in the admin list.
 *
 * Source field lets us split conversion by which form the lead came
 * from once we have more than one (Zaka Live waitlist today, future
 * newsletter / contact widget tomorrow).
 */
export async function submitLead(formData: FormData) {
  const rawEmail = String(formData.get('email') || '').trim().toLowerCase();
  const source = String(formData.get('source') || '').trim() || 'unknown';
  // Accept an optional 'next' so each form can land back where it
  // came from with its own success state.
  const next = String(formData.get('next') || '/?lead=ok');

  if (!rawEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail)) {
    redirect('/?lead=invalid');
  }

  const h = headers();
  const ipChain = h.get('x-forwarded-for') ?? '';
  const ip = ipChain.split(',')[0]?.trim() || h.get('x-real-ip') || null;
  const userAgent = h.get('user-agent');
  const referer = h.get('referer');

  const service = createServiceClient();
  // Plain insert + swallow the unique-constraint violation; Supabase's
  // upsert(onConflict) wants a column list and our unique index is on
  // (lower(email), source) which it can't address by name.
  const { error } = await service.from('leads').insert({
    email: rawEmail,
    source,
    ip,
    user_agent: userAgent,
    referer,
  });
  if (error && error.code !== '23505') {
    // Anything other than 'duplicate' is unexpected — surface it.
    // Don't blow up the user's experience though; they came here to
    // sign up, not to debug.
    console.error('[leads] insert failed', error);
  }

  redirect(next);
}
