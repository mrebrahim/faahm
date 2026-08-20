import { createServiceClient } from '@/lib/supabase/server';
import { readingTimeMin } from '@/lib/seo-score';

/**
 * Blog data layer.
 *
 * Posts are Markdown plus two shortcodes for video. Everything is
 * rendered server-side into HTML at request time — no client-side
 * markdown library, because the audience pays for every kilobyte and a
 * blog page has no interactivity that needs one.
 */

export type BlogPost = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  content: string;
  cover_image_url: string | null;
  cover_alt: string | null;
  status: 'draft' | 'published' | 'scheduled';
  published_at: string | null;
  author_id: string | null;
  category_id: string | null;
  tags: string[];
  seo_title: string | null;
  seo_description: string | null;
  focus_keyword: string | null;
  keywords: string[];
  canonical_url: string | null;
  og_image_url: string | null;
  no_index: boolean;
  tldr: string | null;
  faq: Array<{ q: string; a: string }>;
  reading_time_min: number | null;
  view_count: number;
  created_at: string;
  updated_at: string;
};

export type BlogCategory = {
  id: string;
  slug: string;
  name_ar: string;
  description: string | null;
};

export async function listCategories(): Promise<BlogCategory[]> {
  const { data } = await createServiceClient()
    .from('blog_categories')
    .select('id, slug, name_ar, description')
    .order('sort_order');
  return (data ?? []) as BlogCategory[];
}

export async function listPublished(opts: {
  limit?: number;
  categorySlug?: string | null;
  tag?: string | null;
  search?: string | null;
} = {}): Promise<BlogPost[]> {
  const service = createServiceClient();

  let query = service
    .from('blog_posts')
    .select('*')
    .eq('status', 'published')
    .lte('published_at', new Date().toISOString());

  if (opts.categorySlug) {
    const { data: cat } = await service
      .from('blog_categories')
      .select('id')
      .eq('slug', opts.categorySlug)
      .maybeSingle();
    // An unknown category must return nothing, not everything — the
    // silent-fallback version of this bug shows the full archive under a
    // bogus URL and duplicates the index for search engines.
    if (!cat) return [];
    query = query.eq('category_id', cat.id);
  }

  if (opts.tag) query = query.contains('tags', [opts.tag]);
  if (opts.search) {
    const q = opts.search.trim().replace(/[%_]/g, '');
    if (q) query = query.or(`title.ilike.%${q}%,excerpt.ilike.%${q}%`);
  }

  const { data } = await query
    .order('published_at', { ascending: false })
    .limit(opts.limit ?? 24);

  return (data ?? []) as BlogPost[];
}

export async function getPostBySlug(slug: string, opts: { preview?: boolean } = {}) {
  const service = createServiceClient();
  let query = service.from('blog_posts').select('*').eq('slug', slug);

  // Preview is for the admin editor; the public route never passes it.
  if (!opts.preview) {
    query = query.eq('status', 'published').lte('published_at', new Date().toISOString());
  }

  const { data } = await query.maybeSingle();
  return (data as BlogPost | null) ?? null;
}

/** Fire-and-forget view counter. Never blocks the render. */
export async function bumpViewCount(id: string): Promise<void> {
  try {
    await createServiceClient().rpc('blog_bump_view', { p_id: id });
  } catch {
    // A missed view is not worth an error page.
  }
}

export async function relatedPosts(post: BlogPost, limit = 3): Promise<BlogPost[]> {
  const service = createServiceClient();

  // Same category first; fall back to recency so the section is never
  // empty on a young blog.
  const { data: sameCat } = await service
    .from('blog_posts')
    .select('*')
    .eq('status', 'published')
    .lte('published_at', new Date().toISOString())
    .eq('category_id', post.category_id)
    .neq('id', post.id)
    .order('published_at', { ascending: false })
    .limit(limit);

  if ((sameCat?.length ?? 0) >= limit) return sameCat as BlogPost[];

  const { data: recent } = await service
    .from('blog_posts')
    .select('*')
    .eq('status', 'published')
    .lte('published_at', new Date().toISOString())
    .neq('id', post.id)
    .order('published_at', { ascending: false })
    .limit(limit);

  const merged = [...(sameCat ?? []), ...(recent ?? [])];
  const seen = new Set<string>();
  return merged
    .filter((p) => (seen.has(p.id) ? false : (seen.add(p.id), true)))
    .slice(0, limit) as BlogPost[];
}

