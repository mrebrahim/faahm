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

/**
 * Legacy subscription plans.
 *
 * فاهم no longer SELLS a subscription — the three courses are bought
 * outright ($60 each, $99 for the bundle; see lib/catalog.ts). These
 * entries remain only so the people who bought a plan before the change
 * still see it named correctly in /settings, /admin and their renewal
 * webhooks. Nothing here is a price list; do not put one back.
 */
export const PLANS = {
  monthly: { id: 'monthly', name: 'الاشتراك الشهري', interval: 'month' },
  yearly: { id: 'yearly', name: 'الاشتراك السنوي', interval: 'year' },
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


