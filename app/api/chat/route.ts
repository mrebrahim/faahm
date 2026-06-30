import { NextRequest } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import {
  answerStream,
  embedOne,
  offTopicApology,
  type ChatMessage,
} from '@/lib/openai';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * RAG chat endpoint — answers a question about a single course using
 * only the chunks the admin embedded for it. Strict gating:
 *
 *   1. Must be signed in.
 *   2. Must have an *active yearly* subscription. Monthly subscribers
 *      get a 402 'upgrade required' so the UI can render the
 *      upgrade card; guests get a 401 so the UI knows to hide
 *      the chat entirely.
 *   3. The course must be published.
 *   4. The vector search is scoped to the requested course_id — the
 *      assistant for course A can never read course B's chunks.
 *   5. If no chunks land above the similarity threshold, we return a
 *      canned 'not in course' Arabic line WITHOUT calling the LLM,
 *      saving both the OpenAI bill and the hallucination risk.
 *
 * Streams plain text tokens (Content-Type: text/plain;charset=utf-8)
 * so the client just appends bytes as they arrive — no SSE framing.
 *
 *   POST /api/chat
 *   body: {
 *     courseId:  string                    // uuid
 *     question:  string
 *     history?: { role: 'user'|'assistant'; content: string }[]
 *   }
 */
const MAX_HISTORY = 6; // last 3 turns
const MAX_QUESTION_LEN = 1200;

export async function POST(req: NextRequest) {
  let body: { courseId?: string; question?: string; history?: ChatMessage[] };
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, error: 'bad-json' }, 400);
  }

  const courseId = (body.courseId ?? '').trim();
  const question = (body.question ?? '').trim();
  const history = Array.isArray(body.history)
    ? body.history.slice(-MAX_HISTORY).filter(
        (m) =>
          m &&
          (m.role === 'user' || m.role === 'assistant') &&
          typeof m.content === 'string' &&
          m.content.length > 0
      )
    : [];

  if (!courseId || !question) {
    return json({ ok: false, error: 'missing courseId or question' }, 400);
  }
  if (question.length > MAX_QUESTION_LEN) {
    return json({ ok: false, error: 'question too long' }, 413);
  }

  // ---- Auth + subscription gate ------------------------------------------
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return json({ ok: false, error: 'unauthorized' }, 401);
  }

  const service = createServiceClient();
  const { data: sub } = await service
    .from('subscriptions')
    .select('plan, status, current_period_end')
    .eq('user_id', user.id)
    .in('status', ['active', 'trialing'])
    .gt('current_period_end', new Date().toISOString())
    .order('current_period_end', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!sub) {
    return json({ ok: false, error: 'no-subscription' }, 402);
  }
  if (sub.plan !== 'yearly') {
    return json({ ok: false, error: 'yearly-only' }, 402);
  }

  // ---- Course lookup -----------------------------------------------------
  const { data: course } = await service
    .from('courses')
    .select('id, title_ar, is_published')
    .eq('id', courseId)
    .maybeSingle();
  if (!course || !course.is_published) {
    return json({ ok: false, error: 'course-not-found' }, 404);
  }

  // ---- RAG: embed question, search chunks, decide --------------------------
  let qVec: number[];
  try {
    qVec = await embedOne(question);
  } catch (err) {
    return json({ ok: false, error: (err as Error).message }, 502);
  }

  // Cast to PostgREST-compatible payload — pgvector accepts the
  // bracket-string form from a JS array via supabase-js.
  const { data: matches, error: matchErr } = await service.rpc(
    'match_course_chunks',
    {
      query_embedding: qVec as unknown as string,
      p_course_id: courseId,
      match_threshold: 0.4,
      match_count: 6,
    }
  );
  if (matchErr) {
    return json({ ok: false, error: matchErr.message }, 500);
  }

  const chunks = ((matches ?? []) as { content: string }[]).map((m) => m.content);

  // Zero chunks crossed the similarity threshold → the question is
  // almost certainly off-topic for this course. PRD §5: return the
  // course-name-aware apology directly from the server WITHOUT
  // touching the LLM (saves the API bill, removes the
  // hallucination surface, faster TTFB). The same line the system
  // prompt would have made the model emit, just delivered straight.
  if (chunks.length === 0) {
    return new Response(offTopicApology(course.title_ar), {
      status: 200,
      headers: {
        'content-type': 'text/plain; charset=utf-8',
        'cache-control': 'no-store',
      },
    });
  }

  // ---- Stream the answer --------------------------------------------------
  try {
    const stream = await answerStream({
      courseTitle: course.title_ar,
      contextChunks: chunks,
      history,
      question,
    });
    return new Response(stream, {
      status: 200,
      headers: {
        'content-type': 'text/plain; charset=utf-8',
        'cache-control': 'no-store',
      },
    });
  } catch (err) {
    return json({ ok: false, error: (err as Error).message }, 502);
  }
}

function json(payload: unknown, status: number) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}
