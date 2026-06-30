/**
 * Server-only OpenAI helpers for the per-course AI assistant (RAG).
 *
 * Three jobs:
 *   1. chunkText:    split an admin-pasted Arabic knowledge text into
 *                    ~800-character chunks on paragraph + sentence
 *                    boundaries (so an embedding doesn't get half a
 *                    sentence and the next chunk the other half).
 *   2. embedMany:    batch-embed chunks via text-embedding-3-small
 *                    (1536-dim — matches the course_chunks column).
 *   3. answerStream: stream the chat completion with the strict
 *                    'answer only from the provided context' system
 *                    prompt, returning a ReadableStream of tokens.
 *
 * Model names are env-overridable so the merchant can swap to
 * gpt-4.1-nano / a future 'gpt-5-nano' / gemini-flash-lite without a
 * redeploy. Defaults are picked to match the PRD's cost envelope:
 *   OPENAI_CHAT_MODEL       default 'gpt-4o-mini'
 *   OPENAI_EMBEDDING_MODEL  default 'text-embedding-3-small'
 *
 * All calls fail-loud if OPENAI_API_KEY isn't set — never silently
 * no-op (a silent no-op would let the chat UI render but every
 * question return nothing, which the merchant would chase for hours).
 */

const OPENAI_BASE = 'https://api.openai.com/v1';

function apiKey(): string {
  const k = process.env.OPENAI_API_KEY;
  if (!k) {
    throw new Error(
      'OPENAI_API_KEY env var missing. Add it in Coolify → App → Environment Variables.'
    );
  }
  return k;
}

export function chatModel(): string {
  return process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini';
}

export function embeddingModel(): string {
  return process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small';
}

/**
 * Split a long Arabic knowledge dump into ~targetSize-char chunks.
 *   - Prefer breaking on double-newline (paragraph).
 *   - Then on single newline / Arabic period (.) / question mark (؟).
 *   - Never cut mid-word; merge tiny fragments into the next chunk.
 *
 * Returns trimmed, non-empty chunks. Order preserved.
 */
export function chunkText(input: string, targetSize = 800): string[] {
  const text = (input ?? '').trim();
  if (!text) return [];

  // First pass — split on paragraph boundaries (two-or-more newlines).
  const paragraphs = text
    .split(/\n\s*\n+/g)
    .map((p) => p.trim())
    .filter(Boolean);

  const out: string[] = [];
  let buf = '';

  const flush = () => {
    const t = buf.trim();
    if (t) out.push(t);
    buf = '';
  };

  for (const para of paragraphs) {
    // If the paragraph itself is small enough, accumulate; otherwise
    // split it further on sentence-ending punctuation.
    if (para.length <= targetSize) {
      if ((buf + '\n\n' + para).trim().length > targetSize * 1.3) flush();
      buf = buf ? `${buf}\n\n${para}` : para;
      continue;
    }

    // Long paragraph — split into sentences.
    const sentences = para
      .split(/(?<=[\.!?؟])\s+/g)
      .map((s) => s.trim())
      .filter(Boolean);

    for (const sent of sentences) {
      if ((buf + ' ' + sent).trim().length > targetSize) flush();
      buf = buf ? `${buf} ${sent}` : sent;
      // Hard cap — a giant single sentence still gets emitted.
      if (buf.length > targetSize * 1.5) flush();
    }
  }
  flush();

  return out;
}

/**
 * Embed an array of text chunks. Returns one float[] per input, in
 * the same order. Throws on a non-200 OpenAI response.
 */
