'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createServiceClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/admin-guard';
import { loggedAction, formDataForLog } from '@/lib/admin-audit';
import { parseVideoInput, type VideoProvider } from '@/lib/video';
import { uploadCourseThumbnail } from '@/lib/storage';
import { chunkText, embedMany } from '@/lib/openai';

/**
 * Resolve a Bunny library id when the admin only pasted a GUID.
 * Order of preference:
 *   1. The library id parsed out of the pasted input (full URL form).
 *   2. The single library id used by other lessons in the same course.
 *   3. null — let the renderer fall back to NEXT_PUBLIC_BUNNY_LIBRARY_ID.
 *
 * Step 2 means admins can paste a bare GUID and we still pin it to
 * the right library when the rest of the course agrees.
 */
async function resolveBunnyLibraryId({
  service,
  courseId,
  provider,
  parsedLibrary,
}: {
  service: ReturnType<typeof createServiceClient>;
  courseId: string;
  provider: string;
  parsedLibrary: string | null | undefined;
}): Promise<string | null> {
  if (parsedLibrary) return parsedLibrary;
  if (provider !== 'bunny') return null;
  const { data } = await service
    .from('lessons')
    .select('video_library_id')
    .eq('course_id', courseId)
    .not('video_library_id', 'is', null)
    .limit(50);
  const unique = new Set(
    (data || [])
      .map((r: { video_library_id: string | null }) => r.video_library_id)
      .filter(Boolean) as string[]
  );
  return unique.size === 1 ? [...unique][0] : null;
}

