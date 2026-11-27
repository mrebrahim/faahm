import { AiBundleLanding } from '@/components/ai-bundle-landing';
import { resolveNavAuth } from '@/lib/nav-auth';
import type { Metadata } from 'next';
import { APP_NAME, CANONICAL_URL } from '@/lib/constants';
import { AI_BUNDLE, BUNDLE_ANCHOR_USD, COURSE_PRICE_USD } from '@/lib/catalog';

const HOME_TITLE = `فاهم — منصة إبراهيم خليل لكورسات الذكاء الاصطناعي وn8n بالعربي`;

// Search Console: "منصة فاهم" has the most impressions we get and almost
// no clicks, because Google mixes us up with another platform called
// فاهم. The title and the Organization below name the founder so the
// two can be told apart. Prices come from the catalog, never typed.
export const metadata: Metadata = {
  title: { absolute: HOME_TITLE },
  description: `كورسات إبراهيم خليل بالعربي: أتمتة n8n، صناعة فيديو بالـ AI، وبرمجة Vibe Coding. الكورس بـ $${COURSE_PRICE_USD} أو التلاتة بـ $${AI_BUNDLE.priceUsd} بدل $${BUNDLE_ANCHOR_USD}، وصول دائم وضمان استرداد ٧ أيام.`,
  openGraph: {
    title: `${APP_NAME} — ٣ مصادر دخل من الـ AI. ٩٠ يوم.`,
    description: `٣ كورسات AI عربية + سيرفر مجاني + ١٥,٠٠٠ قالب + دعم WhatsApp. خدهم بـ $${AI_BUNDLE.priceUsd} بدلاً من $${BUNDLE_ANCHOR_USD}.`,
    type: 'website',
  },
  robots: { index: true, follow: true },
  alternates: { canonical: 'https://faahm.com/' },
};

const FOUNDER = {
  '@type': 'Person',
  name: 'إبراهيم خليل',
  alternateName: 'Ibrahim Khalil',
};

const homeJsonLd = [
  {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'فاهم',
    alternateName: ['فاهم!', 'Faahm', 'منصة فاهم إبراهيم خليل'],
    url: `${CANONICAL_URL}/`,
    inLanguage: 'ar',
  },
  {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'فاهم',
    alternateName: ['Faahm', 'منصة فاهم إبراهيم خليل'],
    url: `${CANONICAL_URL}/`,
    founder: FOUNDER,
    description:
      'منصة إبراهيم خليل لكورسات الذكاء الاصطناعي بالعربي: أتمتة n8n، صناعة فيديو بالـ AI، وبرمجة Vibe Coding.',
  },
];

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
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(homeJsonLd).replace(/</g, '\\u003c'),
        }}
      />
      <AiBundleLanding signedIn={signedIn} isAdmin={isAdmin} />
    </>
  );
}
