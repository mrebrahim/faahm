'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export async function signup(formData: FormData) {
  const supabase = createClient();

  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const fullName = formData.get('full_name') as string;

  if (!email || !password || !fullName) {
    redirect('/signup?error=' + encodeURIComponent('من فضلك املأ كل الحقول'));
  }

  if (password.length < 8) {
    redirect('/signup?error=' + encodeURIComponent('كلمة السر لازم تكون 8 أحرف على الأقل'));
  }

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
    },
  });

  if (error) {
    if (error.message.includes('already registered')) {
      redirect('/signup?error=' + encodeURIComponent('البريد ده مسجل بالفعل'));
    }
    redirect('/signup?error=' + encodeURIComponent('حصل خطأ، حاول تاني'));
  }

  revalidatePath('/', 'layout');
  redirect('/signup?success=1');
}