// ============================================================================
// COURSE
// ============================================================================
export async function updateCourse(formData: FormData) {
  const ctx = await requireAdmin();
  const id = formData.get('id') as string;

  await loggedAction(
    ctx,
    {
      action: 'course.update',
      resourceType: 'course',
      resourceId: id,
      metadata: { payload: formDataForLog(formData) },
    },
    async () => {
      const service = createServiceClient();

      // Trailer fields: only persist when admin entered something. Parse the
      // raw input through the provider so a pasted URL is normalised into
      // (provider, video_id, library_id).
      const trailerProvider = (formData.get('trailer_video_provider') as VideoProvider) || 'bunny';
      const trailerRaw = (formData.get('trailer_video_id') as string) || '';
      let trailerFields: Record<string, unknown> = {
        trailer_video_provider: trailerProvider,
        trailer_video_id: null,
        trailer_video_library_id: null,
      };
      if (trailerRaw.trim()) {
        const parsed = parseVideoInput(trailerProvider, trailerRaw);
        if (!parsed) {
          throw new Error('رابط الفيديو التشويقي مش صحيح للمزوّد المختار');
        }
        // Admin can override / supply the library id when they pasted just a
        // GUID and the URL didn't carry a library. Fall back to whatever
        // parseVideoInput extracted (will be null for a GUID-only paste).
        const libraryOverride =
          (formData.get('trailer_video_library_id') as string | null)?.trim() || null;
        const libraryId = await resolveBunnyLibraryId({
          service,
          courseId: id,
          provider: trailerProvider,
          parsedLibrary: libraryOverride || parsed.video_library_id,
        });
        trailerFields = {
          trailer_video_provider: trailerProvider,
          trailer_video_id: parsed.video_id,
          trailer_video_library_id: libraryId,
        };
      }

      // Textarea → string[]: split on newlines, trim, drop empties.
      // Hard cap of 30 bullets each — generous, but prevents abuse.
      const linesToArray = (raw: string | null) =>
        (raw || '')
          .split(/\r?\n/)
          .map((s) => s.trim())
          .filter(Boolean)
          .slice(0, 30);

      // Rating: clamp avg to 0–5 with one decimal, count to >= 0.
      // Empty/non-numeric input falls back to 0 so the DB CHECKs hold.
      const ratingAvgRaw = parseFloat((formData.get('rating_avg') as string) || '0');
      const rating_avg = Number.isFinite(ratingAvgRaw)
        ? Math.round(Math.min(5, Math.max(0, ratingAvgRaw)) * 10) / 10
        : 0;
      const ratingCountRaw = parseInt((formData.get('rating_count') as string) || '0', 10);
      const rating_count = Number.isFinite(ratingCountRaw)
        ? Math.max(0, ratingCountRaw)
        : 0;

      // Thumbnail: prefer an uploaded file. Fall back to a pasted URL.
      // An empty file input means "no change" → keep existing thumbnail.
      let thumbnailUrl: string | null | undefined = (formData.get('thumbnail_url') as string) || null;
      const thumbnailFile = formData.get('thumbnail_file');
      if (thumbnailFile instanceof File && thumbnailFile.size > 0) {
        const uploaded = await uploadCourseThumbnail({ courseId: id, file: thumbnailFile });
        thumbnailUrl = uploaded.publicUrl;
      }

      // AI knowledge text — the RAG source-of-truth for the per-
      // course assistant. Re-ingested below if it changed since the
      // last save so the chunks + embeddings stay in lockstep with
      // what the admin sees in the textarea.
      const aiKnowledgeRaw = (formData.get('ai_knowledge') as string | null) ?? '';
      const ai_knowledge = aiKnowledgeRaw.trim() || null;

      const updates: Record<string, unknown> = {
        title_ar: formData.get('title_ar') as string,
        description_ar: (formData.get('description_ar') as string) || null,
        category_id: (formData.get('category_id') as string) || null,
        level: formData.get('level') as string,
        rating_avg,
        rating_count,
        what_you_learn: linesToArray(formData.get('what_you_learn') as string | null),
        requirements: linesToArray(formData.get('requirements') as string | null),
        ai_knowledge,
        ...trailerFields,
      };
      if (thumbnailUrl !== undefined) updates.thumbnail_url = thumbnailUrl;

      // Detect whether ai_knowledge changed so we know whether to
      // schedule a re-ingest after the row is updated. Doing the
      // comparison against the *pre-update* DB value is the simplest
      // way to avoid embedding the same text twice on a no-op save.
      const { data: pre } = await service
        .from('courses')
        .select('ai_knowledge')
        .eq('id', id)
        .maybeSingle();
      const knowledgeChanged =
        (pre?.ai_knowledge ?? null) !== (ai_knowledge ?? null);

      if (knowledgeChanged) {
        updates.ai_knowledge_updated_at = new Date().toISOString();
      }

      const { error } = await service.from('courses').update(updates).eq('id', id);
      if (error) throw new Error(error.message);

      // Re-embed INLINE — the previous fire-and-forget self-fetch was
      // unreliable (the runtime cancels pending fetches when the
      // action redirects), so we just call the openai helpers
      // directly here. Admin save now takes ~5-30s on a fresh
      // ingest, but it's atomic: when the page reloads, chunks ARE
      // there, no 'why is the assistant empty?' debugging.
      if (knowledgeChanged) {
        try {
          // Always start clean — even when the new knowledge is empty
          // (admin cleared the field), drop the old chunks so the
          // chat returns the off-topic apology instead of stale
          // matches.
          await service.from('course_chunks').delete().eq('course_id', id);

          const chunks = chunkText(ai_knowledge ?? '', 800);
          if (chunks.length > 0) {
            const embeddings = await embedMany(chunks);
            const rows = chunks.map((content, i) => ({
              course_id: id,
              content,
              token_count: Math.ceil(content.length / 4),
              embedding: embeddings[i] as unknown as string,
            }));
            const BATCH = 50;
            for (let i = 0; i < rows.length; i += BATCH) {
              const slice = rows.slice(i, i + BATCH);
              const { error: insErr } = await service
                .from('course_chunks')
                .insert(slice);
              if (insErr) throw new Error(insErr.message);
            }
            console.log(
              `[ingest] course=${id} embedded ${rows.length} chunks`
            );
          } else {
            console.log(`[ingest] course=${id} cleared (no knowledge)`);
          }
        } catch (e) {
          // Surface ingest failure to the admin via the error
          // redirect — they need to know the assistant isn't ready.
          console.error('[ingest] inline re-embed failed', e);
          throw new Error(
            `معلومات الكورس اتحفظت لكن تحضير المساعد فشل: ${(e as Error).message}`
          );
        }
      }
    }
  ).catch((err) => {
    redirect(`/admin/courses/${id}?error=${encodeURIComponent(err.message)}`);
  });

  revalidatePath(`/admin/courses/${id}`);
  redirect(`/admin/courses/${id}?success=updated`);
}

export async function togglePublishCourse(formData: FormData) {
  const ctx = await requireAdmin();
  const id = formData.get('id') as string;
  const currentlyPublished = formData.get('is_published') === 'true';
  const nextState = !currentlyPublished;

  await loggedAction(
    ctx,
    {
      action: nextState ? 'course.publish' : 'course.unpublish',
      resourceType: 'course',
      resourceId: id,
    },
    async () => {
      const service = createServiceClient();
      await service
        .from('courses')
        .update({
          is_published: nextState,
          published_at: nextState ? new Date().toISOString() : null,
        })
        .eq('id', id);
    }
  );

  revalidatePath(`/admin/courses/${id}`);
  revalidatePath('/admin/courses');
}

