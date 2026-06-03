import type { AIReadinessQuestion } from './types';

/**
 * 30 scenario-based items across the 6 PRD dimensions. Each option is
 * ordered from 'highest risk / least ready' (value=0) to 'most
 * protected / most ready' (value=3) so a higher Likert answer always
 * means more readiness, regardless of whether the dimension protects
 * or exposes the student.
 *
 * Order opens with the easier task-shape questions (PRD §6 — psych
 * ordering note) then ramps up to the harder mindset/economic ones.
 */
export const AI_READINESS_QUESTIONS: AIReadinessQuestion[] = [
  // ============================ Task Composition (5) ============================
  {
    id: 't1',
    dimension: 'task_composition',
    prompt: 'لو قسّمت يومك في الشغل، أد إيه منه مهام متكررة بنفس الطريقة كل مرة؟',
    options: [
      { value: 0, label: 'أغلب يومي روتين ثابت (نسخ، إدخال بيانات، ردود متشابهة)' },
      { value: 1, label: 'حوالي نص اليوم روتين والنص التاني مختلف' },
      { value: 2, label: 'شوية روتين بس أغلب الشغل بيختلف من حالة لحالة' },
      { value: 3, label: 'نادراً بعمل نفس الحاجة مرتين — كل مهمة ليها سياق مختلف' },
    ],
  },
  {
    id: 't2',
    dimension: 'task_composition',
    prompt: 'الشغل اللي بتعمله، حد تاني يقدر يعمله بنفس الجودة لو اداله نفس التعليمات المكتوبة؟',
    options: [
      { value: 0, label: 'آه — لو فيه خطوات مكتوبة أي حد ينفّذها' },
      { value: 1, label: 'غالباً، بس محتاج شوية تدريب' },
      { value: 2, label: 'صعب — فيه حاجات بتتعلم بالخبرة مش بالتعليمات' },
      { value: 3, label: 'مستحيل تتكتب في خطوات — بعتمد على حدس وقراءة الموقف' },
    ],
  },
  {
    id: 't3',
    dimension: 'task_composition',
    prompt: 'قرارات شغلك اليومية بتتاخد إزاي؟',
    options: [
      { value: 0, label: 'بطبّق قواعد جاهزة وواضحة' },
      { value: 1, label: 'بطبّق قواعد بس أحياناً بستثني' },
      { value: 2, label: 'بوازن بين عوامل كتير ومفيش إجابة واحدة صح' },
      { value: 3, label: 'بتعامل مع مواقف جديدة محدش عملها قبل كده' },
    ],
  },
  {
    id: 't4',
    dimension: 'task_composition',
    prompt: 'كل أد إيه بتقابل موقف جديد في شغلك مختلف عن اللي قبله؟',
    options: [
      { value: 0, label: 'نادراً — أغلب المواقف بتتكرّر' },
      { value: 1, label: 'مرة في الأسبوع تقريباً' },
      { value: 2, label: 'كل يوم تقريباً' },
      { value: 3, label: 'كل ساعة تقريباً — مفيش "روتين" أصلاً' },
    ],
  },
  {
    id: 't5',
    dimension: 'task_composition',
    prompt: 'لو حد كتب "كتالوج" لكل سيناريوهات شغلك، يقدر يغطّيها كلها؟',
    options: [
      { value: 0, label: 'آه — في 10-20 سيناريو وانتهى الموضوع' },
      { value: 1, label: 'يقدر يغطّي 80% منهم' },
      { value: 2, label: 'يقدر يغطّي النص، الباقي مفاجآت' },
      { value: 3, label: 'مفيش كتالوج ممكن يغطّي شغلي — كل حالة فريدة' },
    ],
  },

  // ============================ Digital Exposure (4) ============================
  {
    id: 'd1',
    dimension: 'digital_exposure',
    prompt: 'مخرجات شغلك الأساسية إيه؟',
    options: [
      { value: 0, label: 'نصوص، تقارير، أكواد، أو بيانات رقمية بحتة' },
      { value: 1, label: 'تصميمات أو محتوى إبداعي رقمي' },
      { value: 2, label: 'مزيج: شغل رقمي + تعامل بشري' },
      { value: 3, label: 'تعامل بشري مباشر، عمل يدوي، أو حضور فيزيائي' },
    ],
  },
  {
    id: 'd2',
    dimension: 'digital_exposure',
    prompt: 'علشان تخلّص شغلك، محتاج تكون موجود مكان معيّن أو تتعامل مع ناس وجهاً لوجه؟',
    options: [
      { value: 0, label: 'لأ، ممكن يتعمل كله من أي مكان على لابتوب' },
      { value: 1, label: 'أغلبه remote بس فيه اجتماعات' },
      { value: 2, label: 'نص ونص' },
      { value: 3, label: 'آه — وجودي الشخصي جزء أساسي من القيمة' },
    ],
  },
  {
    id: 'd3',
    dimension: 'digital_exposure',
    prompt: 'مدخلات شغلك (المعلومات اللي بتشتغل عليها) بتيجي إزاي؟',
    options: [
      { value: 0, label: 'كلها بيانات منظّمة في جداول أو رسائل نصية' },
      { value: 1, label: 'مزيج بين بيانات وكلام مع ناس' },
      { value: 2, label: 'أغلبها من محادثات وقراءة المواقف' },
      { value: 3, label: 'من اللي بشوفه وبسمعه ومش متسجّل في أي مكان' },
    ],
  },
  {
    id: 'd4',
    dimension: 'digital_exposure',
    prompt: 'لو نزّلوا روبوت يعمل شغلك، أد إيه هيواجه صعوبة في الجزء الجسدي؟',
    options: [
      { value: 0, label: 'مفيش جزء جسدي خالص — كله شاشة وكي بورد' },
      { value: 1, label: 'فيه شوية حركة بس مش لازمة' },
      { value: 2, label: 'فيه جزء يدوي/جسدي مهم' },
      { value: 3, label: 'شغلي 70% منه جسدي/حضور أو لمس بشري' },
    ],
  },

  // ============================ Real AI Leverage (6) ============================
  {
    id: 'a1',
    dimension: 'ai_leverage',
    prompt: 'آخر أسبوع، استخدمت أداة AI كام مرة في شغلك الفعلي (مش تجربة)؟',
    options: [
      { value: 0, label: 'ولا مرة' },
      { value: 1, label: 'مرة أو مرتين — تجربة' },
      { value: 2, label: 'شبه يومي، بس في حاجات بسيطة' },
      { value: 3, label: 'بشكل أساسي — جزء من طريقة شغلي' },
    ],
  },
  {
    id: 'a2',
    dimension: 'ai_leverage',
    prompt: 'لما بتستخدم AI، بتستخدمه إزاي؟',
    options: [
      { value: 0, label: 'مش بستخدمه' },
      { value: 1, label: 'بكتب سؤال وباخد الرد زي ما هو' },
      { value: 2, label: 'بصيغ prompts كويسة وبراجع وبعدّل المخرج' },
      { value: 3, label: 'بربطه في workflows بتشتغل لوحدها (أتمتة، أدوات متكاملة)' },
    ],
  },
  {
    id: 'a3',
    dimension: 'ai_leverage',
    prompt: 'فيه مهمة كانت بتاخد منك ساعات وبقت دلوقتي دقايق بسبب AI؟',
    options: [
      { value: 0, label: 'لأ، شغلي زي ما هو' },
      { value: 1, label: 'فكرت في الموضوع بس معملتهوش' },
      { value: 2, label: 'آه، مهمة أو اتنين بقت أسرع' },
      { value: 3, label: 'آه، عملت ده في كذا حتة وبدوّر دايماً على المزيد' },
    ],
  },
  {
    id: 'a4',
    dimension: 'ai_leverage',
    prompt: 'عندك اشتراك مدفوع في أي tool AI (ChatGPT Plus / Claude Pro / غيرهم)؟',
    options: [
      { value: 0, label: 'مش عارف الفرق' },
      { value: 1, label: 'فكّرت أعمل، بس لسه' },
      { value: 2, label: 'اشتراك واحد' },
      { value: 3, label: 'أكتر من حساب — مش ممكن أشتغل بدونهم' },
    ],
  },
  {
    id: 'a5',
    dimension: 'ai_leverage',
    prompt: 'بنيت قبل كده automation أو AI agent بيشتغل لوحده (n8n / Make / Custom GPT)؟',
    options: [
      { value: 0, label: 'مش فاهم الكلام ده أصلاً' },
      { value: 1, label: 'سمعت عنه بس مجربتش' },
      { value: 2, label: 'جرّبت بناء بسيط' },
      { value: 3, label: 'بنيت أنظمة شغّالة بتوفّر عليّ ساعات' },
    ],
  },
  {
    id: 'a6',
    dimension: 'ai_leverage',
    prompt: 'لما زمايلك بيتعقّدوا في حاجة، بتلجأ للـ AI قبل ما تسأل حد؟',
    options: [
      { value: 0, label: 'لأ — مش بفكر فيه أصلاً' },
      { value: 1, label: 'نادراً' },
      { value: 2, label: 'في نص الحالات' },
      { value: 3, label: 'هو reflex أوّل ليّ' },
    ],
  },

  // ============================ Economic Moat (5) ============================
  {
    id: 'e1',
    dimension: 'economic_moat',
    prompt: 'بتتدفعلك فلوس على إيه بالظبط؟',
    options: [
      { value: 0, label: 'على عدد الساعات أو عدد القطع اللي بعملها' },
      { value: 1, label: 'على إني موجود وبنفّذ مطلوب مني' },
      { value: 2, label: 'على نتيجة محددة بسلّمها' },
      { value: 3, label: 'على نتيجة + ثقة العميل فيّ شخصياً' },
    ],
  },
  {
    id: 'e2',
    dimension: 'economic_moat',
    prompt: 'لو غبت أسبوع من غير ما تقول لحد، شغلك بيحصله إيه؟',
    options: [
      { value: 0, label: 'مفيش فرق، حد تاني يكمّل' },
      { value: 1, label: 'بيتأخر شوية بس ماشي' },
      { value: 2, label: 'بيتعطّل في حاجات مهمة' },
      { value: 3, label: 'بيقف — أنا اللي ماسك العلاقات والقرارات' },
    ],
  },
  {
    id: 'e3',
    dimension: 'economic_moat',
    prompt: 'العملاء بيتعاملوا مع مين — معاك انت شخصياً ولا مع الشركة/المنصة؟',
    options: [
      { value: 0, label: 'مع النظام، أنا مجرد منفّذ ورا الكواليس' },
      { value: 1, label: 'مع الشركة، بيشوفوني أحياناً' },
      { value: 2, label: 'بيعرفوني بس ممكن يستبدلوني' },
      { value: 3, label: 'معايا أنا — بيسألوا عليّ بالاسم ومش هيقبلوا بديل بسهولة' },
    ],
  },
  {
    id: 'e4',
    dimension: 'economic_moat',
    prompt: 'لو شركتك حبت تستبدلك، تقدر تلاقي بديل في أد إيه؟',
    options: [
      { value: 0, label: 'في أسبوع — شغلي واضح ومنظّم' },
      { value: 1, label: 'في شهر مع تدريب' },
      { value: 2, label: '3-6 شهور حتى يبني نفس العلاقات' },
      { value: 3, label: 'سنين — الخبرة اللي عندي مش بتتبني بسرعة' },
    ],
  },
  {
    id: 'e5',
    dimension: 'economic_moat',
    prompt: 'الحاجة اللي بتميّزك في شغلك بتبني نفسها في:',
    options: [
      { value: 0, label: 'أيام — أي حد بيقدر يعملها بشوية training' },
      { value: 1, label: 'شهور من الـ practice' },
      { value: 2, label: 'سنين من الخبرة' },
      { value: 3, label: 'سمعة وعلاقات اتبنت على مدى سنين' },
    ],
  },

  // ============================ Adaptation Velocity (5) ============================
  {
    id: 'v1',
    dimension: 'adaptation',
    prompt: 'آخر مهارة جديدة كبيرة اتعلمتها لشغلك كانت امتى؟',
    options: [
      { value: 0, label: 'من أكتر من سنتين' },
      { value: 1, label: 'خلال السنة اللي فاتت' },
      { value: 2, label: 'خلال آخر كام شهر' },
      { value: 3, label: 'بتعلّم حاجة جديدة شبه كل شهر' },
    ],
  },
  {
    id: 'v2',
    dimension: 'adaptation',
    prompt: 'أول ما بتظهر أداة جديدة في مجالك، بتعمل إيه؟',
    options: [
      { value: 0, label: 'بتجاهلها لحد ما تبقى ضرورة' },
      { value: 1, label: 'بستنى حد يشرحها أو كورس يطلع' },
      { value: 2, label: 'بقرأ عنها وبجرّبها لما يبقى عندي وقت' },
      { value: 3, label: 'بفتحها وبجرّبها بنفسي في نفس الأسبوع' },
    ],
  },
  {
    id: 'v3',
    dimension: 'adaptation',
    prompt: 'قارن نفسك بزمايلك في نفس المجال — انت فين من ناحية استخدام التكنولوجيا الجديدة؟',
    options: [
      { value: 0, label: 'أنا من آخر اللي بيتحركوا' },
      { value: 1, label: 'في المنتصف' },
      { value: 2, label: 'من المتقدمين شوية' },
      { value: 3, label: 'زمايلي بيسألوني أنا' },
    ],
  },
  {
    id: 'v4',
    dimension: 'adaptation',
    prompt: 'لو الـ landscape اتغيّر فجأة في مجالك، بتاخد قد إيه عشان تتكيّف؟',
    options: [
      { value: 0, label: 'سنة على الأقل — والـ stress بيوقّفني' },
      { value: 1, label: '6 شهور لو لقيت كورس' },
      { value: 2, label: 'شهور قليلة — بتعلّم بنفسي' },
      { value: 3, label: 'أسابيع — التغيير عندي عادة، مش حدث' },
    ],
  },
  {
    id: 'v5',
    dimension: 'adaptation',
    prompt: 'بتغيّر رأيك بسهولة لما تشوف دليل جديد يخالف اللي بتعتقده؟',
    options: [
      { value: 0, label: 'لأ، بفضّل اللي أعرفه' },
      { value: 1, label: 'بصعوبة' },
      { value: 2, label: 'لما الدليل قوي' },
      { value: 3, label: 'آه — حب تغيير الرأي عندي مهارة لا تتعوّض' },
    ],
  },

  // ============================ Mindset (3) ============================
  {
    id: 'm1',
    dimension: 'mindset',
    prompt: 'تخيّل إن AI قدر يعمل 50% من شغلك بكرة. رد فعلك إيه؟',
    options: [
      { value: 0, label: 'هتوتر وهحاول أتجاهل الموضوع' },
      { value: 1, label: 'هتقلق بس مش عارف أعمل إيه' },
      { value: 2, label: 'هشوف إزاي أركّز على الـ 50% الباقيين' },
      { value: 3, label: 'هستغل الوقت اللي اتوفّر عشان أعمل حاجة أكبر' },
    ],
  },
  {
    id: 'm2',
    dimension: 'mindset',
    prompt: 'بتشوف الـ AI إزاي بالنسبة لشغلك؟',
    options: [
      { value: 0, label: 'تهديد لازم أتجنبه' },
      { value: 1, label: 'حاجة لازم أتعامل معاها بالعافية' },
      { value: 2, label: 'أداة ممكن تساعدني' },
      { value: 3, label: 'ميزة بتخليني أعمل شغل 2 أو 3 ناس' },
    ],
  },
  {
    id: 'm3',
    dimension: 'mindset',
    prompt: 'لما بتتكلم عن الـ AI مع حد، أكتر إحساس عندك هو:',
    options: [
      { value: 0, label: 'القلق — "الناس هتفقد شغلها"' },
      { value: 1, label: 'الـ scepticism — "Hype وخلاص"' },
      { value: 2, label: 'الفضول — "خليني أفهم أكتر"' },
      { value: 3, label: 'الحماس — "ده هيغيّر كل حاجة وأنا جاهز"' },
    ],
  },

  // ============================ Bonus depth (2) ============================
  {
    id: 'b1',
    dimension: 'economic_moat',
    prompt: 'لو عميلك الأساسي عرف يستخدم AI بنفسه، هيفضل محتاجك ليه؟',
    options: [
      { value: 0, label: 'مش هيحتاجني' },
      { value: 1, label: 'هيحتاجني في حاجات بسيطة' },
      { value: 2, label: 'هيحتاجني للخبرة والتوجيه' },
      { value: 3, label: 'هيحتاجني عشان أنا اللي بربط الحتت ببعض وبتحمّل المسؤولية' },
    ],
  },
  {
    id: 'b2',
    dimension: 'economic_moat',
    prompt: 'القيمة اللي بتقدّمها بتيجي من "إنك بتعرف" ولا "إنك بتعمل"؟',
    options: [
      { value: 0, label: 'من معرفة معلومات ممكن أي حد يلاقيها دلوقتي' },
      { value: 1, label: 'من تنفيذ مهام واضحة' },
      { value: 2, label: 'من خبرة في تطبيق المعرفة على مواقف حقيقية' },
      { value: 3, label: 'من حكم وثقة وعلاقات مبتتعوّضش بسهولة' },
    ],
  },
];
