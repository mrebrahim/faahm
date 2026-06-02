import { loadCatalog } from '@/lib/career/catalog.server';
import { EqFlow } from './eq-flow';

export const metadata = {
  title: 'ذكاءك العاطفي EQ — تيست خفيف | فاهم',
  description:
    'تيست self-report خفيف لمستوى الذكاء العاطفي على 4 محاور (الوعي بالذات / ضبط النفس / التعاطف / المهارات الاجتماعية). 16 سؤال، 4 دقايق، مجاناً.',
  alternates: { canonical: '/eq' },
  openGraph: {
    title: 'ذكاءك العاطفي EQ — تيست خفيف',
    description: '16 سؤال · 4 محاور · نتيجة فورية.',
    type: 'website',
  },
};

export const dynamic = 'force-dynamic';

export default async function EqPage() {
  const catalog = await loadCatalog();
  return <EqFlow catalog={catalog} />;
}
