'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createServiceClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/admin-guard';
import { loggedAction } from '@/lib/admin-audit';
import { computeReadingTime } from '@/lib/blog';
import { slugify } from '@/lib/seo-score';
import { uploadToBunny } from '@/lib/bunny-storage';

/**
 * Blog authoring. Admin only.
 *
 * Everything a post needs — content, SEO fields, GEO fields — is saved
 * in one submit. Splitting it into tabs that save separately is how you
 * end up with a published article whose meta description was never
 * written.
 */

function parseFaq(raw: string): Array<{ q: string; a: string }> {
  // Editor format: one Q/A pair per block, question and answer on
  // consecutive lines separated by a blank line. Chosen over a JSON
  // textarea because a missing comma shouldn't lose someone's work.
  return raw
    .split(/\n\s*\n/)
    .map((block) => {
      const [q, ...rest] = block.split('\n');
      return { q: (q ?? '').trim(), a: rest.join(' ').trim() };
    })
    .filter((f) => f.q.length > 0 && f.a.length > 0);
}

function parseList(raw: string): string[] {
  return raw
    .split(/[,،\n]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 25);
}

function fields(formData: FormData) {
  const title = String(formData.get('title') || '').trim();
  const content = String(formData.get('content') || '');
  const status = String(formData.get('status') || 'draft');

  return {
    title,
    content,
    slug: String(formData.get('slug') || '').trim() || slugify(title),
    excerpt: String(formData.get('excerpt') || '').trim() || null,
    cover_image_url: String(formData.get('cover_image_url') || '').trim() || null,
    cover_alt: String(formData.get('cover_alt') || '').trim() || null,
    category_id: String(formData.get('category_id') || '') || null,
    tags: parseList(String(formData.get('tags') || '')),
    status: ['draft', 'published', 'scheduled'].includes(status) ? status : 'draft',
    seo_title: String(formData.get('seo_title') || '').trim() || null,
    seo_description: String(formData.get('seo_description') || '').trim() || null,
    focus_keyword: String(formData.get('focus_keyword') || '').trim() || null,
    keywords: parseList(String(formData.get('keywords') || '')),
    canonical_url: String(formData.get('canonical_url') || '').trim() || null,
    og_image_url: String(formData.get('og_image_url') || '').trim() || null,
    no_index: formData.get('no_index') === 'on',
    tldr: String(formData.get('tldr') || '').trim() || null,
    faq: parseFaq(String(formData.get('faq') || '')),
    reading_time_min: computeReadingTime(content),
    updated_at: new Date().toISOString(),
  };
}

export async function createPost(formData: FormData) {
  const ctx = await requireAdmin();
  const data = fields(formData);

  if (data.title.length < 3) {
    redirect(`/admin/blog?error=${encodeURIComponent('اكتب عنوان للمقال.')}`);
  }

  const service = createServiceClient();
  let newId: string | null = null;

  await loggedAction(
    ctx,
    { action: 'blog.create', resourceType: 'blog_post', metadata: { slug: data.slug } },
    async () => {
      const { data: row, error } = await service
        .from('blog_posts')
        .insert({
          ...data,
          author_id: ctx.userId,
          published_at: data.status === 'published' ? new Date().toISOString() : null,
        })
        .select('id')
        .single();

      if (error) {
        // 23505 = the slug is taken. Say so plainly instead of showing a
        // Postgres constraint name.
        throw new Error(
          error.code === '23505' ? 'الرابط ده مستخدم في مقال تاني.' : error.message
        );
      }
      newId = row.id;
    }
  ).catch((err: Error) => {
    redirect(`/admin/blog?error=${encodeURIComponent(err.message)}`);
  });

  revalidatePath('/admin/blog');
  revalidatePath('/blog');
  redirect(`/admin/blog/${newId}?success=1`);
}

export async function updatePost(formData: FormData) {
  const ctx = await requireAdmin();
  const id = String(formData.get('id') || '');
  if (!id) redirect('/admin/blog');

  const data = fields(formData);
  const service = createServiceClient();

  await loggedAction(
    ctx,
    { action: 'blog.update', resourceType: 'blog_post', resourceId: id },
    async () => {
      const { data: current } = await service
        .from('blog_posts')
        .select('published_at, status')
        .eq('id', id)
        .maybeSingle();

      // Set published_at on the FIRST publish only — overwriting it on
      // every edit would reset the article's age, and age is a ranking
      // signal.
      const published_at =
        data.status === 'published'
          ? current?.published_at ?? new Date().toISOString()
          : current?.published_at ?? null;

      const { error } = await service
        .from('blog_posts')
        .update({ ...data, published_at })
        .eq('id', id);

      if (error) {
        throw new Error(
          error.code === '23505' ? 'الرابط ده مستخدم في مقال تاني.' : error.message
        );
      }
    }
  ).catch((err: Error) => {
    redirect(`/admin/blog/${id}?error=${encodeURIComponent(err.message)}`);
  });

  revalidatePath('/admin/blog');
  revalidatePath('/blog');
  revalidatePath(`/blog/${data.slug}`);
  redirect(`/admin/blog/${id}?success=1`);
}

export async function deletePost(formData: FormData) {
  const ctx = await requireAdmin();
  const id = String(formData.get('id') || '');
  if (!id) return;

  await loggedAction(
    ctx,
    { action: 'blog.delete', resourceType: 'blog_post', resourceId: id },
    async () => {
      await createServiceClient().from('blog_posts').delete().eq('id', id);
    }
  );

  revalidatePath('/admin/blog');
  revalidatePath('/blog');
  redirect('/admin/blog');
}

/**
 * Upload an image to Bunny and hand back the public URL for pasting
 * into the body. Kept here rather than in a client uploader so the
 * storage key never reaches the browser.
 */
export async function uploadBlogImage(formData: FormData) {
  const ctx = await requireAdmin();
  const file = formData.get('file') as File | null;
  const postId = String(formData.get('post_id') || '');

  if (!file || file.size === 0) {
    redirect(`/admin/blog/${postId}?error=${encodeURIComponent('اختار صورة الأول.')}`);
  }

  if (file.size > 8 * 1024 * 1024) {
    redirect(
      `/admin/blog/${postId}?error=${encodeURIComponent('الصورة أكبر من 8 ميجا — صغّرها الأول.')}`
    );
  }

  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
  // Timestamped ASCII path: Bunny serves Arabic filenames fine, but the
  // percent-encoded URLs they produce are painful to paste into markdown
  // and were breaking image loads in the mobile app.
  const path = `blog/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  let url = '';
  await loggedAction(
    ctx,
    { action: 'blog.upload_image', resourceType: 'blog_post', resourceId: postId || null },
    async () => {
      const result = await uploadToBunny({
        objectPath: path,
        bytes: Buffer.from(await file.arrayBuffer()),
        contentType: file.type || 'image/jpeg',
      });
      url = result.publicUrl;
    }
  ).catch(() => {
    redirect(`/admin/blog/${postId}?error=${encodeURIComponent('فشل رفع الصورة.')}`);
  });

  revalidatePath(`/admin/blog/${postId}`);
  redirect(`/admin/blog/${postId}?uploaded=${encodeURIComponent(url)}`);
}
