import { loadCatalog } from '@/lib/career/catalog.server';
import { AIReadinessFlow } from './ai-readiness-flow';

export const metadata = {
  title: 'هل الـ AI هياخد شغلك؟ — اختبار الجاهزية | فاهم',
  description:
    'اختبار سريع يقيس جاهزيتك للـ AI من 0 لـ 100 ويقولك بصراحة وضعك دلوقتي وإيه أحسن خطوة تعملها. 15 سؤال، 3 دقايق، مجاناً.',
  alternates: { canonical: '/ai-readiness' },
  openGraph: {
    title: 'هل الـ AI هياخد شغلك؟',
    description: 'اختبار جاهزية AI من فاهم — 15 سؤال، 3 دقايق.',
    type: 'website',
  },
};

export const dynamic = 'force-dynamic';

export default async function AIReadinessPage() {
  const catalog = await loadCatalog();
  return <AIReadinessFlow catalog={catalog} />;
}
