'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { analysePost, slugify, wordCount, type SeoCheck } from '@/lib/seo-score';

/**
 * Post editor with a live SEO/GEO panel.
 *
 * Client component because the whole value is that the score updates as
 * you type — a "save and see your score" loop gets ignored, and the
 * article ships with an empty meta description.
 *
 * The scoring itself lives in lib/seo-score.ts so the same rules could
 * later run server-side (a pre-publish gate, say) without being
 * reimplemented.
 */
type Category = { id: string; name_ar: string };

export type EditorPost = {
  id?: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  cover_image_url: string;
  cover_alt: string;
  category_id: string;
  tags: string;
  status: string;
  seo_title: string;
  seo_description: string;
  focus_keyword: string;
  keywords: string;
  canonical_url: string;
  og_image_url: string;
  no_index: boolean;
  tldr: string;
  faq: string;
};

export function BlogEditor({
  post,
  categories,
  action,
  uploadedUrl,
}: {
  post: EditorPost;
  categories: Category[];
  action: (formData: FormData) => void;
  uploadedUrl?: string;
}) {
  const [f, setF] = useState<EditorPost>(post);
  const [slugTouched, setSlugTouched] = useState(Boolean(post.slug));
  const [tab, setTab] = useState<'content' | 'seo' | 'geo'>('content');

  const set = <K extends keyof EditorPost>(key: K, value: EditorPost[K]) =>
    setF((prev) => ({ ...prev, [key]: value }));

  const analysis = useMemo(
    () =>
      analysePost({
        title: f.title,
        slug: f.slug,
        excerpt: f.excerpt,
        content: f.content,
        seoTitle: f.seo_title,
        seoDescription: f.seo_description,
        focusKeyword: f.focus_keyword,
        keywords: f.keywords.split(/[,،\n]/).map((s) => s.trim()).filter(Boolean),
        coverImageUrl: f.cover_image_url,
        coverAlt: f.cover_alt,
        tldr: f.tldr,
        faq: f.faq
          .split(/\n\s*\n/)
          .map((b) => {
            const [q, ...rest] = b.split('\n');
            return { q: (q ?? '').trim(), a: rest.join(' ').trim() };
          })
          .filter((x) => x.q && x.a),
      }),
    [f]
  );

  const words = wordCount(f.content);

  const insert = (snippet: string) =>
    set('content', `${f.content}${f.content.endsWith('\n') || !f.content ? '' : '\n'}${snippet}\n`);

  return (
    <form action={action} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {post.id ? <input type="hidden" name="id" value={post.id} /> : null}

      {/* Hidden mirrors: the visible inputs are controlled, and these
          carry the values into the server action. */}
      {(
        [
          'title', 'slug', 'excerpt', 'content', 'cover_image_url', 'cover_alt',
          'category_id', 'tags', 'status', 'seo_title', 'seo_description',
          'focus_keyword', 'keywords', 'canonical_url', 'og_image_url', 'tldr', 'faq',
        ] as const
      ).map((k) => (
        <input key={k} type="hidden" name={k} value={String(f[k] ?? '')} />
      ))}
      {f.no_index ? <input type="hidden" name="no_index" value="on" /> : null}

      {/* ---------- main column ---------- */}
      <div className="lg:col-span-2 space-y-4 min-w-0">
        <div className="-mx-4 px-4 overflow-x-auto md:mx-0 md:px-0">
          <div className="flex gap-2 w-max md:w-auto">
            {(
              [
                ['content', '📝 المحتوى'],
                ['seo', `🔍 السيو (${analysis.seoScore})`],
                ['geo', `🤖 الذكاء الاصطناعي (${analysis.geoScore})`],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                className={`flex-shrink-0 whitespace-nowrap text-sm px-4 py-2 rounded-full border transition-colors ${
                  tab === key
                    ? 'bg-brand-500 text-white border-brand-500'
                    : 'bg-white text-gray-600 border-gray-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {tab === 'content' && (
          <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-4 sm:p-5">
            <div>
              <Label htmlFor="b-title">العنوان</Label>
              <Input
                id="b-title"
                value={f.title}
                onChange={(e) => {
                  set('title', e.target.value);
                  if (!slugTouched) set('slug', slugify(e.target.value));
                }}
                placeholder="عنوان المقال"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="b-slug">الرابط</Label>
              <Input
                id="b-slug"
                dir="ltr"
                value={f.slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  set('slug', e.target.value);
                }}
                className="mt-1 font-mono text-sm"
              />
              <p className="text-xs text-gray-500 mt-1 break-all">
                faahm.com/blog/{f.slug || '…'}
              </p>
              {post.id ? (
                <p className="text-xs text-amber-600 mt-1">
                  ⚠️ تغيير رابط مقال منشور بيكسر كل اللينكات القديمة ليه.
                </p>
              ) : null}
            </div>

            <div>
              <Label htmlFor="b-excerpt">مقدمة قصيرة</Label>
              <textarea
                id="b-excerpt"
                value={f.excerpt}
                onChange={(e) => set('excerpt', e.target.value)}
                rows={2}
                maxLength={300}
                className="mt-1 w-full rounded-lg border border-gray-200 p-3 text-sm"
              />
            </div>

            {/* Insert toolbar — the WordPress-ish part */}
            <div>
              <Label>المحتوى</Label>
              <div className="flex gap-2 flex-wrap my-2">
                <ToolBtn onClick={() => insert('## عنوان فرعي')}>عنوان</ToolBtn>
                <ToolBtn onClick={() => insert('**نص عريض**')}>عريض</ToolBtn>
                <ToolBtn onClick={() => insert('- عنصر في قائمة')}>قائمة</ToolBtn>
                <ToolBtn onClick={() => insert('> اقتباس')}>اقتباس</ToolBtn>
                <ToolBtn onClick={() => insert('[نص اللينك](/courses)')}>لينك</ToolBtn>
                <ToolBtn onClick={() => insert('![وصف الصورة](https://faahm.b-cdn.net/blog/…jpg)')}>
                  صورة
                </ToolBtn>
                <ToolBtn onClick={() => insert('[youtube:VIDEO_ID]')}>يوتيوب</ToolBtn>
                <ToolBtn onClick={() => insert('[bunny:LIBRARY_ID/VIDEO_GUID]')}>Bunny</ToolBtn>
              </div>

              {uploadedUrl ? (
                <div className="mb-2 p-2 rounded-lg bg-brand-500/10 border border-brand-500/30 text-xs break-all">
                  اترفعت ✅ انسخها:{' '}
                  <code className="font-mono">![وصف]({uploadedUrl})</code>
                </div>
              ) : null}

              <textarea
                value={f.content}
                onChange={(e) => set('content', e.target.value)}
                rows={20}
                className="w-full rounded-lg border border-gray-200 p-3 text-sm leading-relaxed font-mono"
                placeholder={'## مقدمة\n\nاكتب هنا…\n\n[youtube:dQw4w9WgXcQ]'}
              />
              <p className="text-xs text-gray-500 mt-1">
                {words} كلمة · Markdown مدعوم · للفيديو استخدم{' '}
                <code>[youtube:ID]</code> أو <code>[bunny:LIB/GUID]</code>
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="b-cover">رابط صورة الغلاف</Label>
                <Input
                  id="b-cover"
                  dir="ltr"
                  value={f.cover_image_url}
                  onChange={(e) => set('cover_image_url', e.target.value)}
                  className="mt-1 text-sm"
                  placeholder="https://faahm.b-cdn.net/blog/…"
                />
              </div>
              <div>
                <Label htmlFor="b-alt">النص البديل للغلاف</Label>
                <Input
                  id="b-alt"
                  value={f.cover_alt}
                  onChange={(e) => set('cover_alt', e.target.value)}
                  className="mt-1 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="b-cat">التصنيف</Label>
                <select
                  id="b-cat"
                  value={f.category_id}
                  onChange={(e) => set('category_id', e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-200 p-2.5 text-sm bg-white"
                >
                  <option value="">— اختار —</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name_ar}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="b-tags">وسوم (بفاصلة)</Label>
                <Input
                  id="b-tags"
                  value={f.tags}
                  onChange={(e) => set('tags', e.target.value)}
                  className="mt-1 text-sm"
                  placeholder="n8n, أتمتة, ChatGPT"
                />
              </div>
            </div>
          </div>
        )}

        {tab === 'seo' && (
          <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-4 sm:p-5">
            <div>
              <Label htmlFor="b-kw">الكلمة المفتاحية الرئيسية</Label>
              <Input
                id="b-kw"
                value={f.focus_keyword}
                onChange={(e) => set('focus_keyword', e.target.value)}
                className="mt-1"
                placeholder="مثلاً: الذكاء الاصطناعي للمبتدئين"
              />
              <p className="text-xs text-gray-500 mt-1">
                العبارة اللي عايز المقال يترتب عليها في جوجل. واحدة بس.
              </p>
            </div>

            <div>
              <Label htmlFor="b-kws">كلمات مرتبطة (بفاصلة)</Label>
              <Input
                id="b-kws"
                value={f.keywords}
                onChange={(e) => set('keywords', e.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="b-stitle">عنوان السيو</Label>
              <Input
                id="b-stitle"
                value={f.seo_title}
                onChange={(e) => set('seo_title', e.target.value)}
                className="mt-1"
                placeholder={f.title}
              />
              <Counter value={(f.seo_title || f.title).length} min={30} max={60} />
            </div>

            <div>
              <Label htmlFor="b-sdesc">وصف الميتا</Label>
              <textarea
                id="b-sdesc"
                value={f.seo_description}
                onChange={(e) => set('seo_description', e.target.value)}
                rows={3}
                className="mt-1 w-full rounded-lg border border-gray-200 p-3 text-sm"
              />
              <Counter value={f.seo_description.length} min={120} max={160} />
            </div>

            {/* Google preview */}
            <div className="rounded-xl border border-gray-200 p-4 bg-gray-50">
              <p className="text-xs text-gray-500 mb-2">شكله في جوجل:</p>
              <p className="text-xs text-gray-600 break-all" dir="ltr">
                faahm.com › blog › {f.slug}
              </p>
              <p className="text-[#1a0dab] text-lg leading-snug line-clamp-1">
                {f.seo_title || f.title || 'عنوان المقال'}
              </p>
              <p className="text-sm text-gray-600 line-clamp-2">
                {f.seo_description || f.excerpt || 'وصف المقال هيظهر هنا…'}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="b-canon">رابط canonical (اختياري)</Label>
                <Input
                  id="b-canon"
                  dir="ltr"
                  value={f.canonical_url}
                  onChange={(e) => set('canonical_url', e.target.value)}
                  className="mt-1 text-sm"
                />
              </div>
              <div>
                <Label htmlFor="b-og">صورة المشاركة (اختياري)</Label>
                <Input
                  id="b-og"
                  dir="ltr"
                  value={f.og_image_url}
                  onChange={(e) => set('og_image_url', e.target.value)}
                  className="mt-1 text-sm"
                />
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={f.no_index}
                onChange={(e) => set('no_index', e.target.checked)}
              />
              امنع جوجل من فهرسة المقال ده
            </label>
          </div>
        )}

        {tab === 'geo' && (
          <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-4 sm:p-5">
            <div className="p-3 rounded-lg bg-brand-500/5 border border-brand-500/20 text-xs leading-relaxed">
              الحاجات دي بتخلي ChatGPT و Perplexity و AI Overviews **يقتبسوا** المقال
              ويذكروا فاهم. ترتيبك في جوجل حاجة، واقتباس الـ AI ليك حاجة تانية.
            </div>

            <div>
              <Label htmlFor="b-tldr">الخلاصة (إجابة مباشرة)</Label>
              <textarea
                id="b-tldr"
                value={f.tldr}
                onChange={(e) => set('tldr', e.target.value)}
                rows={4}
                className="mt-1 w-full rounded-lg border border-gray-200 p-3 text-sm leading-relaxed"
                placeholder="جاوب على سؤال المقال في ٢-٤ جمل. ده اللي المساعد الذكي هيقتبسه."
              />
            </div>

            <div>
              <Label htmlFor="b-faq">أسئلة شائعة</Label>
              <p className="text-xs text-gray-500 mt-1 mb-2 leading-relaxed">
                السؤال في سطر، الإجابة في السطر اللي بعده، وسيب سطر فاضي بين كل
                سؤال والتاني. بتظهر في المقال وكمان كـ FAQ في جوجل.
              </p>
              <textarea
                id="b-faq"
                value={f.faq}
                onChange={(e) => set('faq', e.target.value)}
                rows={10}
                className="w-full rounded-lg border border-gray-200 p-3 text-sm leading-relaxed"
                placeholder={'ايه هو n8n؟\nأداة أتمتة مفتوحة المصدر بتربط تطبيقاتك ببعض من غير كود.\n\nn8n مجاني؟\nفيه نسخة مجانية بتشغّلها على سيرفرك.'}
              />
            </div>
          </div>
        )}
      </div>

      {/* ---------- sidebar ---------- */}
      <aside className="space-y-4 min-w-0">
        <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
          <div>
            <Label htmlFor="b-status">الحالة</Label>
            <select
              id="b-status"
              value={f.status}
              onChange={(e) => set('status', e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-200 p-2.5 text-sm bg-white"
            >
              <option value="draft">مسودة</option>
              <option value="published">منشور</option>
            </select>
          </div>
          <Button type="submit" className="w-full">
            حفظ
          </Button>
          {post.id && f.status === 'published' ? (
            <a
              href={`/blog/${f.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-center text-sm text-brand-600 hover:underline"
            >
              افتح المقال ↗
            </a>
          ) : null}
        </div>

        <ScorePanel title="🔍 السيو" score={analysis.seoScore} checks={analysis.seo} />
        <ScorePanel title="🤖 الاقتباس بالذكاء الاصطناعي" score={analysis.geoScore} checks={analysis.geo} />
      </aside>
    </form>
  );
}

function ToolBtn({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:border-brand-500/40 hover:text-brand-600 transition-colors flex-shrink-0"
    >
      {children}
    </button>
  );
}

function Counter({ value, min, max }: { value: number; min: number; max: number }) {
  const tone =
    value === 0 ? 'text-gray-400' : value < min || value > max ? 'text-amber-600' : 'text-emerald-600';
  return (
    <p className={`text-xs mt-1 ${tone}`}>
      {value} حرف · الأفضل {min}–{max}
    </p>
  );
}

function ScorePanel({ title, score, checks }: { title: string; score: number; checks: SeoCheck[] }) {
  const tone =
    score >= 80 ? 'bg-emerald-500' : score >= 50 ? 'bg-amber-500' : 'bg-destructive';

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="font-bold text-sm">{title}</span>
        <span className="font-display text-2xl font-extrabold">{score}</span>
      </div>
      <div className="h-2 rounded-full bg-gray-100 overflow-hidden mb-4">
        <div className={`h-full ${tone} rounded-full transition-all`} style={{ width: `${score}%` }} />
      </div>
      <ul className="space-y-2">
        {checks.map((c) => (
          <li key={c.id} className="text-xs leading-relaxed flex gap-2">
            <span className="flex-shrink-0">
              {c.status === 'good' ? '🟢' : c.status === 'warn' ? '🟠' : '🔴'}
            </span>
            <span className="min-w-0">
              <span className={c.status === 'good' ? 'text-gray-600' : 'text-gray-900 font-medium'}>
                {c.label}
              </span>
              {c.hint ? <span className="block text-gray-500 mt-0.5">{c.hint}</span> : null}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
