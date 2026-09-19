import { AiBundleLanding } from '@/components/ai-bundle-landing';
import { resolveNavAuth } from '@/lib/nav-auth';
import { APP_NAME } from '@/lib/constants';
import { AI_BUNDLE, BUNDLE_ANCHOR_USD } from '@/lib/catalog';

export const metadata = {
  title: `AI Bundle — ٣ كورسات AI + سيرفر مجاني بـ $${AI_BUNDLE.priceUsd} | ${APP_NAME}`,
  description: `اتعلم أتمتة n8n + صناعة فيديو AI + برمجة Vibe Coding في Bundle واحد بـ $${AI_BUNDLE.priceUsd} بدلاً من $${BUNDLE_ANCHOR_USD}. وصول دائم + ضمان استرداد ٧ أيام.`,
  openGraph: {
    title: `AI Bundle — ٣ مصادر دخل. ٩٠ يوم. $${AI_BUNDLE.priceUsd}`,
    description: `٣ كورسات AI عربية + سيرفر مجاني + ١٥,٠٠٠ قالب + دعم WhatsApp. خدهم بـ $${AI_BUNDLE.priceUsd} بدلاً من $${BUNDLE_ANCHOR_USD}.`,
    type: 'website',
  },
  robots: { index: true, follow: true },
  // '/' serves the same landing and is the canonical one. Without this
  // the two URLs compete against each other for the same keywords.
  alternates: { canonical: 'https://faahm.com/' },
};

export const dynamic = 'force-dynamic';

/**
 * The original bundle URL. Kept alive because ads, WhatsApp shares and
 * existing links point at it — it simply renders what '/' now renders.
 */
export default async function AIBundlePage() {
  const { signedIn, isAdmin } = await resolveNavAuth();
  return <AiBundleLanding signedIn={signedIn} isAdmin={isAdmin} />;
}
