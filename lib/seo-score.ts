/**
 * SEO + GEO analysis for blog drafts — the Yoast-style checklist.
 *
 * Two scores, because they reward different things:
 *
 *   SEO — will Google rank this? Keyword placement, title and meta
 *   lengths, headings, links, image alt text.
 *
 *   GEO — will ChatGPT / Perplexity / AI Overviews CITE this? That's a
 *   different game: answer-first structure, a TL;DR the model can lift,
 *   FAQ pairs, concrete numbers and named entities rather than vague
 *   claims. An article can rank well and never get quoted.
 *
 * Every check returns Arabic copy, because the person reading it writes
 * in Arabic.
 */

export type CheckStatus = 'good' | 'warn' | 'bad';

export type SeoCheck = {
  id: string;
  status: CheckStatus;
  label: string;
  /** What to actually do about it. */
  hint?: string;
};

export type SeoAnalysis = {
  seoScore: number;
  geoScore: number;
  seo: SeoCheck[];
  geo: SeoCheck[];
};

export type PostForAnalysis = {
  title: string;
  slug: string;
  excerpt?: string | null;
  content: string;
  seoTitle?: string | null;
  seoDescription?: string | null;
  focusKeyword?: string | null;
  keywords?: string[] | null;
  coverImageUrl?: string | null;
  coverAlt?: string | null;
  tldr?: string | null;
  faq?: Array<{ q: string; a: string }> | null;
};

/**
 * Arabic needs normalising before any keyword match: أ/إ/آ all read as
 * ا to a human, ة and ه get typed interchangeably, and diacritics are
 * usually absent from the body but present in a carefully typed
 * keyword. Without this, "الذكاء الإصطناعي" wouldn't match
 * "الذكاء الاصطناعي" and the author would be told their keyword is
 * missing from an article that's about nothing else.
 */
export function normalizeAr(input: string): string {
  return input
    .toLowerCase()
    .replace(/[ً-ْٰـ]/g, '') // harakat + tatweel
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/\s+/g, ' ')
    .trim();
}

function countOccurrences(haystack: string, needle: string): number {
  if (!needle) return 0;
  const h = normalizeAr(haystack);
  const n = normalizeAr(needle);
  if (!n) return 0;
  let count = 0;
  let i = h.indexOf(n);
  while (i !== -1) {
    count += 1;
    i = h.indexOf(n, i + n.length);
  }
  return count;
}

function contains(haystack: string, needle: string): boolean {
  return countOccurrences(haystack, needle) > 0;
}

/** Strip markdown/shortcodes so word counts measure prose, not syntax. */
export function plainText(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/\[(youtube|bunny):[^\]]+\]/gi, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[#>*_`~|-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function wordCount(markdown: string): number {
  const t = plainText(markdown);
  return t ? t.split(/\s+/).length : 0;
}

export function readingTimeMin(markdown: string): number {
  // ~180 wpm is a reasonable Arabic reading pace; never report 0.
  return Math.max(1, Math.round(wordCount(markdown) / 180));
}

function scoreOf(checks: SeoCheck[]): number {
  if (!checks.length) return 0;
  const points = checks.reduce(
    (sum, c) => sum + (c.status === 'good' ? 1 : c.status === 'warn' ? 0.5 : 0),
    0
  );
  return Math.round((points / checks.length) * 100);
}