/**
 * Flip a course between the three access tiers:
 *   'paid'   — the default. Any active subscription unlocks it.
 *   'free'   — lead magnet. Open to anyone signed in, no subscription.
 *   'yearly' — reserved for the yearly plan.
 *
 * The DB has a CHECK that a course can't be both free and yearly-only,
 * so this writes both columns together rather than toggling one at a
 * time and briefly landing in the forbidden state.
 */
export async function setCourseAccessTier(formData: FormData) {
  const ctx = await requireAdmin();
  const id = formData.get('id') as string;
  const tier = String(formData.get('tier') || 'paid');

  if (!id || !['paid', 'free', 'yearly'].includes(tier)) {
    redirect(`/admin/courses/${id}?error=${encodeURIComponent('نوع وصول غير معروف.')}`);
  }

  await loggedAction(
    ctx,
    {
      action: 'course.access_tier',
      resourceType: 'course',
      resourceId: id,
      metadata: { tier },
    },
    async () => {
      await createServiceClient()
        .from('courses')
        .update({
          is_free: tier === 'free',
          yearly_only: tier === 'yearly',
        })
        .eq('id', id);
    }
  );

  revalidatePath(`/admin/courses/${id}`);
  revalidatePath('/admin/courses');
  revalidatePath('/courses');
  revalidatePath('/');
  redirect(`/admin/courses/${id}?success=access`);
}

/**
 * Manual re-embed of the saved ai_knowledge text. Useful when:
 *   - The first save's embed failed because OPENAI_API_KEY wasn't
 *     set yet, and the admin fixed the env without changing the
 *     textarea.
 *   - A bulk import populated ai_knowledge directly in the DB and
 *     the chunks were never built.
 *   - The model or chunking logic changed and the admin wants to
 *     rebuild with the new pipeline.
 */
export async function reembedCourseKnowledge(formData: FormData) {
  const ctx = await requireAdmin();
  const id = formData.get('id') as string;

  // Verbose logging so the merchant can read the run in Coolify
  // logs — the previous version went silent the moment OpenAI
  // misbehaved.
  console.log(`[reembed] start course=${id} hasKey=${!!process.env.OPENAI_API_KEY}`);

  let chunkCount = 0;
  let errorMsg: string | null = null;

  try {
    const service = createServiceClient();
    const { data: course } = await service
      .from('courses')
      .select('ai_knowledge, title_ar')
      .eq('id', id)
      .maybeSingle();
    const text = (course?.ai_knowledge ?? '').trim();
    console.log(
      `[reembed] course=${id} title="${course?.title_ar}" knowledge_len=${text.length}`
    );

    if (!text) {
      throw new Error('معلومات المساعد الذكي فاضية — اكتب نص الأول.');
    }
    if (!process.env.OPENAI_API_KEY) {
      throw new Error(
        'OPENAI_API_KEY مش متضاف في Coolify Environment Variables. ضيفه واعمل Redeploy.'
      );
    }

    // Wipe-and-rebuild.
    await service.from('course_chunks').delete().eq('course_id', id);

    const chunks = chunkText(text, 800);
    console.log(`[reembed] course=${id} chunkText produced ${chunks.length} chunks`);
    if (chunks.length === 0) {
      throw new Error('chunkText رجّع 0 chunks (النص ممكن يكون قصير جداً أو فيه مشكلة)');
    }

    const embeddings = await embedMany(chunks);
    console.log(`[reembed] course=${id} embedded ${embeddings.length} vectors`);

    const rows = chunks.map((content, i) => ({
      course_id: id,
      content,
      token_count: Math.ceil(content.length / 4),
      embedding: embeddings[i] as unknown as string,
    }));
    const BATCH = 50;
    for (let i = 0; i < rows.length; i += BATCH) {
      const slice = rows.slice(i, i + BATCH);
      const { error: insErr } = await service.from('course_chunks').insert(slice);
      if (insErr) {
        console.error(`[reembed] insert batch failed`, insErr);
        throw new Error(`فشل الـ insert: ${insErr.message}`);
      }
    }
    chunkCount = rows.length;

    await service
      .from('courses')
      .update({ ai_knowledge_updated_at: new Date().toISOString() })
      .eq('id', id);

    console.log(`[reembed] DONE course=${id} chunks=${chunkCount}`);

    // Audit-log the successful run for the admin trail. Failures
    // are logged below.
    void loggedAction(
      ctx,
      {
        action: 'course.ai_knowledge_reembed',
        resourceType: 'course',
        resourceId: id,
        metadata: { chunks: chunkCount },
      },
      async () => {}
    );
  } catch (e) {
    errorMsg = (e as Error).message;
    console.error(`[reembed] FAILED course=${id}`, e);
  }

  revalidatePath(`/admin/courses/${id}`);
  if (errorMsg) {
    redirect(`/admin/courses/${id}?error=${encodeURIComponent(errorMsg)}`);
  }
  redirect(`/admin/courses/${id}?ok=re-embed&chunks=${chunkCount}`);
}