// ---------------------------------------------------------------
// Markdown → HTML
// ---------------------------------------------------------------

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Only allow URLs we're willing to put in an href/src. Blocks
 * `javascript:` and `data:` — the post body is admin-authored, but an
 * admin account is exactly what an attacker would target, and stored
 * XSS on a public page is the worst kind.
 */
function safeUrl(url: string): string | null {
  const trimmed = url.trim();
  if (/^(https?:)?\/\//i.test(trimmed) || trimmed.startsWith('/') || trimmed.startsWith('#')) {
    return trimmed;
  }
  return null;
}

function inline(md: string): string {
  let out = escapeHtml(md);

  // Images first, so their alt text isn't mangled by the link rule.
  out = out.replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+&quot;([^&]*)&quot;)?\)/g, (_m, alt, src, title) => {
    const url = safeUrl(src);
    if (!url) return '';
    return `<figure class="my-6"><img src="${url}" alt="${alt}" loading="lazy" class="w-full rounded-xl" />${
      title ? `<figcaption class="text-xs text-gray-500 mt-2 text-center">${title}</figcaption>` : ''
    }</figure>`;
  });

  out = out.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_m, label, href) => {
    const url = safeUrl(href);
    if (!url) return label;
    // External links open in a new tab and disown the referrer.
    const external = /^https?:\/\//i.test(url) && !url.includes('faahm.com');
    return `<a href="${url}" class="text-brand-600 underline hover:no-underline"${
      external ? ' target="_blank" rel="noopener noreferrer"' : ''
    }>${label}</a>`;
  });

  out = out
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>')
    .replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 rounded bg-gray-100 text-sm">$1</code>');

  return out;
}

/**
 * Render a post body to HTML.
 *
 * Supported: headings, paragraphs, lists, blockquotes, fenced code,
 * horizontal rules, links, bold/italic/inline code, images, and the two
 * video shortcodes:
 *
 *   [youtube:VIDEO_ID]
 *   [bunny:LIBRARY_ID/VIDEO_GUID]
 *
 * Both render as click-to-load facades rather than live iframes — a
 * page with three embedded players otherwise pulls megabytes before the
 * reader has scrolled to any of them, and this audience is on 3G.
 */
