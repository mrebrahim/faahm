import { loadCatalog } from '@/lib/career/catalog.server';
import { SelfDiscoveryFlow } from './self-discovery-flow';

export const metadata = {
  title: 'اكتشاف شغفك الداخلي — فاهم',
  description:
    'اختبار اكتشاف الذات: 14 سؤال يكشف اللي بيشدّك من جوّاك، يعطيك بروفايل شغفك (أعلى تيمات)، والكورس اللي تبدأ بيه رحلتك.',
  alternates: { canonical: '/self-discovery' },
  openGraph: {
    title: 'اكتشاف شغفك الداخلي — فاهم',
    description: '14 سؤال يكشف اللي بيشدّك من جوّاك. مجاناً.',
    type: 'website',
  },
};

export const dynamic = 'force-dynamic';

export default async function SelfDiscoveryPage() {
  const catalog = await loadCatalog();
  return <SelfDiscoveryFlow catalog={catalog} />;
}