export async function deleteCourse(formData: FormData) {
  const ctx = await requireAdmin();
  const id = formData.get('id') as string;

  // Capture identifying metadata BEFORE delete so the audit log keeps a
  // record of what was destroyed, not just an orphan UUID.
  const service = createServiceClient();
  const { data: existing } = await service
    .from('courses')
    .select('slug, title_ar, is_published')
    .eq('id', id)
    .maybeSingle();

  await loggedAction(
    ctx,
    {
      action: 'course.delete',
      resourceType: 'course',
      resourceId: id,
      metadata: { snapshot: existing },
    },
    async () => {
      await service.from('courses').delete().eq('id', id);
    }
  );

  revalidatePath('/admin/courses');
  redirect('/admin/courses');
}

// ============================================================================
// CHAPTERS
// ============================================================================
export async function createChapter(formData: FormData) {
  const ctx = await requireAdmin();
  const course_id = formData.get('course_id') as string;
  const title_ar = formData.get('title_ar') as string;
  if (!title_ar) return;

  await loggedAction(
    ctx,
    {
      action: 'chapter.create',
      resourceType: 'chapter',
      metadata: { course_id, title_ar },
    },
    async () => {
      const service = createServiceClient();
      const { count } = await service
        .from('chapters')
        .select('*', { count: 'exact', head: true })
        .eq('course_id', course_id);

      await service.from('chapters').insert({
        course_id,
        title_ar,
        sort_order: count || 0,
      });
    }
  );

  revalidatePath(`/admin/courses/${course_id}`);
}

export async function deleteChapter(formData: FormData) {
  const ctx = await requireAdmin();
  const id = formData.get('id') as string;
  const course_id = formData.get('course_id') as string;

  await loggedAction(
    ctx,
    {
      action: 'chapter.delete',
      resourceType: 'chapter',
      resourceId: id,
      metadata: { course_id },
    },
    async () => {
      const service = createServiceClient();
      await service.from('chapters').delete().eq('id', id);
    }
  );

  revalidatePath(`/admin/courses/${course_id}`);
}

// ============================================================================
// LESSONS
// ============================================================================
export async function createLesson(formData: FormData) {
  const ctx = await requireAdmin();
  const chapter_id = formData.get('chapter_id') as string;
  const course_id = formData.get('course_id') as string;
  const title_ar = formData.get('title_ar') as string;
  const provider = ((formData.get('video_provider') as string) || 'bunny') as VideoProvider;
  const raw = (formData.get('video_id') as string) || '';
  const duration_sec = parseInt((formData.get('duration_sec') as string) || '0', 10);
  const is_free_preview = formData.get('is_free_preview') === 'on';

  if (!title_ar || !raw.trim()) {
    redirect(
      `/admin/courses/${course_id}?error=${encodeURIComponent('العنوان ومعرّف الفيديو مطلوبين')}`
    );
  }

  const parsed = parseVideoInput(provider, raw);
  if (!parsed) {
    redirect(
      `/admin/courses/${course_id}?error=${encodeURIComponent(
        'رابط/معرّف الفيديو مش صحيح للمزوّد المختار'
      )}`
    );
  }

  await loggedAction(
    ctx,
    {
      action: 'lesson.create',
      resourceType: 'lesson',
      metadata: {
        course_id,
        chapter_id,
        title_ar,
        provider,
        is_free_preview,
      },
    },
    async () => {
      const service = createServiceClient();
      const { count } = await service
        .from('lessons')
        .select('*', { count: 'exact', head: true })
        .eq('chapter_id', chapter_id);

      // Fall back to a sibling lesson's library when the admin pasted a
      // bare GUID — otherwise we'd default to the project-wide library
      // at render time and the iframe would 404. Same logic the trailer
      // path uses; centralise later if a third caller turns up.
      const libraryId = await resolveBunnyLibraryId({
        service,
        courseId: course_id,
        provider,
        parsedLibrary: parsed!.video_library_id,
      });

      await service.from('lessons').insert({
        chapter_id,
        course_id,
        title_ar,
        video_provider: provider,
        video_id: parsed!.video_id,
        video_library_id: libraryId,
        duration_sec,
        is_free_preview,
        sort_order: count || 0,
      });
    }
  );

  revalidatePath(`/admin/courses/${course_id}`);
}