export async function embedMany(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];

  const resp = await fetch(`${OPENAI_BASE}/embeddings`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${apiKey()}`,
    },
    body: JSON.stringify({
      model: embeddingModel(),
      input: texts,
    }),
  });

  if (!resp.ok) {
    const errText = await resp.text().catch(() => '');
    throw new Error(`OpenAI embeddings failed (${resp.status}): ${errText}`);
  }
  const data = (await resp.json()) as {
    data: { embedding: number[]; index: number }[];
  };
  // Sort by index defensively — OpenAI returns in order but the
  // schema doesn't promise that.
  return data.data
    .slice()
    .sort((a, b) => a.index - b.index)
    .map((d) => d.embedding);
}

/**
 * Embed a single piece of text — typically the user's question.
 */
export async function embedOne(text: string): Promise<number[]> {
  const [vec] = await embedMany([text]);
  return vec;
}

/**
 * Chat-completion streaming. Returns a ReadableStream of UTF-8 bytes
 * containing the assistant's reply tokens in order — pipe straight
 * into a Next.js `Response`.
 *
 * The system prompt locks the model to the supplied context — no
 * outside knowledge, Arabic answer only, canned reply when the
 * context doesn't cover the question.
 */
export type ChatMessage = { role: 'user' | 'assistant'; content: string };

export async function answerStream({
  courseTitle,
  contextChunks,
  history,
  question,
}: {
  courseTitle: string;
  contextChunks: string[];
  /** Last few turns of the user/assistant conversation. Capped by
   *  the caller — pass at most ~6 messages. */
  history: ChatMessage[];
  question: string;
}): Promise<ReadableStream<Uint8Array>> {
  const context = contextChunks
    .map((c, i) => `[${i + 1}] ${c}`)
    .join('\n\n---\n\n');

  const systemPrompt = [
    `أنت "فاهم" — مساعد ذكي خاص بكورس "${courseTitle}" على منصة فاهم.`,
    `قواعد إجبارية:`,
    `- جاوب فقط بناءً على المعلومات المرفقة من الكورس في قسم "السياق" أدناه.`,
    `- ممنوع تستخدم معرفة خارجية عن الكورس ده. لو السؤال خارج محتوى الكورس، أو لو السياق ما فيهوش إجابة كافية، رد بالنص الحرفي: "المعلومة دي مش موجودة في الكورس ده."`,
    `- جاوب بالعربي دايماً، بأسلوب واضح ومباشر.`,
    `- لا تخترع أسماء، أرقام، أو تواريخ مش موجودة في السياق.`,
    `- لو السؤال عن "كيف" أو "اشرح"، قسّم الإجابة لخطوات لو ده يساعد.`,
    ``,
    `السياق:`,
    context || '(فاضي — رد بالرسالة الحرفية أعلاه)',
  ].join('\n');

  const messages = [
    { role: 'system' as const, content: systemPrompt },
    ...history.map((m) => ({ role: m.role, content: m.content })),
    { role: 'user' as const, content: question },
  ];

  const resp = await fetch(`${OPENAI_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${apiKey()}`,
    },
    body: JSON.stringify({
      model: chatModel(),
      messages,
      stream: true,
      temperature: 0.2, // low — we want context fidelity, not creativity
      max_tokens: 700,
    }),
  });

  if (!resp.ok || !resp.body) {
    const errText = await resp.text().catch(() => '');
    throw new Error(`OpenAI chat failed (${resp.status}): ${errText}`);
  }

  // Strip OpenAI SSE framing and emit only the content tokens as
  // bytes — the client renders raw text via TextDecoder.
  const reader = resp.body.getReader();
  const encoder = new TextEncoder();
  const decoder = new TextDecoder('utf-8');
  let buf = '';

  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        const { value, done } = await reader.read();
        if (done) {
          controller.close();
          return;
        }
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split('\n');
        buf = lines.pop() ?? '';
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data:')) continue;
          const payload = trimmed.slice(5).trim();
          if (!payload || payload === '[DONE]') continue;
          try {
            const json = JSON.parse(payload) as {
              choices: { delta?: { content?: string } }[];
            };
            const token = json.choices?.[0]?.delta?.content;
            if (token) controller.enqueue(encoder.encode(token));
          } catch {
            // Skip a malformed chunk — never let one bad line kill
            // the whole stream.
          }
        }
      } catch (err) {
        controller.error(err);
      }
    },
    cancel() {
      reader.cancel().catch(() => {});
    },
  });
}
