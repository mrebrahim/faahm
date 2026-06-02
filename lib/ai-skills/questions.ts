import type { AISkillsQuestion } from './types';

/**
 * 15 questions = 3 Level-1 + 4 Level-2 + 4 Level-3 + 4 Level-4.
 * Mix of knowledge checks ('do you know X?') and experience checks
 * ('have you built X?'). Same 0..3 answer scale for all questions
 * so the score stays comparable across rungs.
 */
export const AI_SKILLS_QUESTIONS: AISkillsQuestion[] = [
  // ============================ LEVEL 1 · Awareness ============================
  {
    id: 'k1',
    level: 'awareness',
    prompt: 'استخدمت ChatGPT أو Claude أو Gemini قبل كده؟',
    options: ['لأ، مش جربت', 'مرة واحدة بس', 'جرّبتهم', 'بستخدمهم بانتظام'],
  },
  {
    id: 'k2',
    level: 'awareness',
    prompt: 'تعرف يعني إيه Prompt وازاي يأثر على النتيجة؟',
    options: ['لأ', 'سمعت', 'فاهم بشكل عام', 'أيوة وفاهم ازاي يأثر'],
  },
  {
    id: 'k3',
    level: 'awareness',
    prompt: 'تعرف الفرق بين الـ AI و الـ Machine Learning و الـ LLMs؟',
    options: ['لأ خالص', 'شوية', 'فاهم بشكل عام', 'أيوة، أقدر أشرحه'],
  },

  // ============================ LEVEL 2 · Prompting ============================
  {
    id: 'k4',
    level: 'prompting',
    prompt:
      'لو AI طلّع إجابة عامة بدل اللي عاوزه بالظبط، تعرف ازاي تظبط الـ prompt؟',
    options: ['لأ، بسيب الموضوع', 'بصعوبة', 'أحاول وأنجح أحياناً', 'أيوة، عندي تكنيكات'],
  },
  {
    id: 'k5',
    level: 'prompting',
    prompt: 'تعرف يعني إيه Chain-of-Thought أو Few-Shot في الـ prompting؟',
    options: ['لأ', 'سمعت عنها', 'أعرف نظرياً', 'أيوة، باستخدمها'],
  },
  {
    id: 'k6',
    level: 'prompting',
    prompt:
      'استخدمت AI tool زي Midjourney أو Runway أو ElevenLabs قبل كده؟',
    options: ['لأ', 'جرّبت واحد', 'جرّبت أكتر من tool', 'أيوة، بانتظام'],
  },
  {
    id: 'k7',
    level: 'prompting',
    prompt: 'عملت deliverable كامل (مقال / فيديو / تصميم) باستخدام AI؟',
    options: ['لأ', 'حاولت بس ما طلعش كويس', 'مرة أو مرتين', 'أيوة، بشكل متكرر'],
  },

  // ============================ LEVEL 3 · Tooling ============================
  {
    id: 'k8',
    level: 'tooling',
    prompt:
      'ربطت قبل كده أكتر من أداة AI مع بعض في workflow واحد؟',
    options: ['لأ', 'حاولت', 'workflow بسيط', 'workflows متقدمة'],
  },
  {
    id: 'k9',
    level: 'tooling',
    prompt: 'استخدمت n8n أو Make أو Zapier مع نماذج AI؟',
    options: ['لأ', 'فتحت الأدوات بس ما عملتش', 'أتمتة بسيطة', 'أتمتة شغّالة في الإنتاج'],
  },
  {
    id: 'k10',
    level: 'tooling',
    prompt: 'تعرف يعني إيه RAG (Retrieval Augmented Generation)؟',
    options: ['لأ', 'سمعت', 'فاهم النظرية', 'أيوة، وعملت implementation'],
  },
  {
    id: 'k11',
    level: 'tooling',
    prompt:
      'تفرّق بين Fine-tuning, Few-shot, RAG — وامتى تستخدم كل واحد؟',
    options: ['لأ', 'شوية', 'فاهم النظرية', 'أيوة، وعارف امتى أستخدم كل واحد'],
  },

  // ============================ LEVEL 4 · Building ============================
  {
    id: 'k12',
    level: 'building',
    prompt: 'بنيت تطبيق أو أداة باستخدام AI APIs (OpenAI / Anthropic / غيرهم)؟',
    options: ['لأ', 'بدأت بس مكملتش', 'عندي prototype', 'أيوة، شغّال في production'],
  },
  {
    id: 'k13',
    level: 'building',
    prompt: 'عملت AI agent بياخد قرار وينفّذ لوحده؟',
    options: ['لأ', 'بفهم الفكرة بس ما عملتش', 'بنيت prototype', 'أيوة، شغّال'],
  },
  {
    id: 'k14',
    level: 'building',
    prompt:
      'تفرّق بين frameworks زي LangChain و LlamaIndex و CrewAI؟',
    options: ['لأ', 'سمعت', 'استخدمت واحد منهم', 'أيوة، استخدمت أكتر من واحد'],
  },
  {
    id: 'k15',
    level: 'building',
    prompt: 'عرضت / بعت حل AI شغّال لعملاء أو شركات؟',
    options: ['لأ', 'في طريقي', 'عرضت بس ما لقيتش عملاء', 'أيوة، عندي عملاء'],
  },
];
