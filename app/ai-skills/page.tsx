import { loadCatalog } from '@/lib/career/catalog.server';
import { AISkillsFlow } from './ai-skills-flow';

export const metadata = {
  title: 'إنت فين على سلّم الـ AI؟ — تيست المهارات | فاهم',
  description:
    'تيست تشخيصي يحدد مستواك الفعلي في الـ AI من 4 مستويات، ويقولك بالظبط الكورس اللي تبدأ بيه عشان تطلع للمستوى اللي بعده.',
  alternates: { canonical: '/ai-skills' },
  openGraph: {
    title: 'إنت فين على سلّم الـ AI؟',
    description: 'تيست مستوى مهاراتك في الـ AI — 15 سؤال، 4 مستويات.',
    type: 'website',
  },
};

export const dynamic = 'force-dynamic';

export default async function AISkillsPage() {
  const catalog = await loadCatalog();
  return <AISkillsFlow catalog={catalog} />;
}
