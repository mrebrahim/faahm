import { loadCatalog } from '@/lib/career/catalog.server';
import { PersonalityFlow } from './personality-flow';

export const metadata = {
  title: 'اكتشف نمط شخصيتك في 5 دقايق — فاهم',
  description:
    'اختبار شخصية مجاني مبني على نموذج 4 المحاور — هيحدد نمطك من 16 نمط، نقط قوتك، والكورس اللي تستمتع بيه.',
  alternates: { canonical: '/personality' },
  openGraph: {
    title: 'اكتشف نمط شخصيتك — فاهم',
    description: 'تيست شخصية مجاني — هيحدد نمطك من 16 نمط في 5 دقايق.',
    type: 'website',
  },
};

export const dynamic = 'force-dynamic';

export default async function PersonalityPage() {
  const catalog = await loadCatalog();
  return <PersonalityFlow catalog={catalog} />;
}
