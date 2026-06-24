'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { Region } from '@/lib/region';

const REGION_COOKIE = 'faahm_region';

/**
 * Server action behind the currency toggle on /pricing. Writes the
 * sticky region cookie so the picker stays in the chosen currency
 * across page reloads + downstream checkout steps, then bounces back
 * to /pricing with the matching ?region= so the same render uses the
 * new currency immediately.
 */
export async function switchRegion(formData: FormData) {
  const target = formData.get('region') as Region | null;
  if (target !== 'sa' && target !== 'us') {
    redirect('/pricing');
  }
  cookies().set(REGION_COOKIE, target, {
    httpOnly: false,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 90, // 90d
  });
  redirect(`/pricing?region=${target}`);
}
