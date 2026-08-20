import Link from 'next/link';
import Image from 'next/image';
import { SiteNav } from '@/components/site-nav';
import { APP_NAME, CANONICAL_URL } from '@/lib/constants';
import { listCategories, listPublished } from '@/lib/blog';
import { BookOpen, Clock, Search } from 'lucide-react';

export const metadata = {
  title: `المدونة — ${APP_NAME}`,
  description:
    'مقالات وشروحات عن الذكاء الاصطناعي والأتمتة و n8n بالعربي — من فريق فاهم.',
  alternates: { canonical: `${CANONICAL_URL}/blog` },
  openGraph: {
    title: `المدونة — ${APP_NAME}`,
    description: 'مقالات وشروحات عن الذكاء الاصطناعي والأتمتة بالعربي.',
    url: `${CANONICAL_URL}/blog`,
    type: 'website',
  },
};

// Dynamic because the shared header reflects the signed-in state.
export const dynamic = 'force-dynamic';

export default async function BlogIndex({
  searchParams,
}: {
  searchParams: { category?: string; q?: string; tag?: string };
}) {
  const [posts, categories] = await Promise.all([
    listPublished({
      categorySlug: searchParams.category ?? null,
      search: searchParams.q ?? null,
      tag: searchParams.tag ?? null,
      limit: 30,
    }),
    listCategories(),
  ]);

  const filtered = Boolean(searchParams.q || searchParams.category || searchParams.tag);
  const [featured, ...rest] = posts;

  return (
    <div className="min-h-screen bg-gray-50">
      <SiteNav />

      <main className="container mx-auto px-4 py-8 sm:py-12 max-w-6xl">
        <header className="mb-8">
          <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-extrabold mb-3">
            مدونة <span className="text-gradient-brand">فاهم</span>
          </h1>
          <p className="text-gray-600 leading-relaxed max-w-2xl">
            شروحات ومقالات عن الذكاء الاصطناعي والأتمتة و n8n — بالعربي، وبخطوات
            تقدر تطبّقها النهاردة.
          </p>
        </header>

        <form className="mb-6">
          {searchParams.category && (
            <input type="hidden" name="category" value={searchParams.category} />
          )}
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
            <input
              type="search"
              name="q"
              defaultValue={searchParams.q || ''}
              placeholder="ابحث في المدونة…"
              className="w-full h-12 pr-11 pl-4 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
        </form>

        <div className="-mx-4 px-4 overflow-x-auto md:mx-0 md:px-0 mb-8">
          <div className="flex gap-2 w-max md:w-auto md:flex-wrap">
            <Chip label="الكل" href="/blog" active={!searchParams.category} />
            {categories.map((c) => (
              <Chip
                key={c.id}
                label={c.name_ar}
                href={`/blog?category=${c.slug}`}
                active={searchParams.category === c.slug}
              />
            ))}
          </div>
        </div>

        {posts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-12 text-center">
            <BookOpen className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <h2 className="font-bold text-lg mb-1">مفيش مقالات هنا لسه</h2>
            <p className="text-sm text-gray-500">تعالى بصّ تاني قريب.</p>
          </div>
        ) : (
          <>
            {featured && !filtered && (
              <Link
                href={`/blog/${featured.slug}`}
                className="group block rounded-2xl overflow-hidden border border-gray-200 bg-white hover:shadow-lg transition-shadow mb-8"
              >
                {/* Image first on mobile — the visual hook goes above the
                    text on a phone, per the house layout rule. */}
                <div className="grid grid-cols-1 lg:grid-cols-2">
                  <div className="relative aspect-video lg:aspect-auto lg:min-h-[320px] bg-gray-100 order-1 lg:order-2">
                    {featured.cover_image_url && (
                      <Image
                        src={featured.cover_image_url}
                        alt={featured.cover_alt || featured.title}
                        fill
                        sizes="(max-width: 1024px) 100vw, 50vw"
                        className="object-cover"
                        priority
                      />
                    )}
                  </div>
                  <div className="p-6 sm:p-8 flex flex-col justify-center order-2 lg:order-1 min-w-0">
                    <span className="text-xs font-bold text-brand-600 mb-2">✨ الأحدث</span>
                    <h2 className="font-display text-2xl sm:text-3xl font-extrabold leading-snug group-hover:text-brand-600 transition-colors break-words">
                      {featured.title}
                    </h2>
                    {featured.excerpt && (
                      <p className="text-gray-600 mt-3 leading-relaxed line-clamp-3">
                        {featured.excerpt}
                      </p>
                    )}
                    <Meta post={featured} />
                  </div>
                </div>
              </Link>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {(filtered ? posts : rest).map((p) => (
                <Link
                  key={p.id}
                  href={`/blog/${p.slug}`}
                  className="group flex flex-col rounded-2xl overflow-hidden border border-gray-200 bg-white hover:shadow-md transition-shadow"
                >
                  <div className="relative aspect-video bg-gray-100">
                    {p.cover_image_url && (
                      <Image
                        src={p.cover_image_url}
                        alt={p.cover_alt || p.title}
                        fill
                        sizes="(max-width: 768px) 100vw, 33vw"
                        className="object-cover"
                      />
                    )}
                  </div>
                  <div className="p-4 flex-1 flex flex-col min-w-0">
                    <h3 className="font-bold leading-snug line-clamp-2 group-hover:text-brand-600 transition-colors break-words">
                      {p.title}
                    </h3>
                    {p.excerpt && (
                      <p className="text-sm text-gray-600 mt-2 line-clamp-2 leading-relaxed">
                        {p.excerpt}
                      </p>
                    )}
                    <Meta post={p} />
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function Meta({
  post,
}: {
  post: { published_at: string | null; reading_time_min: number | null };
}) {
  return (
    <div className="flex items-center gap-3 text-xs text-gray-500 mt-4 flex-wrap">
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
          <Clock className="w-3 h-3" /> {post.reading_time_min} دقيقة قراءة
        </span>
      ) : null}
    </div>
  );
}

function Chip({ label, href, active }: { label: string; href: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={`flex-shrink-0 whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
        active
          ? 'bg-brand-500 text-white border-brand-500'
          : 'bg-white text-gray-600 border-gray-200 hover:border-brand-500/40'
      }`}
    >
      {label}
    </Link>
  );
}