export function analysePost(post: PostForAnalysis): SeoAnalysis {
  const kw = (post.focusKeyword ?? '').trim();
  const body = post.content ?? '';
  const text = plainText(body);
  const words = wordCount(body);
  const headings = body.match(/^#{2,3}\s+.+$/gm) ?? [];
  const firstParagraph = text.slice(0, 300);

  // ---------------- SEO ----------------
  const seo: SeoCheck[] = [];

  if (!kw) {
    seo.push({
      id: 'focus',
      status: 'bad',
      label: 'مفيش كلمة مفتاحية رئيسية',
      hint: 'حدّد العبارة اللي عايز المقال يترتب عليها في جوجل.',
    });
  } else {
    seo.push({ id: 'focus', status: 'good', label: `الكلمة المفتاحية: "${kw}"` });

    seo.push(
      contains(post.title, kw)
        ? { id: 'kw-title', status: 'good', label: 'الكلمة المفتاحية في العنوان' }
        : {
            id: 'kw-title',
            status: 'bad',
            label: 'الكلمة المفتاحية مش في العنوان',
            hint: 'حطّها في العنوان، ويفضّل في أوله.',
          }
    );

    seo.push(
      contains(post.slug.replace(/-/g, ' '), kw)
        ? { id: 'kw-slug', status: 'good', label: 'الكلمة المفتاحية في الرابط' }
        : {
            id: 'kw-slug',
            status: 'warn',
            label: 'الكلمة المفتاحية مش في الرابط',
            hint: 'رابط فيه الكلمة بيساعد، بس متغيّرش رابط مقال منشور — هتكسر لينكاته.',
          }
    );

    seo.push(
      contains(firstParagraph, kw)
        ? { id: 'kw-intro', status: 'good', label: 'الكلمة المفتاحية في أول فقرة' }
        : {
            id: 'kw-intro',
            status: 'bad',
            label: 'الكلمة المفتاحية مش في أول فقرة',
            hint: 'اذكرها في أول ١٠٠ كلمة.',
          }
    );

    seo.push(
      headings.some((h) => contains(h, kw))
        ? { id: 'kw-heading', status: 'good', label: 'الكلمة المفتاحية في عنوان فرعي' }
        : {
            id: 'kw-heading',
            status: 'warn',
            label: 'الكلمة المفتاحية مش في أي عنوان فرعي',
            hint: 'حطّها في H2 أو H3 واحد على الأقل.',
          }
    );

    seo.push(
      contains(post.seoDescription ?? post.excerpt ?? '', kw)
        ? { id: 'kw-meta', status: 'good', label: 'الكلمة المفتاحية في وصف الميتا' }
        : {
            id: 'kw-meta',
            status: 'warn',
            label: 'الكلمة المفتاحية مش في وصف الميتا',
            hint: 'جوجل بيظلّلها في نتيجة البحث.',
          }
    );

    // Density. Under 0.5% reads as off-topic to a crawler; over 2.5%
    // reads as stuffing, which is actively penalised.
    const density = words > 0 ? (countOccurrences(text, kw) / words) * 100 : 0;
    seo.push(
      density < 0.3
        ? {
            id: 'density',
            status: 'warn',
            label: `تكرار الكلمة قليل (${density.toFixed(1)}%)`,
            hint: 'اذكرها كذا مرة طبيعية على طول المقال.',
          }
        : density > 2.5
          ? {
              id: 'density',
              status: 'bad',
              label: `تكرار الكلمة عالي أوي (${density.toFixed(1)}%)`,
              hint: 'الحشو بيضرّ. قلّلها أو استخدم مرادفات.',
            }
          : { id: 'density', status: 'good', label: `تكرار الكلمة مظبوط (${density.toFixed(1)}%)` }
    );
  }

  const seoTitle = (post.seoTitle || post.title || '').trim();
  seo.push(
    seoTitle.length === 0
      ? { id: 'title-len', status: 'bad', label: 'مفيش عنوان' }
      : seoTitle.length < 30
        ? {
            id: 'title-len',
            status: 'warn',
            label: `العنوان قصير (${seoTitle.length} حرف)`,
            hint: 'الأفضل بين ٣٠ و٦٠ حرف.',
          }
        : seoTitle.length > 60
          ? {
              id: 'title-len',
              status: 'warn',
              label: `العنوان طويل (${seoTitle.length} حرف)`,
              hint: 'جوجل هيقصّه بعد ٦٠ حرف تقريباً.',
            }
          : { id: 'title-len', status: 'good', label: `طول العنوان مظبوط (${seoTitle.length})` }
  );

  const desc = (post.seoDescription || post.excerpt || '').trim();
  seo.push(
    desc.length === 0
      ? {
          id: 'desc-len',
          status: 'bad',
          label: 'مفيش وصف ميتا',
          hint: 'من غيره جوجل بيختار سطر عشوائي من المقال.',
        }
      : desc.length < 120
        ? {
            id: 'desc-len',
            status: 'warn',
            label: `الوصف قصير (${desc.length} حرف)`,
            hint: 'الأفضل بين ١٢٠ و١٦٠ حرف.',
          }
        : desc.length > 160
          ? { id: 'desc-len', status: 'warn', label: `الوصف طويل (${desc.length} حرف)` }
          : { id: 'desc-len', status: 'good', label: `طول الوصف مظبوط (${desc.length})` }
  );

  seo.push(
    words >= 900
      ? { id: 'length', status: 'good', label: `طول المقال ممتاز (${words} كلمة)` }
      : words >= 400
        ? {
            id: 'length',
            status: 'warn',
            label: `المقال متوسط (${words} كلمة)`,
            hint: 'المقالات اللي بترتب عادةً فوق ٩٠٠ كلمة.',
          }
        : {
            id: 'length',
            status: 'bad',
            label: `المقال قصير (${words} كلمة)`,
            hint: 'أقل من ٤٠٠ كلمة نادراً بيترتب.',
          }
  );

  seo.push(
    headings.length >= 3
      ? { id: 'headings', status: 'good', label: `${headings.length} عنوان فرعي` }
      : headings.length >= 1
        ? { id: 'headings', status: 'warn', label: 'عناوين فرعية قليلة', hint: 'قسّم المقال بـ H2.' }
        : {
            id: 'headings',
            status: 'bad',
            label: 'مفيش عناوين فرعية',
            hint: 'استخدم ## عشان تقسّم المقال — بيساعد القارئ وجوجل.',
          }
  );

  const images = body.match(/!\[[^\]]*\]\([^)]*\)/g) ?? [];
  const imagesWithAlt = images.filter((m) => !/^!\[\s*\]/.test(m));
  seo.push(
    !post.coverImageUrl
      ? { id: 'cover', status: 'bad', label: 'مفيش صورة غلاف', hint: 'مهمة للمشاركة والسوشيال.' }
      : !post.coverAlt
        ? {
            id: 'cover',
            status: 'warn',
            label: 'صورة الغلاف من غير نص بديل',
            hint: 'النص البديل مهم للسيو وللقارئ الكفيف.',
          }
        : { id: 'cover', status: 'good', label: 'صورة غلاف بنص بديل' }
  );

  if (images.length) {
    seo.push(
      imagesWithAlt.length === images.length
        ? { id: 'alts', status: 'good', label: 'كل الصور عندها نص بديل' }
        : {
            id: 'alts',
            status: 'warn',
            label: `${images.length - imagesWithAlt.length} صورة من غير نص بديل`,
          }
    );
  }

  const internalLinks = (body.match(/\]\((?:\/|https?:\/\/faahm\.com)/g) ?? []).length;
  seo.push(
    internalLinks >= 2
      ? { id: 'internal', status: 'good', label: `${internalLinks} لينك داخلي` }
      : {
          id: 'internal',
          status: 'warn',
          label: 'لينكات داخلية قليلة',
          hint: 'اربط بكورسات فاهم أو مقالات تانية — بيوزّع قوة الصفحات.',
        }
  );

  // ---------------- GEO ----------------
  const geo: SeoCheck[] = [];

  const tldr = (post.tldr ?? '').trim();
  geo.push(
    tldr.length >= 80
      ? { id: 'tldr', status: 'good', label: 'فيه ملخّص إجابة مباشرة' }
      : tldr.length > 0
        ? { id: 'tldr', status: 'warn', label: 'الملخّص قصير', hint: 'خليه ٢-٤ جمل تجاوب السؤال.' }
        : {
            id: 'tldr',
            status: 'bad',
            label: 'مفيش ملخّص إجابة',
            hint: 'المساعدات الذكية بتقتبس أول الكلام. الملخّص ده هو اللي هيتقال عنك.',
          }
  );

  const faq = post.faq ?? [];
  geo.push(
    faq.length >= 3
      ? { id: 'faq', status: 'good', label: `${faq.length} سؤال وجواب` }
      : faq.length > 0
        ? { id: 'faq', status: 'warn', label: 'أسئلة قليلة', hint: 'حط ٣ على الأقل.' }
        : {
            id: 'faq',
            status: 'bad',
            label: 'مفيش أسئلة شائعة',
            hint: 'أزواج سؤال/جواب بتظهر كـ FAQ في جوجل وبتتقري من الـ AI مباشرة.',
          }
  );

  // Question-shaped headings map onto how people actually prompt an
  // assistant — "ازاي…", "ايه الفرق…", "ليه…".
  const questionHeadings = headings.filter((h) =>
    /(\?|؟|ازاي|إزاي|ليه|ايه|إيه|امتى|إمتى|فين|مين|كام)/.test(h)
  );
  geo.push(
    questionHeadings.length >= 2
      ? { id: 'q-headings', status: 'good', label: 'عناوين على شكل أسئلة' }
      : {
          id: 'q-headings',
          status: 'warn',
          label: 'العناوين مش على شكل أسئلة',
          hint: 'الناس بتسأل الـ AI بصيغة سؤال — خلي عناوينك تشبه سؤالهم.',
        }
  );

  // Concrete numbers are what a model quotes; "كتير" and "أفضل" are not.
  const numbers = (text.match(/\d[\d,.]*\s*(%|٪|جنيه|دولار|ساعة|دقيقة|يوم|شهر|سنة|كلمة|مرة)?/g) ?? [])
    .length;
  geo.push(
    numbers >= 5
      ? { id: 'facts', status: 'good', label: 'فيه أرقام وحقائق محدّدة' }
      : {
          id: 'facts',
          status: 'warn',
          label: 'أرقام قليلة',
          hint: 'الـ AI بيقتبس الأرقام المحدّدة، مش الكلام العام زي "كتير" و"أفضل".',
        }
  );

  geo.push(
    contains(text, 'فاهم')
      ? { id: 'entity', status: 'good', label: 'اسم فاهم مذكور في المقال' }
      : {
          id: 'entity',
          status: 'warn',
          label: 'اسم فاهم مش مذكور',
          hint: 'عشان الـ AI يربط المحتوى بالبراند لما يقتبسه.',
        }
  );

  geo.push(
    (post.keywords ?? []).length >= 3
      ? { id: 'related', status: 'good', label: 'فيه كلمات مرتبطة' }
      : {
          id: 'related',
          status: 'warn',
          label: 'كلمات مرتبطة قليلة',
          hint: 'ضيف مرادفات ومصطلحات قريبة — بتساعد الفهم الدلالي.',
        }
  );

  geo.push(
    words >= 600
      ? { id: 'depth', status: 'good', label: 'المقال فيه عمق كفاية للاقتباس' }
      : { id: 'depth', status: 'warn', label: 'المقال قصير على الاقتباس' }
  );

  return { seoScore: scoreOf(seo), geoScore: scoreOf(geo), seo, geo };
}

/** Slugify an Arabic or English title into a URL-safe, readable slug. */
export function slugify(input: string): string {
  return (
    normalizeAr(input)
      // Keep Arabic letters, latin, digits; everything else becomes a dash.
      .replace(/[^ء-يa-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80) || 'post'
  );
}
