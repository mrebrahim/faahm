'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { E164_REGEX } from '@/lib/countries';

export async function updateProfile(formData: FormData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const fullName = String(formData.get('full_name') || '').trim();
  const phone = String(formData.get('phone') || '').trim();
  const country = String(formData.get('country') || '').trim().toUpperCase();
  const marketingOptIn = formData.get('marketing_opt_in') === '1';

  // Soft-validate phone: empty is OK, otherwise must be E.164.
  if (phone && !E164_REGEX.test(phone)) {
    redirect('/settings?error=' + encodeURIComponent('رقم الموبايل مش صحيح.'));
  }

  const service = createServiceClient();
  await service
    .from('profiles')
    .update({
      full_name: fullName || null,
      phone: phone || null,
      country: country || null,
      marketing_opt_in: marketingOptIn,
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id);

  revalidatePath('/settings');
  redirect('/settings?saved=1');
}
