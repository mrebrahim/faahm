'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient, createServiceClient } from '@/lib/supabase/server';

export async function createCourse(formData: FormData) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  // Verify admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') redirect('/dashboard');

  const title_ar = formData.get('title_ar') as string;
  const slug = formData.get('slug') as string;
  const description_ar = formData.get('description_ar') as string;
  const category_id = formData.get('category_id') as string;
  const level = formData.get('level') as string;
  const thumbnail_url = formData.get('thumbnail_url') as string;
  const trailer_vimeo_id = formData.get('trailer_vimeo_id') as string;

  if (!title_ar || !slug) {
    redirect('/admin/courses/new?error=' + encodeURIComponent('العنوان والرابط مطلوبين'));
  }

  // Use service client to bypass RLS
  const service = createServiceClient();

  const { data, error } = await service
    .from('courses')
    .insert({
      title_ar,
      slug,
      description_ar: description_ar || null,
      category_id: category_id || null,
      level: level || 'beginner',
      thumbnail_url: thumbnail_url || null,
      trailer_vimeo_id: trailer_vimeo_id || null,
      is_published: false,
    })
    .select('id')
    .single();

  if (error) {
    redirect('/admin/courses/new?error=' + encodeURIComponent(error.message));
  }

  revalidatePath('/admin/courses');
  redirect(`/admin/courses/${data.id}`);
}
