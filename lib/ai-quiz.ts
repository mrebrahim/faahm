/**
 * OpenAI-powered quiz question generator (gpt-4o).
 *
 * Why gpt-4o + Structured Outputs:
 *   - `response_format: { type: 'json_schema', strict: true }` guarantees
 *     the model returns JSON that matches our schema — no markdown fence
 *     stripping, no partial-JSON wrangling.
 *   - gpt-4o handles Arabic prompts and Arabic content generation cleanly.
 *
 * Why no SDK dependency: the REST surface we need is tiny (one POST) and
 * the official SDK pulls in extra deps that don't run on Edge runtime
 * without polyfills. A single fetch() keeps the bundle small.
 */

export type AiQuestionType = 'single_choice' | 'multiple_choice' | 'true_false' | 'mixed';

export type GeneratedQuestion = {
  question_ar: string;
  type: 'single_choice' | 'multiple_choice' | 'true_false';
  options: { option_ar: string; is_correct: boolean }[];
  explanation_ar?: string;
};

export type GenerateOptions = {
  topic: string;          // Free-text description of what the quiz is about
  questionType: AiQuestionType;
  count: number;          // 1-20
  difficulty?: 'easy' | 'medium' | 'hard' | 'mixed';
  language?: 'ar' | 'en'; // Output language; defaults to Arabic
};

const OPENAI_MODEL = 'gpt-4o';
const OPENAI_ENDPOINT = 'https://api.openai.com/v1/chat/completions';

/**
 * Strict JSON schema for OpenAI Structured Outputs. The model is forced
 * to return `{ questions: [...] }` matching this shape exactly. We wrap
 * the array in an object because Structured Outputs requires a top-level
 * object schema.
 */
function buildResponseSchema(allowedTypes: ('single_choice' | 'multiple_choice' | 'true_false')[]) {
  return {
    type: 'object',
    additionalProperties: false,
    properties: {
      questions: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            question_ar: { type: 'string' },
            type: { type: 'string', enum: allowedTypes },
            options: {
              type: 'array',
              items: {
                type: 'object',
                additionalProperties: false,
                properties: {
                  option_ar: { type: 'string' },
                  is_correct: { type: 'boolean' },
                },
                required: ['option_ar', 'is_correct'],
              },
            },
            explanation_ar: { type: 'string' },
          },
          required: ['question_ar', 'type', 'options', 'explanation_ar'],
        },
      },
    },
    required: ['questions'],
  };
}

function allowedTypesFor(t: AiQuestionType) {
  if (t === 'mixed') return ['single_choice', 'multiple_choice', 'true_false'] as const;
  return [t] as const;
}

function buildPrompt(opts: GenerateOptions): string {
  const langLabel = opts.language === 'en' ? 'English' : 'العربية الفصحى';
  const difficulty = opts.difficulty || 'medium';

  return [
    `أنت مولّد أسئلة كويز خبير. أنشئ ${opts.count} سؤال للموضوع التالي بـ${langLabel}:`,
    '',
    `"""`,
    opts.topic.slice(0, 4000),
    `"""`,
    '',
    `أنواع الأسئلة المسموحة: ${allowedTypesFor(opts.questionType).join(', ')}.`,
    opts.questionType === 'mixed'
      ? 'نوّع بين الأنواع المسموحة. ركّز على single_choice في معظم الأسئلة.'
      : '',
    `مستوى الصعوبة: ${difficulty}.`,
    '',
    'قواعد إجبارية:',
    '- لكل سؤال 2 إلى 6 خيارات.',
    '- single_choice: إجابة صحيحة واحدة فقط (is_correct=true في خيار واحد).',
    '- multiple_choice: إجابتان أو أكثر صحيحة.',
    '- true_false: خياران فقط بالضبط ("صح" و"خطأ") مع إجابة صحيحة واحدة.',
    '- لا تكرّر سؤالًا تكرارًا حرفيًا.',
    '- اجعل الأسئلة مرتبطة فعليًا بالموضوع — لا تخترع حقائق خارج المعطى.',
    '- أضف explanation_ar مختصر يشرح الإجابة الصحيحة (سطر واحد أو اثنين).',
    '- استخدم لغة ودودة واضحة بدون رموز Markdown.',
  ]
    .filter(Boolean)
    .join('\n');
}

