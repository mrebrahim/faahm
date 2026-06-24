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

// Pricing.
// Monthly is intentionally priced ABOVE the 12-month equivalent of the
// yearly plan ($9.99 × 12 = $119.88 vs. $40/year). This is what powers
// the "save 67%" anchor on /pricing — and the gap is large enough that
// most visitors who don't have an immediate cancel risk reach for the
// yearly plan. Monthly is intentionally feature-limited (courses only)
// so the comparison isn't just about price.
export const PLANS = {
  monthly: {
    id: 'monthly',
    name: 'الاشتراك الشهري',
    priceCents: 999,
    price: 9.99,
    currency: 'USD',
    interval: 'month',
    features: [
      'وصول كامل لكل الكورسات',
      'فيديوهات بجودة عالية',
      'ملفات وموارد قابلة للتحميل',
      'مسابقات تفاعلية',
    ],
    // Features the monthly plan does NOT include — surfaced as ❌
    // bullets on /pricing so visitors see exactly what they lose vs.
    // the yearly plan, not just a vague feature gap.
    missingFeatures: [
      'بدون المساعد الذكي فاهم',
      'بدون شهادة إتمام',
      'بدون أولوية الدعم الفني',
    ],
  },
  yearly: {
    id: 'yearly',
    name: 'الاشتراك السنوي',
    priceCents: 4000,
    price: 40,
    currency: 'USD',
    interval: 'year',
    badge: 'وفّر 67%',
    features: [
      'وصول كامل لكل الكورسات',
      'المساعد الذكي فاهم',
      'شهادة إتمام لكل كورس',
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
 * Stripe-hosted Payment Links for the SAR funnel. These are pre-built
 * subscription checkouts created in Stripe Dashboard with SAR-priced
 * recurring prices baked in — we just redirect the visitor to them
 * with prefilled_email so they land on the right currency without us
 * having to call the Stripe API ourselves. Subscription activation
 * still rides on the existing Stripe webhook.
 */
export const STRIPE_PAYMENT_LINKS = {
  monthly: 'https://buy.stripe.com/eVq9ATfno87QfIQbOY53O1I',
  yearly: 'https://buy.stripe.com/4gM7sL5MO3RAgMU1ak53O1J',
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
