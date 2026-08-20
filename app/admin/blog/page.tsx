import Link from 'next/link';
import { createServiceClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { listCategories } from '@/lib/blog';
import { analysePost } from '@/lib/seo-score';
import { FileText, Plus } from 'lucide-react';
import { BlogEditor } from './editor';
import { createPost } from './actions';

export const metadata = { title: 'المدونة' };
export const dynamic = 'force-dynamic';

export default async function AdminBlogPage({
  searchParams,
}: {
  searchParams: { new?: string; error?: string };
}) {
  const categories = await listCategories();

  if (searchParams.new === '1') {
    return (
      <div className="p-4 sm:p-8 max-w-6xl">
        <Link href="/admin/blog" className="text-sm text-brand-600 hover:underline">
          ← رجوع للمقالات
        </Link>
        <h1 className="font-display text-2xl sm:text-3xl font-bold my-4">مقال جديد</h1>
        {searchParams.error ? (
          <div className="mb-5 p-3 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-sm">
            {searchParams.error}
          </div>
        ) : null}
        <BlogEditor
          categories={categories}
          action={createPost}
          post={{
            title: '', slug: '', excerpt: '', content: '', cover_image_url: '',
            cover_alt: '', category_id: '', tags: '', status: 'draft',
            seo_title: '', seo_description: '', focus_keyword: '', keywords: '',
            canonical_url: '', og_image_url: '', no_index: false, tldr: '', faq: '',
          }}
        />
      </div>
    );
  }

  const { data: posts } = await createServiceClient()
    .from('blog_posts')
    .select(
      'id, slug, title, excerpt, content, status, published_at, view_count, reading_time_min, focus_keyword, seo_description, cover_image_url, cover_alt, tldr, faq, keywords, updated_at'
    )
    .order('updated_at', { ascending: false })
    .limit(100);

  return (
    <div className="p-4 sm:p-8 max-w-5xl">
      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold mb-1">المدونة</h1>
          <p className="text-sm text-gray-500">
            مقالات فاهم — مع تقييم سيو وتقييم اقتباس الذكاء الاصطناعي لكل مقال.
          </p>
        </div>
        <Button asChild className="w-full sm:w-auto">
          <Link href="/admin/blog?new=1">
            <Plus className="w-4 h-4" /> مقال جديد
          </Link>
        </Button>
      </div>

      {searchParams.error ? (
        <div className="mb-5 p-3 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-sm">
          {searchParams.error}
        </div>
      ) : null}

      {(posts ?? []).length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center">
          <FileText className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <p className="font-bold mb-1">مفيش مقالات لسه</p>
          <p className="text-sm text-gray-500 mb-4">
            المدونة أرخص طريقة تجيب بيها زوار من جوجل ومن المساعدات الذكية.
          </p>
          <Button asChild>
            <Link href="/admin/blog?new=1">اكتب أول مقال</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {(posts ?? []).map((p: any) => {
            // Score the saved post so the list shows what needs work
            // without opening each one.
            const a = analysePost({
              title: p.title,
              slug: p.slug,
              excerpt: p.excerpt,
              content: p.content ?? '',
              seoDescription: p.seo_description,
              focusKeyword: p.focus_keyword,
              keywords: p.keywords ?? [],
              coverImageUrl: p.cover_image_url,
              coverAlt: p.cover_alt,
              tldr: p.tldr,
              faq: p.faq ?? [],
            });

            return (
              <Link
                key={p.id}
                href={`/admin/blog/${p.id}`}
                className="block rounded-xl border border-gray-200 bg-white p-4 hover:border-brand-500/40 transition-colors"
              >
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span
                        className={`text-[11px] px-2 py-0.5 rounded-full ${
                          p.status === 'published'
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {p.status === 'published' ? 'منشور' : 'مسودة'}
                      </span>
                      {p.view_count > 0 ? (
                        <span className="text-[11px] text-gray-400">👁 {p.view_count}</span>
                      ) : null}
                      {p.reading_time_min ? (
                        <span className="text-[11px] text-gray-400">
                          {p.reading_time_min} د قراءة
                        </span>
                      ) : null}
                    </div>
                    <p className="font-bold break-words">{p.title}</p>
                    {p.excerpt ? (
                      <p className="text-sm text-gray-600 line-clamp-1 mt-0.5">{p.excerpt}</p>
                    ) : null}
                  </div>

                  <div className="flex gap-2 flex-shrink-0">
                    <ScoreChip label="SEO" score={a.seoScore} />
                    <ScoreChip label="AI" score={a.geoScore} />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ScoreChip({ label, score }: { label: string; score: number }) {
  const tone =
    score >= 80
      ? 'bg-emerald-50 text-emerald-700'
      : score >= 50
        ? 'bg-amber-50 text-amber-700'
        : 'bg-destructive/10 text-destructive';
  return (
    <span className={`text-xs px-2 py-1 rounded-lg font-bold ${tone}`}>
      {label} {score}
    </span>
  );
}
