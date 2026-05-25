/**
 * Gemini-powered quiz question generator.
 *
 * Why Gemini Flash specifically:
 *   - Native JSON-schema output (responseMimeType + responseSchema) so
 *     we never have to wrangle markdown fences or partial JSON
 *   - Fast + cheap for the question-generation workload (typical request
 *     under 2 seconds for 10 questions)
 *
 * Why no SDK dependency: the REST API surface is tiny and the SDK
 * pulls in @google/generative-ai which doesn't run on Edge runtime
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

const GEMINI_MODEL = 'gemini-1.5-flash-latest';
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

/**
 * Schema we hand to Gemini's `responseSchema` so the model is forced
 * to emit a valid array we can insert directly. Numeric option counts
 * and `is_correct` boolean shapes match our quiz_options table.
 */
function buildResponseSchema(allowedTypes: ('single_choice' | 'multiple_choice' | 'true_false')[]) {
  return {
    type: 'ARRAY',
    items: {
      type: 'OBJECT',
      properties: {
        question_ar: { type: 'STRING' },
        type: { type: 'STRING', enum: allowedTypes },
        options: {
          type: 'ARRAY',
          minItems: 2,
          maxItems: 6,
          items: {
            type: 'OBJECT',
            properties: {
              option_ar: { type: 'STRING' },
              is_correct: { type: 'BOOLEAN' },
            },
            required: ['option_ar', 'is_correct'],
          },
        },
        explanation_ar: { type: 'STRING' },
      },
      required: ['question_ar', 'type', 'options'],
    },
  };
}

function allowedTypesFor(t: AiQuestionType) {
  if (t === 'mixed') return ['single_choice', 'multiple_choice', 'true_false'] as const;
  return [t] as const;
}

function buildPrompt(opts: GenerateOptions): string {
  const langLabel = opts.language === 'en' ? 'English' : 'العربية الفصحى';
  const difficulty = opts.difficulty || 'medium';

  // Long Arabic prompt — Gemini handles bilingual prompts well, and
  // keeping the meta-instructions in Arabic biases the output language
  // when we leave language unspecified.
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
 * Call Gemini and return the parsed questions. Throws a clear error when
 * the API key is missing, the call fails, or the model returns nothing
 * usable. Caller is responsible for inserting into the DB.
 */
export async function generateQuizQuestions(
  opts: GenerateOptions
): Promise<GeneratedQuestion[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      'GEMINI_API_KEY غير مضبوط على السيرفر — أضف المفتاح في إعدادات Vercel وحاول تاني.'
    );
  }
  if (!opts.topic.trim()) {
    throw new Error('الفقرة المُلخّصة للكويز مطلوبة.');
  }
  const count = Math.max(1, Math.min(20, Math.floor(opts.count)));

  const body = {
    contents: [
      {
        role: 'user',
        parts: [{ text: buildPrompt({ ...opts, count }) }],
      },
    ],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: buildResponseSchema(
        Array.from(allowedTypesFor(opts.questionType)) as any
      ),
      temperature: 0.7,
      // Plenty of headroom for 20 questions × ~6 options each.
      maxOutputTokens: 4096,
    },
    safetySettings: [
      // Quizzes are educational; loosen the defaults so the model doesn't
      // refuse legitimate course topics. We still keep the strict ones.
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
    ],
  };

  const res = await fetch(`${GEMINI_ENDPOINT}?key=${encodeURIComponent(apiKey)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    cache: 'no-store',
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(
      `Gemini ${res.status}: ${text.slice(0, 200) || 'فشل الاتصال'}`
    );
  }

  const data = (await res.json()) as any;
  const finishReason = data.candidates?.[0]?.finishReason;
  const rawText: string | undefined = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!rawText) {
    if (finishReason === 'SAFETY') {
      throw new Error('Gemini رفض الموضوع لاعتبارات أمان. عدّل الفقرة وحاول تاني.');
    }
    throw new Error(`Gemini أعاد ردًا فارغًا (finishReason=${finishReason || 'unknown'}).`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    throw new Error('فشل تحليل رد Gemini كـ JSON.');
  }
  if (!Array.isArray(parsed)) {
    throw new Error('Gemini لم يُرجع قائمة أسئلة.');
  }

  // Trust but verify — drop malformed entries, enforce the type-specific
  // rules so the DB insert never fails because of a hallucinated row.
  return parsed
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
