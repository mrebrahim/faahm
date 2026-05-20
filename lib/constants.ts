/**
 * Application-wide constants
 */

export const APP_NAME = 'فاهم!';
export const APP_TAGLINE = 'أول منصة عربية لكورسات الذكاء الاصطناعي';
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://faahm.com';

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
} as const;

// Support
export const SUPPORT = {
  email: 'hello@faahm.com',
  whatsapp: process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP || '',
} as const;
