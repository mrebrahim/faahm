import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createServiceClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { listCategories } from '@/lib/blog';
import { Trash2 } from 'lucide-react';
import { BlogEditor } from '../editor';
import { deletePost, updatePost, uploadBlogImage } from '../actions';

export const metadata = { title: 'تعديل مقال' };
export const dynamic = 'force-dynamic';

export default async function EditBlogPost({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { error?: string; success?: string; uploaded?: string };
}) {
  const [{ data: post }, categories] = await Promise.all([
    createServiceClient().from('blog_posts').select('*').eq('id', params.id).maybeSingle(),
    listCategories(),
  ]);

  if (!post) notFound();

  // The editor works in plain strings; the FAQ round-trips through the
  // same blank-line format the author typed.
  const faqText = (post.faq ?? [])
    .map((f: { q: string; a: string }) => `${f.q}\n${f.a}`)
    .join('\n\n');

  return (
    <div className="p-4 sm:p-8 max-w-6xl">
      <Link href="/admin/blog" className="text-sm text-brand-600 hover:underline">
        ← رجوع للمقالات
      </Link>

      <div className="flex items-start justify-between gap-4 flex-wrap my-4">
        <h1 className="font-display text-2xl sm:text-3xl font-bold break-words min-w-0">
          {post.title}
        </h1>
        <form action={deletePost} className="flex-shrink-0">
          <input type="hidden" name="id" value={post.id} />
          <Button type="submit" size="sm" variant="ghost" className="text-destructive">
            <Trash2 className="w-4 h-4" /> حذف
          </Button>
        </form>
      </div>

      {searchParams.error ? (
        <div className="mb-5 p-3 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-sm">
          {searchParams.error}
        </div>
      ) : null}
      {searchParams.success ? (
        <div className="mb-5 p-3 rounded-xl bg-brand-500/10 border border-brand-500/30 text-brand-700 text-sm">
          اتحفظ ✅
        </div>
      ) : null}

      {/* Separate form: an upload has to submit on its own, otherwise it
          would carry (and overwrite) the whole draft. */}
      <form
        action={uploadBlogImage}
        encType="multipart/form-data"
        className="mb-6 rounded-xl border border-gray-200 bg-white p-4 flex flex-col sm:flex-row gap-3 sm:items-center"
      >
        <input type="hidden" name="post_id" value={post.id} />
        <label className="text-sm font-bold flex-shrink-0">🖼 ارفع صورة على Bunny</label>
        <input
          type="file"
          name="file"
          accept="image/*"
          required
          className="text-sm min-w-0 flex-1"
        />
        <Button type="submit" size="sm" variant="outline" className="w-full sm:w-auto">
          ارفع
        </Button>
      </form>

      <BlogEditor
        categories={categories}
        action={updatePost}
        uploadedUrl={searchParams.uploaded}
        post={{
          id: post.id,
          title: post.title ?? '',
          slug: post.slug ?? '',
          excerpt: post.excerpt ?? '',
          content: post.content ?? '',
          cover_image_url: post.cover_image_url ?? '',
          cover_alt: post.cover_alt ?? '',
          category_id: post.category_id ?? '',
          tags: (post.tags ?? []).join(', '),
          status: post.status ?? 'draft',
          seo_title: post.seo_title ?? '',
          seo_description: post.seo_description ?? '',
          focus_keyword: post.focus_keyword ?? '',
          keywords: (post.keywords ?? []).join(', '),
          canonical_url: post.canonical_url ?? '',
          og_image_url: post.og_image_url ?? '',
          no_index: post.no_index ?? false,
          tldr: post.tldr ?? '',
          faq: faqText,
        }}
      />
    </div>
  );
}
