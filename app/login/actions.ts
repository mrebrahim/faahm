'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export async function login(formData: FormData) {
  const supabase = createClient();

  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const redirectTo = (formData.get('redirect') as string) || '/dashboard';

  if (!email || !password) {
    redirect('/login?error=' + encodeURIComponent('من فضلك أدخل البريد وكلمة السر'));
  }

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    redirect('/login?error=' + encodeURIComponent('بيانات الدخول غير صحيحة'));
  }

  revalidatePath('/', 'layout');
  redirect(redirectTo);
}

export async function loginWithGoogle() {
  const supabase = createClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${appUrl}/auth/callback`,
    },
  });

  if (error) {
    redirect('/login?error=' + encodeURIComponent('فشل تسجيل الدخول عبر جوجل'));
  }

  if (data.url) {
    redirect(data.url);
  }
}
