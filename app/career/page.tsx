import { loadCatalog } from '@/lib/career/matching';
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

// Server-render with revalidate so the catalog refreshes hourly without
// hitting Supabase on every visit.
export const revalidate = 3600;

export default async function CareerPage() {
  const catalog = await loadCatalog();
  return <CareerFlow catalog={catalog} />;
}
