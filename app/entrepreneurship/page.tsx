import { loadCatalog } from '@/lib/career/catalog.server';
import { EntrepreneurshipFlow } from './entrepreneurship-flow';

export const metadata = {
  title: 'جاهز تكسب من الـ AI؟ — تيست ريادة الأعمال | فاهم',
  description:
    'تيست عملي يقيس جاهزيتك للشغل الحر والبيزنس من 0 لـ 100، يحدّد أكبر فجوة عندك، ويرشح أقرب كورس يبني بها مسارك في الـ AI.',
  alternates: { canonical: '/entrepreneurship' },
  openGraph: {
    title: 'جاهز تكسب من الـ AI؟ — تيست ريادة الأعمال',
    description: '5 أبعاد · 15 سؤال · 4 دقايق · مجاناً.',
    type: 'website',
  },
};

export const dynamic = 'force-dynamic';

export default async function EntrepreneurshipPage() {
  const catalog = await loadCatalog();
  return <EntrepreneurshipFlow catalog={catalog} />;
}
