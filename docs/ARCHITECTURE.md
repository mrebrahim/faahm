# 🎓 فاهم! — Project Architecture

> منصة تعليمية بالاشتراك، مستوحاة من Udemy و almentor و yanfaa.

---

## 📌 Project Overview

| | |
|---|---|
| **Name** | فاهم! (Faahm) |
| **Domain** | faahm.com |
| **Type** | Subscription-based Learning Platform |
| **Languages** | Arabic (primary), English (future) |
| **Target Market** | Egypt 🇪🇬 + Saudi Arabia 🇸🇦 + GCC |
| **Plans** | Monthly $5 • Yearly $40 (33% discount) |

---

## 🎨 Brand Identity

### Colors

```
Primary Green:    #22C55E  (من اللوجو)
Hover Green:      #16A34A
Active Green:     #15803D
Deep Black:       #0A0A0A
Section Dark:     #18181B
Card Dark:        #27272A
Muted Text:       #71717A
White:            #FFFFFF
```

### Typography

- **Primary**: Cairo (Google Fonts) — للنصوص الأساسية
- **Display**: Tajawal — للعناوين الكبيرة
- **Mono**: JetBrains Mono — للكود

### Design Principles

1. **Dark-first**: الخلفية الأساسية داكنة (#0A0A0A) مع لمسات أخضر
2. **RTL-native**: مش "ضفنا RTL" — التصميم متبني RTL من الأول
3. **Mobile-first**: ٧٠٪ من الجمهور موبايل
4. **Inspired by yanfaa.com**: نظافة + بساطة + بطاقات كورسات واضحة

---

## 🏗️ Tech Stack

### Frontend
| | |
|---|---|
| **Framework** | Next.js 14 (App Router) |
| **Language** | TypeScript |
| **Styling** | Tailwind CSS + shadcn/ui |
| **State** | Zustand (للـ client state) + Server Components |
| **Forms** | React Hook Form + Zod |
| **Icons** | Lucide React |
| **Animation** | Framer Motion (sparingly) |

### Backend & Data
| | |
|---|---|
| **Database** | Supabase (PostgreSQL) |
| **Auth** | Supabase Auth (Email + Google OAuth) |
| **Storage** | Cloudflare R2 (للملفات + الشهادات) |
| **Video** | Vimeo (embedded with domain restriction) |
| **Email** | Resend |
| **PDFs** | pdf-lib (للشهادات) |

### Payments
| | |
|---|---|
| **Primary** | Paymob (مصر/خليج — فيزا، Apple Pay، InstaPay، فودافون كاش) |
| **Secondary** | Stripe (لما تفتح شركة برة) |

### Infrastructure
| | |
|---|---|
| **Hosting (MVP)** | Vercel |
| **Hosting (Scale)** | Hetzner CPX31 + Coolify |
| **CDN/DNS** | Cloudflare |
| **Monitoring** | Sentry + Vercel Analytics |

---

## 📁 Folder Structure

```
faahm/
├── app/
│   ├── (auth)/                  # Public auth pages
│   │   ├── login/page.tsx
│   │   ├── signup/page.tsx
│   │   └── reset-password/page.tsx
│   │
│   ├── (marketing)/             # Public marketing pages
│   │   ├── page.tsx             # Landing
│   │   ├── pricing/page.tsx
│   │   ├── about/page.tsx
│   │   └── instructors/page.tsx
│   │
│   ├── (app)/                   # Authenticated app
│   │   ├── dashboard/page.tsx   # كورساتي
│   │   ├── courses/page.tsx     # تصفّح الكورسات
│   │   ├── course/[slug]/page.tsx
│   │   ├── lesson/[id]/page.tsx
│   │   ├── certificates/page.tsx
│   │   └── settings/page.tsx
│   │
│   ├── (admin)/                 # Admin panel
│   │   ├── admin/page.tsx       # Dashboard
│   │   ├── admin/courses/...
│   │   ├── admin/students/...
│   │   ├── admin/quizzes/...
│   │   ├── admin/payments/...
│   │   └── admin/analytics/...
│   │
│   ├── api/
│   │   ├── webhooks/
│   │   │   ├── paymob/route.ts
│   │   │   └── stripe/route.ts
│   │   ├── checkout/route.ts
│   │   ├── progress/route.ts
│   │   ├── certificates/generate/route.ts
│   │   └── quiz/submit/route.ts
│   │
│   ├── layout.tsx               # Root layout (RTL + fonts)
│   ├── globals.css
│   └── not-found.tsx
│
├── components/
│   ├── ui/                      # shadcn components
│   ├── marketing/               # landing sections
│   ├── courses/                 # course cards, listing
│   ├── lessons/                 # video player, sidebar
│   ├── quiz/                    # quiz components
│   ├── admin/                   # admin tables, forms
│   └── shared/                  # navbar, footer
│
├── lib/
│   ├── supabase/
│   │   ├── client.ts            # browser client
│   │   ├── server.ts            # server client (RSC)
│   │   ├── service.ts           # service role (webhooks)
│   │   └── middleware.ts
│   ├── paymob.ts
│   ├── stripe.ts
│   ├── vimeo.ts
│   ├── certificate.ts           # PDF generation
│   ├── utils.ts
│   └── constants.ts
│
├── hooks/
│   ├── use-subscription.ts
│   ├── use-progress.ts
│   └── use-quiz.ts
│
├── types/
│   ├── database.types.ts        # auto-generated من Supabase
│   └── index.ts
│
├── supabase/
│   ├── schema.sql               # ✅ جاهز
│   └── migrations/              # للتعديلات المستقبلية
│
├── public/
│   ├── logo.svg
│   ├── og-image.png
│   └── certificates-template.pdf
│
├── docs/
│   └── ARCHITECTURE.md          # ✅ ده الملف
│
├── .env.local                   # 🚨 متضيفش في Git
├── .env.example                 # في Git
├── middleware.ts                # Next.js middleware (auth)
├── next.config.js
├── tailwind.config.ts           # ✅ جاهز
├── tsconfig.json
└── package.json
```

---

## 🔐 Authentication Flow

```
المستخدم يدخل faahm.com
        │
        ├── يضغط "تسجيل" → /signup
        │   ├── يدخل: name, email, phone, password
        │   ├── Supabase Auth ينشئ user في auth.users
        │   ├── Trigger يعمل profile في public.profiles
        │   └── يتحوّل لـ /pricing (مفيهوش اشتراك لسه)
        │
        ├── يضغط "دخول" → /login
        │   ├── Email/Password أو Google OAuth
        │   └── يتحوّل لـ /dashboard
        │
        └── يفتح كورس → الـ middleware يتأكد:
                ├── في session؟
                ├── في اشتراك نشط؟ (RLS بيتأكد كمان)
                └── لو لأ → يتحوّل لـ /pricing
```

---

## 💳 Payment & Subscription Flow

### للجمهور المصري/العربي (Paymob)

```
1. الطالب في /pricing يختار "اشتراك شهري"
        ↓
2. POST /api/checkout
        ├── يكوّن Paymob Order
        ├── يحفظ pending payment في DB
        └── يرجّع iframe URL
        ↓
3. الطالب يدفع في iframe Paymob
        ↓
4. Paymob يبعت webhook → /api/webhooks/paymob
        ├── يتحقق من signature
        ├── يحدّث payment.status = 'paid'
        ├── ينشئ subscription نشطة
        └── يبعت إيميل ترحيب
        ↓
5. الطالب يرجع للموقع → عنده اشتراك ✅
```

### للجمهور الدولي (Stripe — لاحقًا)

نفس الـ flow بـ Stripe Checkout + Subscriptions API.

---

## 🎬 Video Protection Strategy

### Vimeo Setup
لكل فيديو على Vimeo نفعّل:

1. **Privacy → Where can this video be embedded?**
   - يقتصر على: `faahm.com`, `www.faahm.com`
2. **Privacy → Who can watch?**
   - "Hide from Vimeo" + "Hide from Google"
3. **Embed → Disable download**

### Application Layer

```typescript
// قبل عرض الـ iframe بنتأكد من:
// 1. المستخدم مسجّل دخول
// 2. عنده اشتراك نشط (أو الدرس is_free_preview)
// 3. الـ RLS في DB بيرفض الـ query لو مفيش اشتراك
// 4. الـ iframe بيتعرض فقط بعد التحقق
```

---

## 🏆 Certificate Generation

```
الطالب يكمّل الكورس (آخر درس + الكويز النهائي بنجاح)
        ↓
يضغط "احصل على شهادتك"
        ↓
POST /api/certificates/generate
        ├── يتأكد إن الكورس فعلًا مكتمل
        ├── يولّد رقم شهادة: FH-2026-00001
        ├── يستخدم pdf-lib لإنشاء PDF من template
        ├── يحط: الاسم، اسم الكورس، التاريخ، رقم الشهادة
        ├── يرفع PDF على Cloudflare R2
        └── يحفظ في certificates table
        ↓
الطالب يحمّل الشهادة + يشاركها على LinkedIn ✨
```

---

## 📊 Admin Panel Features

### الكورسات
- ✅ إنشاء/تعديل/حذف كورس
- ✅ إنشاء أقسام (Chapters) ودروس
- ✅ ربط فيديو Vimeo (نلصق الـ ID فقط)
- ✅ رفع ملفات مرفقة لكل درس
- ✅ نشر/إخفاء كورس

### الطلاب
- ✅ عرض كل الطلاب
- ✅ إحصائيات كل طالب (الكورسات اللي شافها، الشهادات)
- ✅ تعليق حساب (`is_blocked`)
- ✅ تجديد/إلغاء اشتراك يدوي

### المسابقات
- ✅ إنشاء كويز مع أسئلة + اختيارات
- ✅ تحديد الإجابات الصحيحة + النسبة للنجاح
- ✅ عرض محاولات الطلاب

### الإحصائيات
- ✅ إجمالي الإيرادات (شهري/سنوي)
- ✅ نمو الاشتراكات
- ✅ أكتر كورسات مشاهدة
- ✅ معدّل إكمال الكورسات

---

## 🚀 Deployment Strategy

### Stage 1: MVP على Vercel
- نشر سريع بـ `git push`
- Auto-preview لكل PR
- Free tier كافي للبداية

### Stage 2: الإنتاج على Hetzner + Coolify
لما عدد المستخدمين يكبر، أو نحتاج workers أو queues:
- Hetzner CPX31 (€16/شهر)
- Coolify لإدارة الـ containers
- نسخ احتياطي يومي على Hetzner Storage Box

---

## 📝 Environment Variables (.env.example)

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=         # 🚨 سيرفر فقط

# Paymob
PAYMOB_API_KEY=
PAYMOB_INTEGRATION_ID_CARD=
PAYMOB_INTEGRATION_ID_WALLET=
PAYMOB_HMAC_SECRET=

# Stripe (لاحقًا)
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=

# Cloudflare R2
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=

# Resend
RESEND_API_KEY=

# Vimeo (اختياري - للـ API)
VIMEO_ACCESS_TOKEN=

# App
NEXT_PUBLIC_APP_URL=https://faahm.com
NEXT_PUBLIC_SUPPORT_WHATSAPP=
```

---

## 🛣️ Build Order (الترتيب الموصى به)

نتيجة لقرارك ببناء كل حاجة مع بعض، الترتيب اللي بيقلّل الـ blockers:

1. ✅ **Schema + Auth setup** — الأساس
2. ✅ **Tailwind + Design System** — الستايل
3. **Landing Page + Pricing** — السوق
4. **Course listing + Course detail (public)** — المعروض
5. **Subscription + Payment integration** — البيع
6. **Lesson viewer + Vimeo player + Progress tracking** — المنتج الأساسي
7. **Admin panel (courses CRUD)** — الإدارة
8. **Quizzes (student side + admin)** — التفاعل
9. **Certificates generation** — التتويج
10. **Email automations + Analytics** — التحسين

---

> **Created**: 2026
> **Status**: 🟢 In active development
