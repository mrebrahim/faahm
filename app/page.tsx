import { AiBundleLanding } from '@/components/ai-bundle-landing';
import { resolveNavAuth } from '@/lib/nav-auth';
import { APP_NAME } from '@/lib/constants';
import { AI_BUNDLE, BUNDLE_ANCHOR_USD } from '@/lib/catalog';

export const metadata = {
  title: `${APP_NAME} — ٣ كورسات AI بالعربي في Bundle واحد بـ $${AI_BUNDLE.priceUsd}`,
  description: `أتمتة n8n + صناعة فيديو AI + برمجة Vibe Coding — ٣ كورسات عربية عملية بـ $${AI_BUNDLE.priceUsd} بدلاً من $${BUNDLE_ANCHOR_USD}. وصول دائم وضمان استرداد ٧ أيام.`,
  openGraph: {
    title: `${APP_NAME} — ٣ مصادر دخل من الـ AI. ٩٠ يوم.`,
    description: `٣ كورسات AI عربية + سيرفر مجاني + ١٥,٠٠٠ قالب + دعم WhatsApp. خدهم بـ $${AI_BUNDLE.priceUsd} بدلاً من $${BUNDLE_ANCHOR_USD}.`,
    type: 'website',
  },
  robots: { index: true, follow: true },
  alternates: { canonical: 'https://faahm.com/' },
};

export const dynamic = 'force-dynamic';

/**
 * Home is the AI Bundle funnel.
 *
 * The site sells three courses and the bundle that packages them, so the
 * front door is the page that sells them rather than a catalogue tour.
 * /ai-bundle renders the same component and keeps working for every ad
 * and share already pointing there.
 */
export default async function HomePage() {
  const { signedIn, isAdmin } = await resolveNavAuth();
  return <AiBundleLanding signedIn={signedIn} isAdmin={isAdmin} />;
}
