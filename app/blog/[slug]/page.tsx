import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { SiteNav } from '@/components/site-nav';
import { APP_NAME, CANONICAL_URL } from '@/lib/constants';
import {
  bumpViewCount,
  getPostBySlug,
  listCategories,
  relatedPosts,
  renderMarkdown,
} from '@/lib/blog';
import { ArrowRight, Clock, Eye, Sparkles } from 'lucide-react';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const post = await getPostBySlug(params.slug);
  if (!post) return { title: `المقال مش موجود — ${APP_NAME}` };

  const url = `${CANONICAL_URL}/blog/${post.slug}`;
  const title = post.seo_title || post.title;
  const description = post.seo_description || post.excerpt || post.tldr || '';
  const image = post.og_image_url || post.cover_image_url || undefined;

  return {
    title: `${title} — ${APP_NAME}`,
    description,
    // The keywords meta carries little weight with Google now, but AI
    // crawlers do read it, and it costs nothing.
    keywords: post.keywords?.length ? post.keywords : undefined,
    alternates: { canonical: post.canonical_url || url },
    robots: post.no_index ? { index: false, follow: true } : undefined,
    openGraph: {
      title,
      description,
      url,
      type: 'article',
      publishedTime: post.published_at ?? undefined,
      modifiedTime: post.updated_at,
      images: image ? [{ url: image }] : undefined,
    },
    twitter: {
      card: image ? 'summary_large_image' : 'summary',
      title,
      description,
      images: image ? [image] : undefined,
    },
  };
}

