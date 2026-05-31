import type { Metadata, Viewport } from 'next';
import { Cairo, Tajawal } from 'next/font/google';
import './globals.css';
import { APP_NAME, APP_TAGLINE, APP_URL } from '@/lib/constants';
import { Analytics } from '@/components/analytics';

const cairo = Cairo({
  subsets: ['arabic', 'latin'],
  variable: '--font-cairo',
  display: 'swap',
});

const tajawal = Tajawal({
  subsets: ['arabic', 'latin'],
  weight: ['400', '500', '700', '800', '900'],
  variable: '--font-tajawal',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: `${APP_NAME} - ${APP_TAGLINE}`,
    template: `%s | ${APP_NAME}`,
  },
  description: 'فاهم — أول منصة عربية لكورسات بالذكاء الاصطناعي في الأتمتة، التسويق الرقمي، وصناعة المحتوى. من خبراء عرب وباشتراك واحد بسيط.',
  keywords: [
    'الذكاء الاصطناعي',
    'كورسات AI',
    'كورسات عربية',
    'تعلم الذكاء الاصطناعي',
    'ChatGPT',
    'n8n',
    'أتمتة',
    'تسويق رقمي',
    'صناعة المحتوى',
    'منصة عربية',
    'فاهم',
  ],
  authors: [{ name: 'فاهم' }],
  metadataBase: new URL(APP_URL),
  openGraph: {
    title: `${APP_NAME} — ${APP_TAGLINE}`,
    description: 'تعلّم الذكاء الاصطناعي، الأتمتة، والتسويق الرقمي من خبراء عرب. مئات الكورسات باشتراك واحد.',
    url: APP_URL,
    siteName: APP_NAME,
    locale: 'ar_EG',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: `${APP_NAME} — ${APP_TAGLINE}`,
    description: 'تعلّم الذكاء الاصطناعي، الأتمتة، والتسويق الرقمي من خبراء عرب.',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#0A0A0A',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="ar"
      dir="rtl"
      className={`${cairo.variable} ${tajawal.variable} `}
      suppressHydrationWarning
    >
      <body className="font-sans min-h-screen bg-background text-foreground">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