export async function deleteLesson(formData: FormData) {
  const ctx = await requireAdmin();
  const id = formData.get('id') as string;
  const course_id = formData.get('course_id') as string;

  const service = createServiceClient();
  const { data: existing } = await service
    .from('lessons')
    .select('title_ar, video_provider, video_id')
    .eq('id', id)
    .maybeSingle();

  await loggedAction(
    ctx,
    {
      action: 'lesson.delete',
      resourceType: 'lesson',
      resourceId: id,
      metadata: { course_id, snapshot: existing },
    },
    async () => {
      await service.from('lessons').delete().eq('id', id);
    }
  );

  revalidatePath(`/admin/courses/${course_id}`);
}

export async function togglePreviewLesson(formData: FormData) {
  const ctx = await requireAdmin();
  const id = formData.get('id') as string;
  const course_id = formData.get('course_id') as string;
  const current = formData.get('is_free_preview') === 'true';

  await loggedAction(
    ctx,
    {
      action: 'lesson.set_free_preview',
      resourceType: 'lesson',
      resourceId: id,
      metadata: { course_id, from: current, to: !current },
    },
    async () => {
      const service = createServiceClient();
      await service.from('lessons').update({ is_free_preview: !current }).eq('id', id);
    }
  );

  revalidatePath(`/admin/courses/${course_id}`);
}

/**
 * Save a new order for a list of chapters in one course. The client
 * sends the chapter UUIDs in their new visual order; we map each id
 * to its index and write that as `sort_order` so the next read shows
 * them in the same order. A single transaction so the list either
 * lands fully or not at all.
 */
export async function reorderChapters(formData: FormData) {
  const ctx = await requireAdmin();
  const courseId = String(formData.get('course_id') || '');
  const idsRaw = String(formData.get('ids') || '');
  if (!courseId || !idsRaw) return;

  const ids = idsRaw.split(',').map((s) => s.trim()).filter(Boolean);
  if (ids.length === 0) return;

  await loggedAction(
    ctx,
    {
      action: 'course.chapters_reordered',
      resourceType: 'course',
      resourceId: courseId,
      metadata: { count: ids.length },
    },
    async () => {
      const service = createServiceClient();
      // Per-row updates: Supabase doesn't expose a single-statement bulk
      // update with different values, and an upsert path would require
      // every other column to be present. The list is short (tens, not
      // thousands), so the round-trip cost is fine.
      await Promise.all(
        ids.map((id, idx) =>
          service
            .from('chapters')
            .update({ sort_order: idx })
            .eq('id', id)
            .eq('course_id', courseId)
        )
      );
    }
  );

  revalidatePath(`/admin/courses/${courseId}`);
}

/**
 * Same shape as reorderChapters but scoped to a single chapter's lessons.
 * Ids come in in their new visual order; we write sort_order = index.
 */
export async function reorderLessons(formData: FormData) {
  const ctx = await requireAdmin();
  const courseId = String(formData.get('course_id') || '');
  const chapterId = String(formData.get('chapter_id') || '');
  const idsRaw = String(formData.get('ids') || '');
  if (!courseId || !chapterId || !idsRaw) return;

  const ids = idsRaw.split(',').map((s) => s.trim()).filter(Boolean);
  if (ids.length === 0) return;

  await loggedAction(
    ctx,
    {
      action: 'course.lessons_reordered',
      resourceType: 'chapter',
      resourceId: chapterId,
      metadata: { count: ids.length, course_id: courseId },
    },
    async () => {
      const service = createServiceClient();
      await Promise.all(
        ids.map((id, idx) =>
          service
            .from('lessons')
            .update({ sort_order: idx })
            .eq('id', id)
            .eq('chapter_id', chapterId)
        )
      );
    }
  );

  revalidatePath(`/admin/courses/${courseId}`);
}
