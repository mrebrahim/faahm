'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createServiceClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/admin-guard';
import { loggedAction, formDataForLog } from '@/lib/admin-audit';
import { parseVideoInput, type VideoProvider } from '@/lib/video';

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

        // Trailer fields are optional at creation time; we still record the
        // chosen provider so a later edit knows what to default to.
        const trailerProvider =
          (formData.get('trailer_video_provider') as VideoProvider) || 'bunny';
        const trailerRaw = (formData.get('trailer_video_id') as string) || '';
        let trailerFields: Record<string, unknown> = {
          trailer_video_provider: trailerProvider,
          trailer_video_id: null,
          trailer_video_library_id: null,
        };
        if (trailerRaw.trim()) {
          const parsed = parseVideoInput(trailerProvider, trailerRaw);
          if (!parsed) {
            throw new Error('رابط الفيديو التشويقي مش صحيح');
          }
          trailerFields = {
            trailer_video_provider: trailerProvider,
            trailer_video_id: parsed.video_id,
            trailer_video_library_id: parsed.video_library_id,
          };
        }

        const { data, error } = await service
          .from('courses')
          .insert({
            title_ar,
            slug,
            description_ar: (formData.get('description_ar') as string) || null,
            category_id: (formData.get('category_id') as string) || null,
            level: (formData.get('level') as string) || 'beginner',
            thumbnail_url: (formData.get('thumbnail_url') as string) || null,
            ...trailerFields,
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
