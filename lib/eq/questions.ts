import type { EqQuestion } from './types';

/**
 * 16 statements = 4 per domain. Interleaved across domains so the
 * questionnaire doesn't telegraph the structure (mitigates response
 * bias on a self-report instrument).
 *
 * All statements are original Arabic prose — no MBTI/16personalities/
 * EQ-i wording.
 */
export const EQ_QUESTIONS: EqQuestion[] = [
  // self_awareness
  { id: 'eq1', domain: 'self_awareness', text: 'بعرف بسرعة لما مزاجي بيتغيّر وأعرف السبب وراءه.' },
  // self_regulation
  { id: 'eq2', domain: 'self_regulation', text: 'لما حد يضايقني، بقدر أهدّي نفسي قبل ما أرد.' },
  // empathy
  { id: 'eq3', domain: 'empathy', text: 'بحسّ بمشاعر الناس حواليّ حتى من غير ما يقولوا.' },
  // social_skills
  { id: 'eq4', domain: 'social_skills', text: 'بقدر أحتوي خلاف من غير ما الموضوع يكبر.' },

  { id: 'eq5', domain: 'self_awareness', text: 'بقدر أوصف اللي بحس بيه بكلمات دقيقة، مش "كويس" أو "وحش" وخلاص.' },
  { id: 'eq6', domain: 'self_regulation', text: 'تحت الضغط، بحافظ على هدوئي وما بأخدش قرار سريع.' },
  { id: 'eq7', domain: 'empathy', text: 'بقدر أحط نفسي مكان غيري وأشوف الموقف من عينه.' },
  { id: 'eq8', domain: 'social_skills', text: 'بعرف أتواصل مع ناس من خلفيات مختلفة بسهولة.' },

  { id: 'eq9', domain: 'self_awareness', text: 'بفهم ليه بتصرف بشكل معين في مواقف معينة.' },
  { id: 'eq10', domain: 'self_regulation', text: 'بقدر أوقف عادة سيئة لما أقرر فعلاً.' },
  { id: 'eq11', domain: 'empathy', text: 'لما حد بيشتكي، بفهم احتياجه الحقيقي مش بس الكلام.' },
  { id: 'eq12', domain: 'social_skills', text: 'لو في تنشن في مجموعة، بقدر أهدّي الجو.' },

  { id: 'eq13', domain: 'self_awareness', text: 'بدرك تأثير مشاعري على قراراتي وقت ما بتحصل.' },
  { id: 'eq14', domain: 'self_regulation', text: 'لو زعلت من حد، بقدر أتعامل معاه طبيعي بعد فترة قصيرة.' },
  { id: 'eq15', domain: 'empathy', text: 'بلاحظ التغيرات الصغيرة في وش وصوت اللي قدامي.' },
  { id: 'eq16', domain: 'social_skills', text: 'الناس بتثق فيا وبتيجي تطلب رأيي.' },
];