export function renderMarkdown(md: string): string {
  const lines = (md ?? '').replace(/\r\n/g, '\n').split('\n');
  const html: string[] = [];

  let inCode = false;
  let codeBuffer: string[] = [];
  let listType: 'ul' | 'ol' | null = null;

  const closeList = () => {
    if (listType) {
      html.push(`</${listType}>`);
      listType = null;
    }
  };

  for (const raw of lines) {
    const line = raw.trimEnd();

    if (line.startsWith('```')) {
      if (inCode) {
        html.push(
          `<pre class="my-6 p-4 rounded-xl bg-gray-900 text-gray-100 overflow-x-auto text-sm" dir="ltr"><code>${escapeHtml(
            codeBuffer.join('\n')
          )}</code></pre>`
        );
        codeBuffer = [];
        inCode = false;
      } else {
        closeList();
        inCode = true;
      }
      continue;
    }
    if (inCode) {
      codeBuffer.push(raw);
      continue;
    }

    // Video shortcodes — must be checked before the paragraph fallback.
    const yt = line.match(/^\[youtube:([A-Za-z0-9_-]{6,20})\]$/);
    if (yt) {
      closeList();
      html.push(youtubeFacade(yt[1]));
      continue;
    }

    const bunny = line.match(/^\[bunny:(\d+)\/([A-Za-z0-9-]+)\]$/);
    if (bunny) {
      closeList();
      html.push(bunnyFacade(bunny[1], bunny[2]));
      continue;
    }

    if (!line.trim()) {
      closeList();
      continue;
    }

    const heading = line.match(/^(#{1,4})\s+(.*)$/);
    if (heading) {
      closeList();
      const level = Math.min(heading[1].length + 1, 5); // h1 is the page title
      const sizes: Record<number, string> = {
        2: 'text-2xl sm:text-3xl font-extrabold mt-10 mb-4',
        3: 'text-xl sm:text-2xl font-bold mt-8 mb-3',
        4: 'text-lg font-bold mt-6 mb-2',
        5: 'text-base font-bold mt-4 mb-2',
      };
      html.push(`<h${level} class="${sizes[level] ?? ''}">${inline(heading[2])}</h${level}>`);
      continue;
    }

    if (/^(-{3,}|\*{3,})$/.test(line.trim())) {
      closeList();
      html.push('<hr class="my-8 border-gray-200" />');
      continue;
    }

    if (line.startsWith('> ')) {
      closeList();
      html.push(
        `<blockquote class="my-6 border-s-4 border-brand-500 ps-4 text-gray-700 italic">${inline(
          line.slice(2)
        )}</blockquote>`
      );
      continue;
    }

    const ul = line.match(/^[-*]\s+(.*)$/);
    const ol = line.match(/^\d+\.\s+(.*)$/);
    if (ul || ol) {
      const want: 'ul' | 'ol' = ul ? 'ul' : 'ol';
      if (listType !== want) {
        closeList();
        html.push(
          `<${want} class="my-4 space-y-2 ${want === 'ul' ? 'list-disc' : 'list-decimal'} ps-6">`
        );
        listType = want;
      }
      html.push(`<li>${inline((ul ?? ol)![1])}</li>`);
      continue;
    }

    closeList();
    html.push(`<p class="my-4 leading-[1.9] text-gray-700">${inline(line)}</p>`);
  }

  closeList();
  if (inCode && codeBuffer.length) {
    html.push(
      `<pre class="my-6 p-4 rounded-xl bg-gray-900 text-gray-100 overflow-x-auto text-sm" dir="ltr"><code>${escapeHtml(
        codeBuffer.join('\n')
      )}</code></pre>`
    );
  }

  return html.join('\n');
}

/**
 * Click-to-load facades. Rendered as plain markup with a tiny inline
 * handler so the whole blog page stays a Server Component — a React
 * client component for something tapped once per visit isn't worth the
 * hydration cost on a mid-range phone.
 */
function youtubeFacade(id: string): string {
  const thumb = `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
  const src = `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&modestbranding=1`;
  return facade(thumb, src, 'شغّل الفيديو');
}

function bunnyFacade(library: string, guid: string): string {
  const thumb = `https://vz-${library}.b-cdn.net/${guid}/thumbnail.jpg`;
  const src = `https://iframe.mediadelivery.net/embed/${library}/${guid}?autoplay=true&preload=true`;
  return facade(thumb, src, 'شغّل الفيديو');
}

function facade(thumbUrl: string, embedUrl: string, label: string): string {
  // The onclick swaps the placeholder for the real iframe. Attribute
  // values are single-quoted inside a double-quoted handler, and both
  // URLs are generated from a matched [A-Za-z0-9_-] id, so there's
  // nothing user-controlled to escape here.
  return `<div class="my-8 relative rounded-xl overflow-hidden bg-gray-900 aspect-video">
  <button type="button" class="absolute inset-0 w-full h-full group" aria-label="${label}"
    onclick="this.parentNode.innerHTML='&lt;iframe src=&quot;${embedUrl}&quot; class=&quot;w-full h-full&quot; frameborder=&quot;0&quot; allow=&quot;autoplay;encrypted-media;picture-in-picture;fullscreen&quot; allowfullscreen&gt;&lt;/iframe&gt;'">
    <img src="${thumbUrl}" alt="" loading="lazy" class="w-full h-full object-cover opacity-80 group-hover:opacity-60 transition-opacity" />
    <span class="absolute inset-0 flex items-center justify-center">
      <span class="w-16 h-16 rounded-full bg-brand-500 flex items-center justify-center text-white text-2xl shadow-lg">▶</span>
    </span>
  </button>
</div>`;
}

/** Keep reading_time_min honest whenever a post is saved. */
export function computeReadingTime(content: string): number {
  return readingTimeMin(content);
}
