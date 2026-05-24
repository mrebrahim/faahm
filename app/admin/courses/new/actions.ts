'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createServiceClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/admin-guard';
import { loggedAction, formDataForLog } from '@/lib/admin-audit';

export async function createCourse(formData: FormData) {
  const ctx = await requireAdmin();

  const title_ar = formData.get('title_ar') as string;
  const slug = formData.get('slug') as string;
  if (!title_ar || !slug) {
    redirect('/admin/courses/new?error=' + encodeURIComponent('العنوان والرابط مطلوبين'));
  }

  let newCourseId: string | null = null;
  try {
    newCourseId = await loggedAction(
      ctx,
      {
        action: 'course.create',
        resourceType: 'course',
        metadata: { payload: formDataForLog(formData) },
      },
      async () => {
        const service = createServiceClient();
        const { data, error } = await service
          .from('courses')
          .insert({
            title_ar,
            slug,
            description_ar: (formData.get('description_ar') as string) || null,
            category_id: (formData.get('category_id') as string) || null,
            level: (formData.get('level') as string) || 'beginner',
            thumbnail_url: (formData.get('thumbnail_url') as string) || null,
            trailer_vimeo_id: (formData.get('trailer_vimeo_id') as string) || null,
            is_published: false,
          })
          .select('id')
          .single();
        if (error) throw new Error(error.message);
        return data.id as string;
      }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    redirect('/admin/courses/new?error=' + encodeURIComponent(message));
  }

  revalidatePath('/admin/courses');
  redirect(`/admin/courses/${newCourseId}`);
}
