import { loadCatalog } from '@/lib/career/catalog.server';
import { CareerFlow } from './career-flow';

export const metadata = {
  title: 'اكتشف شغفك المهني في 3 دقايق — فاهم',
  description:
    'تيست عربي مبني على معايير Holland Codes العالمية يحدّد نوع شخصيتك المهنية والمسار اللي يناسبك في عالم الذكاء الاصطناعي والأتمتة.',
  alternates: { canonical: '/career' },
  openGraph: {
    title: 'اكتشف شغفك المهني في 3 دقايق',
    description: 'تيست مهني مجاني يحدّد المسار اللي يناسبك في الـ AI والأتمتة.',
    type: 'website',
  },
};

// Server-render dynamically so build environments without Supabase
// env vars don't fail to prerender. Coolify production has the keys,
// but keeping this dynamic also lets the catalog reflect admin edits
// instantly without waiting for ISR to expire.
export const dynamic = 'force-dynamic';

export default async function CareerPage() {
  const catalog = await loadCatalog();
  return <CareerFlow catalog={catalog} />;
}
