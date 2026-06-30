import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { chunkText, embedMany } from '@/lib/openai';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Re-embed a course's AI knowledge text. Wipe-and-rebuild — cheap
 * because the knowledge fits in a single admin textarea, and saves
 * us reconciling diffed chunks.
 *
 *   POST /api/courses/:id/ingest
 *   body: { knowledge: string }     // optional. If omitted, we re-
 *                                   // ingest courses.ai_knowledge as
 *                                   // it stands on the row.
 *
 * Admin-only. The middleware already gates /admin pages, but the
 * /api/* surface isn't matched by that path prefix, so we re-check
 * the role here. Service-role client for the chunk writes — the
 * course_chunks table is RLS-locked and not readable by anon/auth.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const courseId = params.id;
  if (!courseId) {
    return NextResponse.json({ ok: false, error: 'missing course id' }, { status: 400 });
  }

  // Auth: must be admin.
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const service = createServiceClient();
  const { data: profile } = await service
    .from('profiles')
    .select('role, is_blocked')
    .eq('id', user.id)
    .single();
  const adminRoles = new Set([
    'admin',
    'super_admin',
    'content_admin',
    'billing_admin',
  ]);
  if (profile?.is_blocked || !adminRoles.has(profile?.role ?? '')) {
    return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 });
  }

  // Pull the knowledge text — either the request override or the row.
  let knowledge: string | null = null;
  try {
    const body = (await req.json().catch(() => ({}))) as { knowledge?: string };
    knowledge = typeof body.knowledge === 'string' ? body.knowledge : null;
  } catch {
    /* empty body — fine, we'll fall back to the row */
  }

  if (knowledge == null) {
    const { data: course, error } = await service
      .from('courses')
      .select('ai_knowledge')
      .eq('id', courseId)
      .maybeSingle();
    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
    knowledge = course?.ai_knowledge ?? '';
  } else {
    // Persist the new knowledge text on the course row at the same
    // time, so subsequent /ingest calls without a body have something
    // to fall back to.
    await service
      .from('courses')
      .update({
        ai_knowledge: knowledge,
        ai_knowledge_updated_at: new Date().toISOString(),
      })
      .eq('id', courseId);
  }

  // Always start clean — even if the new knowledge is empty (the
  // admin cleared the field), we want the old chunks gone so the
  // chat returns the canned 'not in course' answer.
  await service.from('course_chunks').delete().eq('course_id', courseId);

  const chunks = chunkText(knowledge ?? '', 800);
  if (chunks.length === 0) {
    return NextResponse.json({ ok: true, chunks: 0 });
  }

  let embeddings: number[][];
  try {
    embeddings = await embedMany(chunks);
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: (err as Error).message },
      { status: 502 }
    );
  }

  const rows = chunks.map((content, i) => ({
    course_id: courseId,
    content,
    token_count: Math.ceil(content.length / 4), // rough — OpenAI BPE not loaded server-side
    embedding: embeddings[i] as unknown as string, // pgvector accepts the array via PostgREST
  }));

  // Insert in batches so a single 30-chunk course doesn't ship a 5 MB
  // request body.
  const BATCH = 50;
  for (let i = 0; i < rows.length; i += BATCH) {
    const slice = rows.slice(i, i + BATCH);
    const { error } = await service.from('course_chunks').insert(slice);
    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true, chunks: rows.length });
}
