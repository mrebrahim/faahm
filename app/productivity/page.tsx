import { loadCatalog } from '@/lib/career/catalog.server';
import { ProductivityFlow } from './productivity-flow';

export const metadata = {
  title: 'ليه بتأجّل؟ — تيست الإنتاجية | فاهم',
  description:
    'تيست خفيف يحدد السبب الرئيسي اللي بيوقّفك من الإنجاز — Overwhelm / Perfectionism / Distraction / وضوح الهدف — ويدّيك خطة فيها أول حركة تبدأ بيها في 10 دقايق.',
  alternates: { canonical: '/productivity' },
  openGraph: {
    title: 'ليه بتأجّل؟ — تيست الإنتاجية',
    description: '14 سؤال يحددوا اللي بيوقّفك. مجاناً.',
    type: 'website',
  },
};

export const dynamic = 'force-dynamic';

export default async function ProductivityPage() {
  const catalog = await loadCatalog();
  return <ProductivityFlow catalog={catalog} />;
}