export default async function BlogPostPage({ params }: { params: { slug: string } }) {
  const post = await getPostBySlug(params.slug);
  if (!post) notFound();

  const [related, categories] = await Promise.all([relatedPosts(post), listCategories()]);
  const category = categories.find((c) => c.id === post.category_id);

  // Fire-and-forget; a failed counter must not delay the article.
  void bumpViewCount(post.id);

  const html = renderMarkdown(post.content);
  const url = `${CANONICAL_URL}/blog/${post.slug}`;

  /**
   * Structured data. Article tells Google what this is; FAQPage is what
   * gets pulled into AI answers and "People also ask" — which is the
   * whole reason the editor nags for FAQ pairs.
   */
  const articleLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.seo_description || post.excerpt || undefined,
    image: post.cover_image_url ? [post.cover_image_url] : undefined,
    datePublished: post.published_at ?? undefined,
    dateModified: post.updated_at,
    inLanguage: 'ar',
    author: { '@type': 'Organization', name: APP_NAME, url: CANONICAL_URL },
    publisher: {
      '@type': 'Organization',
      name: APP_NAME,
      url: CANONICAL_URL,
      logo: { '@type': 'ImageObject', url: `${CANONICAL_URL}/icon.png` },
    },
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    keywords: post.keywords?.join(', ') || undefined,
  };

  const faqLd =
    post.faq?.length > 0
      ? {
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: post.faq.map((f) => ({
            '@type': 'Question',
            name: f.q,
            acceptedAnswer: { '@type': 'Answer', text: f.a },
          })),
        }
      : null;

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'فاهم', item: CANONICAL_URL },
      { '@type': 'ListItem', position: 2, name: 'المدونة', item: `${CANONICAL_URL}/blog` },
      { '@type': 'ListItem', position: 3, name: post.title, item: url },
    ],
  };

  return (
    <div className="min-h-screen bg-white">
      <SiteNav />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleLd) }}
      />
      {faqLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
        />
      )}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />

      <article className="container mx-auto px-4 py-8 sm:py-12 max-w-3xl">
        <nav className="mb-6 text-sm">
          <Link href="/blog" className="inline-flex items-center gap-1 text-brand-600 hover:underline">
            <ArrowRight className="w-4 h-4" />
            المدونة
          </Link>
          {category && (
            <>
              <span className="text-gray-400 mx-2">/</span>
              <Link href={`/blog?category=${category.slug}`} className="text-gray-500 hover:text-brand-600">
                {category.name_ar}
              </Link>
            </>
          )}
        </nav>

        <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-extrabold leading-tight mb-4 break-words">
          {post.title}
        </h1>

        <div className="flex items-center gap-4 text-sm text-gray-500 flex-wrap mb-6">
          {post.published_at && (
            <time dateTime={post.published_at}>
              {new Date(post.published_at).toLocaleDateString('ar-EG', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </time>
          )}
          {post.reading_time_min ? (
            <span className="inline-flex items-center gap-1">
              <Clock className="w-4 h-4" /> {post.reading_time_min} دقيقة قراءة
            </span>
          ) : null}
          {post.view_count > 20 ? (
            <span className="inline-flex items-center gap-1">
              <Eye className="w-4 h-4" /> {post.view_count}
            </span>
          ) : null}
        </div>

        {post.cover_image_url && (
          <div className="relative aspect-video rounded-2xl overflow-hidden bg-gray-100 mb-8">
            <Image
              src={post.cover_image_url}
              alt={post.cover_alt || post.title}
              fill
              sizes="(max-width: 768px) 100vw, 768px"
              className="object-cover"
              priority
            />
          </div>
        )}

        {/* Answer-first summary. Sits above the body because that's what
            an AI assistant reads and quotes. */}
        {post.tldr && (
          <div className="rounded-2xl border border-brand-500/30 bg-brand-500/5 p-4 sm:p-5 mb-8">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-brand-600" />
              <span className="font-bold text-sm">الخلاصة</span>
            </div>
            <p className="text-sm sm:text-base leading-relaxed text-gray-700">{post.tldr}</p>
          </div>
        )}

        <div
          className="blog-body text-base sm:text-lg"
          dangerouslySetInnerHTML={{ __html: html }}
        />

        {post.faq?.length > 0 && (
          <section className="mt-12">
            <h2 className="font-display text-2xl font-extrabold mb-4">أسئلة شائعة</h2>
            <div className="space-y-3">
              {post.faq.map((f, i) => (
                <details
                  key={i}
                  className="group rounded-xl border border-gray-200 bg-white p-4 open:border-brand-500/30 open:bg-brand-500/5"
                >
                  <summary className="cursor-pointer font-bold list-none flex items-start justify-between gap-3">
                    <span>{f.q}</span>
                    <span className="text-brand-500 text-xl flex-shrink-0 group-open:rotate-45 transition-transform leading-none">
                      +
                    </span>
                  </summary>
                  <p className="mt-3 text-sm text-gray-600 leading-relaxed">{f.a}</p>
                </details>
              ))}
            </div>
          </section>
        )}

        {post.tags?.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap mt-10">
            {post.tags.map((t) => (
              <Link
                key={t}
                href={`/blog?tag=${encodeURIComponent(t)}`}
                className="text-xs px-3 py-1.5 rounded-full bg-gray-100 text-gray-600 hover:bg-brand-500/10 hover:text-brand-700"
              >
                #{t}
              </Link>
            ))}
          </div>
        )}

        <div className="mt-12 rounded-2xl bg-brand-500/5 border border-brand-500/30 p-6 text-center">
          <h2 className="font-display text-xl sm:text-2xl font-extrabold mb-2">
            عايز تتعلّم ده عملي؟
          </h2>
          <p className="text-sm text-gray-600 mb-4 leading-relaxed">
            كورسات فاهم بالعربي — خطوة بخطوة، وبتطبيق حقيقي.
          </p>
          <Link
            href="/courses"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-brand-500 text-white font-bold hover:bg-brand-600 transition-colors"
          >
            شوف الكورسات
          </Link>
        </div>

        {related.length > 0 && (
          <section className="mt-14">
            <h2 className="font-display text-2xl font-extrabold mb-4">اقرأ كمان</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {related.map((r) => (
                <Link
                  key={r.id}
                  href={`/blog/${r.slug}`}
                  className="group rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
                >
                  <div className="relative aspect-video bg-gray-100">
                    {r.cover_image_url && (
                      <Image
                        src={r.cover_image_url}
                        alt={r.cover_alt || r.title}
                        fill
                        sizes="(max-width: 640px) 100vw, 33vw"
                        className="object-cover"
                      />
                    )}
                  </div>
                  <p className="p-3 text-sm font-bold leading-snug line-clamp-2 group-hover:text-brand-600 transition-colors">
                    {r.title}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        )}
      </article>
    </div>
  );
}
