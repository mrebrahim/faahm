/**
 * Application-wide constants
 */

export const APP_NAME = 'فاهم!';
export const APP_TAGLINE = 'أول منصة عربية لكورسات بالذكاء الاصطناعي';
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://faahm.com';

/**
 * Canonical public hostname used in SEO surfaces (sitemap.xml,
 * robots.txt, OpenGraph URLs). Deliberately separate from APP_URL so
 * a misconfigured NEXT_PUBLIC_APP_URL on a preview / sslip.io host
 * doesn't leak into the indexable XML — Google should always see
 * faahm.com as the origin.
 */
export const CANONICAL_URL = 'https://faahm.com';

// Pricing
export const PLANS = {
  monthly: {
    id: 'monthly',
    name: 'الاشتراك الشهري',
    priceCents: 500,
    price: 5,
    currency: 'USD',
    interval: 'month',
    features: [
      'وصول كامل لكل الكورسات',
      'فيديوهات بجودة عالية',
      'ملفات وموارد قابلة للتحميل',
      'مسابقات تفاعلية',
      'شهادات إتمام',
      'دعم فني',
    ],
  },
  yearly: {
    id: 'yearly',
    name: 'الاشتراك السنوي',
    priceCents: 4000,
    price: 40,
    currency: 'USD',
    interval: 'year',
    badge: 'وفّر 33%',
    features: [
      'كل مميزات الاشتراك الشهري',
      'وفّر 33% (شهرين مجانًا)',
      'أولوية الدعم الفني',
      'وصول مبكر للكورسات الجديدة',
    ],
  },
} as const;

export type PlanId = keyof typeof PLANS;

// Routes
export const ROUTES = {
  home: '/',
  login: '/login',
  signup: '/signup',
  pricing: '/pricing',
  courses: '/courses',
  dashboard: '/dashboard',
  certificates: '/certificates',
  settings: '/settings',
  admin: '/admin',
  course: (slug: string) => `/course/${slug}`,
  lesson: (id: string) => `/lesson/${id}`,
  quiz: (id: string) => `/quiz/${id}`,
} as const;

// Support
export const SUPPORT = {
  email: 'hello@faahm.com',
  whatsapp: process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP || '',
} as const;

/**
 * Manual / off-platform payment endpoints used by /checkout. Stripe stays
 * the default for cards & Apple Pay; the three below are admin-verified
 * channels where the student pays externally and we grant access after a
 * WhatsApp screenshot confirmation.
 */
export const OFFLINE_PAYMENTS = {
  paypal: {
    monthly: 'https://www.paypal.com/ncp/payment/C3JVXJJ4BFT3U',
    yearly: 'https://www.paypal.com/ncp/payment/M4RVPG4TEWKN6',
  },
  instapay: {
    link: 'https://ipn.eg/S/ibrahimkhalil01/instapay/9I3KGq',
    handle: 'ibrahimkhalil01@instapay',
  },
  vodafoneCash: {
    phone: '01050858819',
  },
  // International E.164 (no +) for wa.me. Admins receive payment
  // screenshots here.
  confirmationWhatsApp: '201050858834',
} as const;

/**
 * PayPal subscription configuration — uses PayPal Hosted Buttons. The
 * subscribe button is a plain HTML form that POSTs `hosted_button_id`
 * to PayPal's webscr endpoint; PayPal handles the entire checkout and
 * recurring billing. There's no SDK callback with a subscription id,
 * so activation runs through the same manual WhatsApp-confirmation
 * flow as InstaPay / Vodafone Cash — the user lands on
 * /billing/success and, if the subscription row isn't there yet,
 * sees the 'confirm via WhatsApp' CTA.
 */
export const PAYPAL = {
  hostedButtons: {
    monthly: 'DJWE2F2CEXKP6',
    yearly: 'VX7RG9E6LTV58',
  },
} as const;