/**
 * Call OpenAI and return the parsed questions. Throws a clear error when
 * the API key is missing, the call fails, or the model returns nothing
 * usable. Caller is responsible for inserting into the DB.
 */
export async function generateQuizQuestions(
  opts: GenerateOptions
): Promise<GeneratedQuestion[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      'OPENAI_API_KEY غير مضبوط على السيرفر — أضف المفتاح في إعدادات Vercel وحاول تاني.'
    );
  }
  if (!opts.topic.trim()) {
    throw new Error('الفقرة المُلخّصة للكويز مطلوبة.');
  }
  const count = Math.max(1, Math.min(20, Math.floor(opts.count)));

  const body = {
    model: OPENAI_MODEL,
    messages: [
      {
        role: 'system',
        content:
          'You are a strict quiz generator. Return only valid JSON matching the provided schema. Write Arabic content per the user instructions.',
      },
      {
        role: 'user',
        content: buildPrompt({ ...opts, count }),
      },
    ],
    temperature: 0.7,
    max_tokens: 4096,
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'quiz_questions',
        strict: true,
        schema: buildResponseSchema(
          Array.from(allowedTypesFor(opts.questionType)) as any
        ),
      },
    },
  };

  const res = await fetch(OPENAI_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
    cache: 'no-store',
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(
      `OpenAI ${res.status}: ${text.slice(0, 200) || 'فشل الاتصال'}`
    );
  }

  const data = (await res.json()) as any;
  const choice = data.choices?.[0];
  const finishReason = choice?.finish_reason;
  const rawText: string | undefined = choice?.message?.content;
  const refusal: string | undefined = choice?.message?.refusal;

  if (refusal) {
    throw new Error(`OpenAI رفض الطلب: ${refusal.slice(0, 200)}`);
  }
  if (!rawText) {
    throw new Error(`OpenAI أعاد ردًا فارغًا (finish_reason=${finishReason || 'unknown'}).`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    throw new Error('فشل تحليل رد OpenAI كـ JSON.');
  }
  const questions =
    parsed && typeof parsed === 'object' && 'questions' in (parsed as any)
      ? (parsed as any).questions
      : null;
  if (!Array.isArray(questions)) {
    throw new Error('OpenAI لم يُرجع قائمة أسئلة.');
  }

  // Trust but verify — drop malformed entries, enforce type-specific
  // rules so the DB insert never fails because of a hallucinated row.
  return questions
    .map((q: any) => normalizeQuestion(q))
    .filter((q): q is GeneratedQuestion => q !== null);
}

function normalizeQuestion(raw: any): GeneratedQuestion | null {
  if (!raw || typeof raw !== 'object') return null;

  const question_ar = typeof raw.question_ar === 'string' ? raw.question_ar.trim() : '';
  const type = raw.type;
  const explanation_ar =
    typeof raw.explanation_ar === 'string' ? raw.explanation_ar.trim() || undefined : undefined;

  if (!question_ar) return null;
  if (type !== 'single_choice' && type !== 'multiple_choice' && type !== 'true_false') return null;

  const rawOptions = Array.isArray(raw.options) ? raw.options : [];
  const options = rawOptions
    .map((o: any) => ({
      option_ar: typeof o?.option_ar === 'string' ? o.option_ar.trim() : '',
      is_correct: Boolean(o?.is_correct),
    }))
    .filter((o: { option_ar: string }) => o.option_ar);

  if (options.length < 2) return null;
  const correctCount = options.filter((o: { is_correct: boolean }) => o.is_correct).length;
  if (correctCount < 1) return null;

  if (type === 'single_choice' && correctCount !== 1) return null;
  if (type === 'true_false') {
    if (options.length !== 2) return null;
    if (correctCount !== 1) return null;
  }

  // Hard cap on the option list to match our DB-side constraints.
  return {
    question_ar: question_ar.slice(0, 500),
    type,
    options: options.slice(0, 6).map((o: { option_ar: string; is_correct: boolean }) => ({
      option_ar: o.option_ar.slice(0, 200),
      is_correct: o.is_correct,
    })),
    explanation_ar: explanation_ar?.slice(0, 500),
  };
}
