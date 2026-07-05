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
 * Stripe-hosted Payment Links for the USD funnel. Each one MUST be a
 * SUBSCRIPTION Payment Link (mode=subscription) attached to a
 * RECURRING Price in Stripe Dashboard:
 *   - monthly link → $10 USD price, billing_scheme=per_unit,
 *     recurring={interval:'month', interval_count:1}
 *   - yearly  link → $40 USD price, billing_scheme=per_unit,
 *     recurring={interval:'year',  interval_count:1}
 * If you swap either for a one-time (mode=payment) Payment Link, Stripe
 * will charge the card once and NEVER auto-renew — the customer will
 * silently lose access after a month/year with no renewal invoice.
 * The webhook below (case 'customer.subscription.updated' / '.deleted'
 * and 'invoice.payment_succeeded') already handles renewals & cancels;
 * it only fires for real Subscription objects.
 */
export const STRIPE_PAYMENT_LINKS = {
  monthly: 'https://buy.stripe.com/eVqaEXfno0Fo408dX653O1H',
  yearly: 'https://buy.stripe.com/4gM8wPejkafYfIQdX653O1E',
} as const;

/**
 * PayPal subscription configuration — SDK + plan IDs. PayPal's
 * subscription SDK creates a Subscription resource keyed off `plan_id`
 * (a recurring price you've configured in PayPal Dashboard). After
 * the visitor approves, the SDK's `onApprove` callback hands us back
 * a subscription ID that the server can verify against PayPal's API
 * to unlock the user.
 *
 * `clientId` is public (it appears in the loaded SDK URL). The
 * matching server-side secret lives in PAYPAL_CLIENT_SECRET so the
 * activation route can call PayPal's /v1/billing/subscriptions/{id}
 * endpoint to confirm payment state before granting access.
 */
export const PAYPAL = {
  clientId:
    process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID ||
    'Aa2JYhQE0BrpujlmTjeAnBOj8ZbbaV43lwMgJWpE-nAg0X2wED_nUCoLJvK-sP-wn1I-ewF6F-_FRZ3s',
  plans: {
    monthly: 'P-41703329EL039891VNITKHGQ',
    yearly: 'P-81768794T3699470VNITKGCY',
  },
} as const;
