# Product Requirements Document (PRD)

## فاهم! — Faahm

**أول منصة عربية لكورسات بالذكاء الاصطناعي**

---

| Field | Value |
|---|---|
| **Product Name** | فاهم! (Faahm) |
| **Document Version** | 1.0 |
| **Status** | Draft |
| **Last Updated** | May 2026 |
| **Owner** | Ibrahim — n8nar.com |
| **Engineering Lead** | TBD |
| **Target Launch (MVP)** | Q3 2026 |
| **Target Launch (V1.0)** | Q4 2026 |

---

## Table of Contents

1. Executive Summary
2. Vision & Strategy
3. Market & Users
4. Product Goals & Success Metrics
5. Scope & Phases
6. Feature Specifications
7. User Flows
8. Technical Architecture
9. Data Model
10. Pricing & Monetization
11. Security & Compliance
12. Integrations
13. Content & SEO
14. Analytics & Observability
15. Localization & Accessibility
16. Risks & Mitigations
17. Open Questions
18. Appendices

---

## 1. Executive Summary

### 1.1 Problem
Arabic speakers (450M+ globally, 100M+ in MENA's productive demographic) have access to high-quality global education in English (Coursera, Udemy, MasterClass), but Arabic-language educational content is fragmented, low-quality, or trapped on platforms with poor UX (YouTube, Telegram, scattered Google Drive folders).

When it comes to **AI-powered education** specifically — courses that are designed, produced, and continuously updated using AI tools — the Arabic market has **zero credible platform**. Existing Arabic platforms (Edraak, Rwaq, Almentor) deliver traditional video courses; none position around AI-native content delivery.

### 1.2 Solution
**فاهم!** is the first Arabic-native learning platform built around AI-powered courses across:
- Marketing & advertising automation
- AI tools (ChatGPT, Claude, image/video generation)
- No-code automation (n8n, Make, Zapier)
- Content creation at scale
- Modern programming with AI assistants

**Subscription model**: $5/month or $40/year — full access to all courses. No per-course pricing.

### 1.3 Why Now
- AI tool adoption in MENA grew 6x year-over-year (2024–2025)
- Egyptian SMB market for digital skills training: estimated $40M+
- WhatsApp + Arabic AI content distribution channels mature
- Vercel + Supabase enable global-grade infrastructure at $200/month for first 10K users

### 1.4 Business Model
- **Recurring subscriptions** (primary): $5/mo, $40/yr
- **B2B annual licenses** (year 2): SMB & enterprise team accounts
- **Certificates & specializations** (year 2): premium add-ons
- **Affiliate marketplace** (year 3): instructor revenue share

### 1.5 KPIs (12-month targets)
| Metric | MVP (M1-3) | V1.0 (M3-6) | V1.5 (M6-12) |
|---|---|---|---|
| Registered users | 500 | 5,000 | 25,000 |
| Paying subscribers | 50 | 750 | 5,000 |
| MRR | $250 | $3,750 | $25,000 |
| Course library | 5 | 25 | 100 |
| Free → Paid conversion | 10% | 15% | 20% |
| Monthly churn | <10% | <7% | <5% |

---

## 2. Vision & Strategy

### 2.1 Vision (3-year)
> To become the default Arabic-language learning destination for anyone wanting to acquire AI-era professional skills — from a freelance content creator in Cairo to a marketing director in Riyadh.

### 2.2 Mission (1-year)
Build a self-serve Arabic learning platform with 100+ high-quality courses, 25,000 registered users, and 5,000 paying subscribers — proving that Arabic learners will pay for quality.

### 2.3 Strategic Pillars

| Pillar | Description |
|---|---|
| **Arabic-First** | Every piece — UI copy, video subtitles, instructor voice, support — is native Egyptian/Gulf Arabic, not translated |
| **AI-Native** | Courses are produced WITH AI (HeyGen avatars, ElevenLabs voices, AI-assisted scripts) → fast publishing cadence |
| **Subscription Only** | No per-course pricing. Removes decision paralysis, drives content consumption |
| **Mobile-First** | 80%+ of Arab learners use mobile primarily — UI optimized for one-thumb use |
| **Community-Driven** | "ذكاء لايف" — live AI tutor sessions create stickiness no Coursera can match |

### 2.4 Non-Goals (What we will NOT build)

- ❌ Per-course pricing
- ❌ Live human-led webinars (V1 — AI-assisted only)
- ❌ Children's education (16+ minimum age)
- ❌ University accreditation
- ❌ Free tier with most content unlocked (preview-only is fine)
- ❌ User-generated content (instructors are curated)

---

## 3. Market & Users

### 3.1 Total Addressable Market (TAM)

| Segment | Users | ARPU/yr | TAM |
|---|---|---|---|
| Arabic-speaking digital workers 22–45 | 60M | $40 | $2.4B |
| Arabic SMB owners seeking digital skills | 8M | $100 | $800M |
| Arabic students in tech/marketing fields | 12M | $40 | $480M |
| **TAM Total** | **80M** | — | **$3.68B** |

### 3.2 Serviceable Addressable Market (SAM, 3-year)
**5% capture**: ~$184M. Realistic 3-year SAM focus: **Egypt + KSA + UAE** = $90M.

### 3.3 Target Personas

#### Persona 1: محمود — Freelance Marketer (Primary)
- Age: 26, lives in Cairo
- Income: 15,000 EGP/month
- Skills: Facebook/Instagram ads, basic Canva
- Pain: Clients now expect AI workflows, automation, video content; he can't keep up
- Channels: YouTube, Facebook groups, TikTok, WhatsApp
- Devices: Android phone (primary), occasional laptop at coworking
- Will pay for: Practical, immediately applicable skills
- **Acquisition cost target**: $3 CAC

#### Persona 2: سارة — Corporate Marketing Manager (Secondary)
- Age: 32, lives in Riyadh
- Income: 18,000 SAR/month
- Role: Manages 3-person marketing team at SaaS company
- Pain: Needs to train her team on AI tools; existing courses are English-only
- Channels: LinkedIn, Twitter, podcasts
- Devices: MacBook + iPhone
- Will pay for: Team-level B2B licenses (year 2+)
- **Acquisition cost target**: $15 CAC

#### Persona 3: أحمد — Computer Science Student (Tertiary)
- Age: 21, university student
- Income: parental allowance / part-time gig income
- Skills: Some Python, learning frontend
- Pain: University curriculum is outdated; wants real-world AI-assisted coding skills
- Channels: Discord, GitHub, Twitter
- Devices: Mid-range laptop
- Will pay for: Annual plan if priced like Netflix (~$40/yr)
- **Acquisition cost target**: $2 CAC

---

## 4. Product Goals & Success Metrics

### 4.1 North Star Metric
**Weekly Active Learners (WAL)** — defined as: distinct subscribers who completed ≥1 lesson in a given week.

### 4.2 Goals by Phase

#### MVP (Months 1–3)
| Goal | Metric | Target |
|---|---|---|
| Prove product-market fit | Free → Paid conversion | ≥10% |
| Validate content cadence | Courses published / month | ≥3 |
| Reduce friction | Signup → first-lesson completion | ≥40% |
| Test pricing | LTV / CAC ratio | ≥2.5 |

#### V1.0 (Months 4–6)
| Goal | Metric | Target |
|---|---|---|
| Scale acquisition | New signups / month | ≥1,500 |
| Improve retention | 30-day retention | ≥60% |
| Launch certificates | Certs issued / month | ≥100 |
| Reduce churn | Monthly churn | ≤7% |

#### V1.5 (Months 7–12)
| Goal | Metric | Target |
|---|---|---|
| Launch live sessions | "ذكاء لايف" beta | 200 users |
| B2B revenue stream | Team accounts | 10 |
| Community engagement | DAU / MAU | ≥0.25 |
| Brand awareness | Organic search %  | ≥40% of traffic |

---

## 5. Scope & Phases

### 5.1 Phase Roadmap

```
Phase 0 (DONE)        ── Foundation
Phase 1 (CURRENT)     ── MVP: Auth + Course Player + Subscriptions
Phase 2 (Month 2-3)   ── V1.0: Quizzes + Certificates + Mobile polish
Phase 3 (Month 4-6)   ── Growth: Affiliate, B2B, Referrals
Phase 4 (Month 7-12)  ── Innovation: ذكاء لايف + AI Tutor + Mobile apps
```

### 5.2 Phase 0 — Foundation (Completed ✅)

- [x] Brand identity (logo, colors, typography)
- [x] Database schema (16 tables, RLS policies)
- [x] Next.js 14 + Supabase + Vercel deployment
- [x] Light theme UI
- [x] Authentication (email + password)
- [x] Admin panel skeleton (`/admin`)
- [x] Landing page with positioning copy
- [x] "ذكاء لايف" coming-soon section

### 5.3 Phase 1 — MVP (Current focus, weeks 1–8)

**Goal**: Ship a usable product to 50 paying beta users.

#### Must-Have (P0)
- [ ] **Public course catalog** (`/courses`) — grid with filters by category, level
- [ ] **Course detail page** (`/course/[slug]`) — trailer, syllabus, instructor, CTA
- [ ] **Lesson player** (`/lesson/[id]`) — Vimeo embed + sidebar with chapter navigation
- [ ] **Progress tracking** — mark lessons as complete, resume where left off
- [ ] **Free preview lessons** — first 1–2 lessons per course unlocked for non-subscribers
- [ ] **Subscription paywall** — non-subscribers blocked from non-preview lessons
- [ ] **Paymob integration** — accept Egyptian payment methods (Vodafone Cash, Fawry, Visa)
- [ ] **Subscription management UI** — view plan, cancel, change billing cycle
- [ ] **Email notifications** — welcome, subscription confirmation, payment receipts
- [ ] **Admin: Course CRUD** — create, edit, publish/unpublish, delete
- [ ] **Admin: Lesson management** — add Vimeo ID, duration, mark as free preview
- [ ] **Admin: User management** — view users, change roles, ban/unban
- [ ] **Search** — basic full-text search across course titles + descriptions

#### Should-Have (P1)
- [ ] **Pricing comparison** page with monthly vs annual toggle
- [ ] **Testimonials** section on landing page (3–5 quotes)
- [ ] **FAQ** page
- [ ] **Multi-language UI base** (Arabic done, English placeholder)
- [ ] **Coupon system** — admin can create promo codes
- [ ] **Cookie consent banner** (GDPR-style)
- [ ] **Terms of Service + Privacy Policy** pages

#### Won't-Have (deferred to Phase 2)
- ❌ Quizzes
- ❌ Certificates
- ❌ Discussion forums
- ❌ Mobile app
- ❌ Stripe (Paymob only for MVP)

### 5.4 Phase 2 — V1.0 (weeks 9–16)

#### Features
- [ ] **Quizzes** — multiple choice, true/false at end of each chapter
- [ ] **Quiz attempts tracking** — pass/fail, retry logic
- [ ] **Certificates** — auto-generated PDF on course completion (≥80% on quizzes)
- [ ] **Mobile web polish** — bottom nav, swipe gestures, responsive video
- [ ] **Notes** — students can take notes per lesson, saved to their account
- [ ] **Bookmarks** — save courses to "watch later"
- [ ] **Continue watching** widget on dashboard
- [ ] **Email digests** — weekly "what's new" + progress reminders
- [ ] **Discount campaigns** — Black Friday / Ramadan / Back to school
- [ ] **Annual plan with promo** — "First year for $25"
- [ ] **Referral program** — give a month, get a month

### 5.5 Phase 3 — Growth (weeks 17–28)

- [ ] **Affiliate program** — content creators earn 30% recurring on referrals
- [ ] **B2B team accounts** — bulk seats, admin dashboard for team manager
- [ ] **Instructor portal** — outside creators can submit courses (curated approval)
- [ ] **Revenue share** for instructors (50% of net subscription attribution)
- [ ] **SEO content strategy** — blog at `/learn`, instructor profiles
- [ ] **In-app messaging** — admin can broadcast announcements
- [ ] **Multi-instructor courses** — guest instructors per chapter

### 5.6 Phase 4 — Innovation (months 7–12)

- [ ] **ذكاء لايف (Smart Live)** — AI-powered live tutor sessions
  - Personalized 1:1 with AI agent that knows learner's progress
  - Real-time Q&A on lesson content
  - Voice + text interface in Arabic
  - Built on Realtime Voice API + custom RAG over course content
- [ ] **Native mobile apps** — React Native (iOS + Android)
- [ ] **Offline downloads** — premium feature
- [ ] **Career paths** — multi-course tracks with credentials
- [ ] **Skill assessments** — pre-course diagnostic to recommend starting point
- [ ] **Community forums** — per-course discussion threads
- [ ] **Live workshops** — monthly with real instructors (premium tier)

---

## 6. Feature Specifications

### 6.1 Authentication

#### 6.1.1 Sign Up
- **Inputs**: Email, password (min 8 chars), full name
- **Optional**: Phone, country
- **Validation**: Email regex, unique email, password strength meter
- **Email confirmation**: Required (Supabase magic link)
- **Default role**: `student`
- **Welcome email**: Triggered post-confirmation with onboarding link
- **Edge cases**:
  - Existing email → "Email already registered. Sign in?"
  - Invalid email → inline error
  - Network failure → toast with retry
- **Anti-spam**: hCaptcha after 3 failed attempts/hour from same IP

#### 6.1.2 Sign In
- **Methods**: Email + password (MVP), Google OAuth (V1.0), magic link (V1.0)
- **Remember me**: Default checked
- **Forgot password**: Reset via email link, valid for 1 hour
- **Failed attempts**: Lockout after 5 in 15 min
- **Post-login redirect**: `/dashboard` or `?redirect=` param

#### 6.1.3 Sign Out
- Available from header dropdown and dashboard nav
- Revokes Supabase session immediately
- Clears all client-side state
- Redirects to `/`

### 6.2 Course Catalog (`/courses`)

#### 6.2.1 Layout
- Grid: 3 cols desktop, 2 cols tablet, 1 col mobile
- Card shows: thumbnail (16:9), title, instructor, level badge, duration, lesson count
- Hover: subtle scale + shadow lift
- Empty state: "لسه ما فيش كورسات. تابعنا قريبًا!"

#### 6.2.2 Filters
- Category (chips, multi-select)
- Level (مبتدئ / متوسط / متقدّم)
- Duration (< 1h / 1-3h / 3-10h / 10h+)
- Free preview only (toggle)

#### 6.2.3 Sorting
- Newest (default)
- Most popular
- Shortest / longest

#### 6.2.4 Search
- Top of page, sticky
- Debounced 300ms
- Searches: title, description, instructor name, tags
- Returns highlighted matches

### 6.3 Course Detail (`/course/[slug]`)

#### 6.3.1 Hero Section
- Background: Vimeo trailer (autoplay muted, fallback to thumbnail image)
- Overlay: Course title, instructor, rating (stars), enrollment count
- CTAs:
  - Non-subscriber: "اشترك دلوقتي وابدأ" (primary) + "شوف عينة مجانية" (secondary)
  - Subscriber: "ابدأ الكورس" or "كمّل من اللي قبل"

#### 6.3.2 Tabs
- **نظرة عامة** (default): description, what you'll learn, requirements
- **المنهج**: chapters + lessons (with locked/unlocked icons)
- **المُحاضر**: bio, photo, social links, other courses
- **آراء الطلاب** (V1.0): reviews + ratings

### 6.4 Lesson Player (`/lesson/[id]`)

#### 6.4.1 Layout
- **Desktop**: 70% player + 30% sidebar (chapter list)
- **Mobile**: full-width player + tabs below (chapters, notes, transcript)

#### 6.4.2 Player Features (MVP)
- Vimeo embedded player (domain-restricted)
- Playback speed: 0.5x, 0.75x, 1x, 1.25x, 1.5x, 2x
- Captions: Arabic + auto-generated
- Quality selector: auto / 360 / 720 / 1080
- Picture-in-picture (browser native)
- Fullscreen

#### 6.4.3 Sidebar
- Course title (clickable, links to course detail)
- Chapter list with expandable lesson items
- Current lesson highlighted
- Completed lessons: green checkmark
- Locked lessons: lock icon (subscription required)
- Click any lesson to navigate

#### 6.4.4 Below Player
- "Mark as complete" button (also auto-marks at 90% playback)
- Lesson title + description
- Attachments (PDFs, code files) — download buttons
- "Next lesson" auto-suggest with countdown

### 6.5 Subscriptions & Payments

#### 6.5.1 Plans
| Plan | Price (USD) | Price (EGP) | Billing |
|---|---|---|---|
| Monthly | $5 | ~250 EGP | Every 30 days |
| Annual | $40 | ~2,000 EGP | Yearly (save 33%) |
| Annual + Cert | $60 | ~3,000 EGP | V1.0 — adds certificates |
| Team (5 seats) | $200/yr | ~10,000 EGP | V1.5 — B2B |

#### 6.5.2 Payment Methods
- **Egypt (Paymob)**:
  - Visa / Mastercard
  - Vodafone Cash
  - Etisalat Cash
  - Fawry
  - Aman / Masary
- **GCC/International (Stripe — Phase 2)**:
  - Visa / Mastercard / Amex
  - Apple Pay
  - Google Pay

#### 6.5.3 Subscription Logic
- New users: 0% trial — must pay to access non-preview content (clearer signal than trial)
- Recurring billing: auto-renew on charge anniversary
- Failed payment: 3 retry attempts over 7 days, then downgrade to `past_due` → `cancelled`
- Cancellation: takes effect at end of current billing period
- Reactivation: one-click resume if within 30 days of cancellation
- Refunds: 7-day no-questions-asked policy

#### 6.5.4 Coupons
- Format: alphanumeric, 4–20 chars
- Types: percent off, fixed amount off, free months
- Limits: usage count cap, per-user usage cap, expiry date
- Stackable: No
- Admin-only creation

### 6.6 Student Dashboard (`/dashboard`)

#### 6.6.1 Sections (top to bottom)
1. **Greeting**: "أهلًا، {first_name}" + current date
2. **Subscription status banner**:
   - Active: "اشتراكك مفعّل لحد {date}"
   - Past due: "ادفع دلوقتي عشان متخسرش الكورسات"
   - None: "ابدأ التعلم بـ $5/شهر"
3. **Stats cards**: Plan / Subscription status / Certificates / Completed lessons
4. **Continue watching** (V1.0): horizontal scroll of recent in-progress courses
5. **Recommended for you**: courses matching student interests
6. **All courses**: grid

#### 6.6.2 Navigation
- لوحتي / الكورسات / الشهادات / الإعدادات / خروج
- Admin link: NEVER shown publicly (admins access `/admin` by direct URL)

### 6.7 Admin Panel (`/admin`)

#### 6.7.1 Dashboard
- KPI cards: Total users, Paying subs, MRR, ARR, Active courses
- Recent signups (last 7 days)
- Recent payments (last 7 days)
- Conversion funnel chart (signups → trials → paid)

#### 6.7.2 Courses (`/admin/courses`)
- Table: title, category, level, lessons, published, created
- Bulk actions: publish, unpublish, delete
- "New course" button → wizard form

#### 6.7.3 Course Editor (`/admin/courses/[id]`)
- Course details form
- Chapters management (drag-and-drop reorder)
- Lessons within chapters (drag-and-drop)
- Quick lesson add: title + Vimeo ID + duration
- Toggle free preview per lesson
- Publish/unpublish course
- Delete (with confirmation)

#### 6.7.4 Users (`/admin/users`) — Phase 2
- Searchable table: email, name, role, subscription, last login
- Click user → detail page with all activity, payments, progress
- Actions: change role, ban, refund, send reset password email
- Export CSV

#### 6.7.5 Payments (`/admin/payments`) — Phase 2
- All transactions: user, amount, status, gateway, date
- Filters: status, date range, gateway
- Refund button (with reason field)

#### 6.7.6 Coupons (`/admin/coupons`) — Phase 2
- List + create/edit
- Usage analytics per coupon

#### 6.7.7 Settings (`/admin/settings`) — Phase 2
- Site-wide announcements
- Email template editor
- Branding (logo upload)
- Integrations (API keys for Vimeo, Paymob, etc.)

### 6.8 Search

#### MVP
- Basic Postgres full-text search across `courses.title_ar` + `courses.description_ar`
- Triggered on course catalog page

#### V1.0
- Search includes lessons + instructors + tags
- Search suggestions / autocomplete
- "No results" with smart suggestions

#### V1.5
- Vector search via pgvector — semantic matching ("courses about making ads with AI" → returns courses tagged differently)

### 6.9 Notifications

| Type | Trigger | Channel |
|---|---|---|
| Welcome | Email confirmed | Email |
| Payment receipt | Successful charge | Email |
| Subscription renewal | 3 days before charge | Email |
| Payment failed | Charge declined | Email + WhatsApp (Phase 2) |
| New course in your category | Course published | Email digest (weekly) |
| Certificate earned | 80%+ quiz score on full course | Email + in-app |
| Reminder | No lesson watched in 7 days | Email |

---

## 7. User Flows

### 7.1 New User Signup → First Lesson

```
1. Land on /                          → Hero CTA "ابدأ التعلم"
2. /signup                            → Email + password + name
3. Confirm email                      → Magic link
4. /dashboard                         → "اشترك دلوقتي" banner
5. /pricing                           → Choose Monthly/Annual
6. /checkout                          → Paymob flow
7. Payment success                    → /dashboard with active sub
8. Browse /courses                    → Pick course
9. /course/[slug]                     → "ابدأ الكورس"
10. /lesson/[first-lesson-id]         → Watch & complete
```

**Conversion checkpoints**:
- Drop-off step 2→3: <40% (email confirm) — mitigate with one-click confirm in email
- Drop-off step 5→7: <20% (checkout) — mitigate with multiple payment methods
- Drop-off step 8→10: <30% (start consuming) — mitigate with onboarding tour

### 7.2 Returning Subscriber

```
1. /                                  → Auto-redirects to /dashboard if cookie present
2. /dashboard                         → "Continue watching: {course}"
3. Click "كمّل من اللي قبل"             → Resumes exact timestamp
```

### 7.3 Admin Adds New Course

```
1. /admin                             → Direct URL (no public link)
2. Click "كورس جديد"                  → /admin/courses/new
3. Fill: title, slug, category, level → Save → /admin/courses/[id]
4. Add chapter "المقدمة"               → Inline form
5. Add lesson "مرحبًا بك"              → Title + Vimeo ID + duration + mark as free preview
6. Repeat for all lessons
7. Click "نشر الكورس"                 → is_published = true
8. Course visible at /course/[slug] for all users
```

---

## 8. Technical Architecture

### 8.1 Stack

| Layer | Technology | Why |
|---|---|---|
| Frontend | Next.js 14 (App Router, RSC) | SSR for SEO, modern DX |
| Language | TypeScript | Type safety |
| Styling | Tailwind CSS + shadcn/ui | Speed + consistency |
| Backend / DB | Supabase (Postgres + Auth + Storage) | Open-source, Postgres-native, RLS |
| Video Hosting | Vimeo (domain-restricted) | Quality + DRM-lite + Arabic captions |
| Hosting | Vercel | Zero-config, edge functions, fast |
| CDN | Cloudflare (in front of Vercel) | DDoS protection, caching |
| Payments | Paymob (Egypt), Stripe (international) | Local methods + global |
| Email | Resend or AWS SES | Transactional + Arabic support |
| Search | Postgres FTS → pgvector V1.5 | No external dep MVP |
| Analytics | PostHog (self-host eventually) | Privacy-first |
| Monitoring | Sentry | Error tracking |
| AI for live | OpenAI Realtime API / Anthropic | Voice + reasoning |

### 8.2 Architecture Diagram

```
                       ┌──────────────┐
                       │  Cloudflare  │ ← DNS + CDN + DDoS
                       └──────┬───────┘
                              │
                       ┌──────▼───────┐
                       │    Vercel    │ ← Next.js 14 (SSR + API routes)
                       └──┬───────┬───┘
                          │       │
              ┌───────────▼─┐   ┌─▼─────────────┐
              │  Supabase   │   │  Vimeo        │ ← Video CDN
              │ (Postgres + │   │  (private)    │
              │  Auth +     │   └───────────────┘
              │  Storage)   │
              └──┬──────────┘
                 │
       ┌─────────▼────────┐
       │  Edge Functions  │ ← Cron jobs, webhooks
       │  - Paymob webhook│
       │  - Email triggers│
       │  - Cert generation│
       └──────────────────┘
```

### 8.3 Deployment Strategy

- **Branches**:
  - `main` → production (auto-deploy to `faahm.com`)
  - `staging` → preview (auto-deploy to `staging.faahm.com`)
  - Feature branches → PR preview URLs
- **Migrations**: Supabase migration files in `supabase/migrations/`
- **Secrets**: Vercel env vars (encrypted)
- **Rollback**: Vercel one-click revert + Supabase migration rollback

### 8.4 Performance Targets

| Metric | Target |
|---|---|
| Largest Contentful Paint (LCP) | < 2.0s |
| First Input Delay (FID) | < 100ms |
| Cumulative Layout Shift (CLS) | < 0.1 |
| Time to First Byte (TTFB) | < 600ms |
| Lighthouse score | ≥ 95 mobile |
| API p95 response time | < 500ms |
| Video start time | < 2s (Vimeo) |

---

## 9. Data Model

### 9.1 Core Tables (existing)

| Table | Purpose | Key Columns |
|---|---|---|
| `profiles` | Extends auth.users | id, full_name, role, avatar_url |
| `categories` | Course taxonomy | id, slug, name_ar, icon |
| `instructors` | Course teachers | id, name_ar, bio_ar, photo_url |
| `courses` | Course metadata | id, slug, title_ar, instructor_id, category_id, level, is_published |
| `chapters` | Course sections | id, course_id, title_ar, sort_order |
| `lessons` | Individual videos | id, chapter_id, course_id, title_ar, vimeo_video_id, duration_sec, is_free_preview |
| `lesson_attachments` | Downloadable files | id, lesson_id, file_url, name_ar |
| `subscriptions` | User plan state | id, user_id, plan, status, current_period_end |
| `payments` | Transaction log | id, user_id, amount_cents, currency, status, gateway, gateway_ref |
| `coupons` | Promo codes | id, code, type, value, max_uses, expires_at |
| `progress` | Lesson completion | id, user_id, lesson_id, is_completed, watched_seconds |
| `quizzes` | Per-chapter tests | id, chapter_id, pass_threshold |
| `quiz_questions` | Test items | id, quiz_id, question_ar, type |
| `quiz_options` | MCQ options | id, question_id, text_ar, is_correct |
| `quiz_attempts` | User attempts | id, user_id, quiz_id, score, passed |
| `certificates` | Course completions | id, user_id, course_id, issued_at, pdf_url |
| `admin_audit_log` | Admin actions | id, user_id, action, path, ip, user_agent |

### 9.2 New Tables (V1.0+)

- `bookmarks` — saved courses
- `lesson_notes` — student notes per lesson
- `reviews` — course ratings + reviews
- `notifications` — in-app notification queue
- `email_subscriptions` — newsletter, "ذكاء لايف" interest
- `referrals` — referral program tracking
- `affiliate_payouts` — instructor revenue share

### 9.3 Key Indexes

- `courses(slug)` UNIQUE
- `courses(is_published, sort_order)` for catalog
- `lessons(chapter_id, sort_order)` for lesson nav
- `progress(user_id, lesson_id)` UNIQUE
- `subscriptions(user_id, status)` for paywall checks
- `payments(user_id, created_at DESC)` for history

### 9.4 Row-Level Security (RLS)

All tables have RLS enabled. Key policies:

- `profiles`: users can read/update own; admins can read/update all
- `courses`: anyone can read published; only admins can write
- `lessons`: free previews readable by anyone; non-previews require active subscription
- `progress`: users can read/write own only
- `payments`: users can read own only; admins can read all
- `admin_audit_log`: admins can read; no API writes (service-role only)

---

## 10. Pricing & Monetization

### 10.1 Pricing Philosophy

- **Anchor in USD** — but display localized (EGP, SAR, AED)
- **Annual discount** — 33% off (industry norm)
- **No "premium tiers"** for MVP — keep decision simple
- **No price wars** with Almentor/Rwaq — undercut by 60%+ and differentiate on quality

### 10.2 MVP Pricing

| Plan | USD | EGP | SAR | Stripe Product ID |
|---|---|---|---|---|
| Monthly | $5 | 250 | 19 | `price_monthly_v1` |
| Annual | $40 | 2,000 | 150 | `price_annual_v1` |

### 10.3 Revenue Projections (Year 1)

| Month | Total Subs | MRR | Cumulative Revenue |
|---|---|---|---|
| M1 | 30 | $150 | $150 |
| M2 | 80 | $400 | $550 |
| M3 | 150 | $750 | $1,300 |
| M4 | 300 | $1,500 | $2,800 |
| M5 | 500 | $2,500 | $5,300 |
| M6 | 750 | $3,750 | $9,050 |
| M9 | 2,000 | $10,000 | ~$35,000 |
| M12 | 5,000 | $25,000 | ~$120,000 |

### 10.4 Unit Economics

| Metric | Value |
|---|---|
| Avg subscription length | 6 months |
| LTV (avg subscriber) | $30 |
| CAC target (paid acquisition) | ≤ $10 |
| LTV/CAC ratio target | ≥ 3.0 |
| Gross margin per sub | 70% (after Vimeo, Supabase, payment fees) |
| Payback period | < 2 months |

### 10.5 Cost Structure (MVP)

| Cost | Monthly @ 1k subs | Monthly @ 10k subs |
|---|---|---|
| Vercel Pro | $20 | $20 |
| Supabase Pro | $25 | $25 |
| Vimeo Premium | $75 | $75 |
| Paymob fees | ~$120 | ~$1,200 |
| Email (Resend) | $20 | $80 |
| Domain + Cloudflare | $5 | $5 |
| **Total** | **~$265** | **~$1,405** |

At 1k subs: Revenue $5,000 — Costs $265 — **Gross profit $4,735** (94.7% margin before content/marketing).

---

## 11. Security & Compliance

### 11.1 Authentication Security
- Passwords: bcrypt hashed (Supabase default)
- Min password length: 8 chars
- Rate limiting on login: 5 attempts / 15 min / IP
- Session: 30-day expiry, refresh tokens rotated
- 2FA: V1.5 (TOTP via Supabase)

### 11.2 Admin Panel Security
- Role check at middleware + page level (defense in depth)
- All actions logged to `admin_audit_log`
- No admin link in public UI
- `X-Robots-Tag: noindex` on all admin pages
- `robots.txt` disallows `/admin/*`
- **Phase 2**: Subdomain isolation (`admin.faahm.com`) + Cloudflare Access (2FA + IP whitelist)

### 11.3 Payment Security
- PCI compliance: outsourced to Paymob (SAQ-A scope)
- Card data: NEVER touches our servers
- Webhooks: HMAC signature verified
- Refund authorization: admin-only

### 11.4 Video Content Protection
- Vimeo domain-restricted embed (only `faahm.com` can play)
- No direct download links
- Watermark with user email overlaid on player (Phase 2 deterrent)
- Concurrent stream limit: 2 devices (Phase 3)

### 11.5 Data Privacy
- Compliant with: Egyptian Data Protection Law (Law 151/2020), GDPR (best-effort)
- User data deletion: self-serve from settings + admin override
- Data export: JSON download of all user data on request
- Cookies: only essential + opt-in for analytics
- Third-party data sharing: NONE (except payment processors)

### 11.6 Application Security
- HTTPS only (HSTS)
- CSP headers
- SQL injection: parametrized queries (Supabase client + RLS)
- XSS: React auto-escapes; no `dangerouslySetInnerHTML` except sanitized
- CSRF: SameSite=Lax cookies + state tokens on payment
- Secrets in Vercel env vars (encrypted at rest)
- Regular `npm audit` + Dependabot

### 11.7 Backup & Disaster Recovery
- Supabase: daily backups (7-day retention) + PITR for last 7 days
- Vercel: instant rollback to any prior deployment
- Vimeo: original video files retained
- Recovery time objective (RTO): 1 hour
- Recovery point objective (RPO): 24 hours

---

## 12. Integrations

| Integration | Purpose | Phase |
|---|---|---|
| **Paymob** | Egyptian payments | MVP |
| **Vimeo** | Video hosting | MVP |
| **Resend / SES** | Transactional email | MVP |
| **Cloudflare** | DNS, CDN, DDoS | MVP |
| **PostHog** | Product analytics | MVP |
| **Sentry** | Error monitoring | MVP |
| **Stripe** | International payments | V1.0 |
| **Google Analytics** | Marketing analytics | V1.0 |
| **WhatsApp Business** | Notifications, support | V1.0 |
| **Slack** | Internal alerts | MVP |
| **Zapier / n8n** | Marketing automation | V1.0 |
| **HeyGen** | AI avatar video production | V1.0 |
| **ElevenLabs** | AI voice for course audio | V1.0 |
| **OpenAI / Anthropic** | ذكاء لايف live AI tutor | V1.5 |

---

## 13. Content & SEO

### 13.1 Content Production Pipeline

```
Topic research (AI-assisted) → Script (AI-drafted, human-reviewed)
  → Voice (ElevenLabs Arabic OR human instructor)
  → Visuals (HeyGen avatar OR screen recording)
  → Editing (CapCut / DaVinci with templates)
  → Upload to Vimeo (private, domain-locked)
  → Add to platform via admin
```

Target: **3 courses / month** in MVP, scaling to **10/month** by V1.5.

### 13.2 Course Quality Standards
- Minimum length: 1 hour total
- Maximum lesson length: 12 minutes (mobile-friendly)
- Required: Arabic captions on every lesson
- Required: At least 1 free preview lesson per course
- Required: Course description + learning outcomes
- Required: Downloadable resources (template, code, PDF)

### 13.3 SEO Strategy

#### Technical SEO
- Sitemap.xml (auto-generated from courses)
- Robots.txt (admin paths disallowed)
- Meta tags per course (title, description, OG image)
- Schema.org markup: `Course`, `Person` (instructor), `Organization`
- Server-rendered course pages (RSC)
- Image optimization (Next.js `<Image>`)
- 95+ Lighthouse score

#### Content SEO (V1.0)
- Blog at `/learn` — Arabic articles around target keywords
- Target keywords (estimated monthly volume):
  - "كورسات الذكاء الاصطناعي" — 12,000
  - "تعلم n8n" — 2,400
  - "ChatGPT بالعربي" — 8,100
  - "أدوات ذكاء اصطناعي" — 9,900
- Instructor profile pages = additional SEO surface area

---

## 14. Analytics & Observability

### 14.1 Product Analytics (PostHog)

#### Events to Track
- `signup_started`, `signup_completed`
- `email_confirmed`
- `pricing_viewed`, `checkout_started`, `payment_succeeded`, `payment_failed`
- `course_viewed`, `lesson_started`, `lesson_completed`
- `quiz_started`, `quiz_passed`, `quiz_failed`
- `certificate_earned`
- `subscription_cancelled`
- `search_performed`, `filter_applied`

#### Funnels
- Acquisition: visit → signup → paid
- Activation: signup → first lesson completed
- Engagement: weekly active learners
- Retention: cohort-based, monthly

#### Dashboards
- North star: Weekly Active Learners
- Revenue: MRR, ARR, ARPU, LTV
- Acquisition: Signups by source, CAC by channel
- Content: Most-watched courses, completion rates

### 14.2 Error Monitoring (Sentry)
- Frontend errors: tracked per release
- API errors: tracked per route
- Alert thresholds: 10 errors / 5 min triggers Slack notification
- Source maps uploaded per deploy

### 14.3 Logs (Vercel + Supabase)
- Vercel: All API + edge function logs (7-day retention free tier)
- Supabase: Postgres + Auth + Storage logs
- Long-term storage: BetterStack or Logflare (V1.0)

### 14.4 Uptime Monitoring
- Tool: BetterStack or UptimeRobot
- Endpoints monitored: `/`, `/api/health`, `/dashboard`
- Alert: ≥1 min downtime → SMS + Slack
- Public status page: `status.faahm.com` (V1.0)

---

## 15. Localization & Accessibility

### 15.1 Languages
- **MVP**: Egyptian Arabic only (UI, copy, course content)
- **V1.0**: Modern Standard Arabic option + Gulf dialect (course content tagging)
- **V1.5**: English UI option (course content stays Arabic)

### 15.2 RTL Support
- Full RTL layout via `dir="rtl"`
- Tailwind logical properties (`ps-4` instead of `pl-4`)
- Icons mirrored where directional
- Forms: input direction inherits, but emails/URLs `dir="ltr"`

### 15.3 Accessibility (WCAG 2.1 AA target)
- Keyboard navigation on all interactive elements
- Focus indicators visible
- Color contrast ≥ 4.5:1 for body text
- Alt text on all images
- Semantic HTML (proper heading hierarchy)
- ARIA labels where needed
- Screen reader testing (NVDA on Windows, VoiceOver on Mac)
- Caption tracks on all videos (Vimeo handles this)

---

## 16. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| **Paymob integration issues** | Medium | High | Build Paymob webhook handler early; test with sandbox; have Stripe as fallback |
| **Content production can't keep pace** | High | High | Use AI tools heavily; hire 1 part-time editor by M3 |
| **Subscriber churn > 10%** | Medium | High | Weekly retention emails; surface "what's new"; price-anchor with annual plan |
| **Video piracy** | Medium | Medium | Domain-restricted Vimeo; watermarking V1.0; DMCA monitoring V1.0 |
| **Egyptian forex restrictions** | Low | High | Multi-currency pricing; Paymob handles EGP→USD conversion |
| **Competitor launches similar product** | High | Medium | Move fast; differentiate on AI-native + ذكاء لايف; build community moat |
| **Supabase rate limits** | Low | Medium | Edge caching, monitor usage, upgrade plan as needed |
| **Vercel function timeout (10s on free)** | Low | Low | Use Edge Functions for long-running tasks; upgrade to Pro |
| **Account takeover** | Medium | High | 2FA in V1.5; suspicious-login detection; password reset rate limits |
| **GDPR/data law violations** | Low | High | Engage lawyer for ToS/Privacy review; build data export/delete flows |

---

## 17. Open Questions

### 17.1 Business
1. Will we accept B2B contracts before V1.5 if a big customer asks?
2. What's our policy on refunds beyond the 7-day window?
3. Do we want to be acquisition-ready or independent-bootstrapped?

### 17.2 Product
1. Should we have a free tier with limited courses, or only previews? (Recommend: previews only — clearer revenue signal)
2. How do we handle students who want certificates without watching all videos?
3. Mobile app: when does it become urgent? (Recommend: only after 5k MAU on web)
4. Should "ذكاء لايف" be premium-tier-only or included for all subs?

### 17.3 Technical
1. When do we move to Hetzner self-hosting? (Recommend: never, unless Vercel costs exceed $500/mo)
2. Should we adopt monorepo (web + admin + mobile)? (Recommend: yes by V1.5)
3. Search: stick with Postgres FTS or move to Typesense? (Recommend: Typesense by V1.0)
4. Real-time features (ذكاء لايف): Supabase Realtime or external (Pusher)?

---

## 18. Appendices

### Appendix A: Glossary

| Term | Definition |
|---|---|
| **WAL** | Weekly Active Learners |
| **MRR / ARR** | Monthly / Annual Recurring Revenue |
| **CAC** | Customer Acquisition Cost |
| **LTV** | Lifetime Value |
| **RLS** | Row-Level Security (Postgres) |
| **RSC** | React Server Components |
| **PITR** | Point-In-Time Recovery |
| **FTS** | Full-Text Search |
| **ذكاء لايف** | AI-powered live tutor sessions (proprietary feature) |

### Appendix B: References

- [Supabase Documentation](https://supabase.com/docs)
- [Next.js App Router Docs](https://nextjs.org/docs/app)
- [Paymob Developer Portal](https://docs.paymob.com)
- [Vimeo API Documentation](https://developer.vimeo.com)
- Competitor analysis: Almentor, Rwaq, Edraak, Coursera Plus, Udemy Business

### Appendix C: Change Log

| Version | Date | Author | Changes |
|---|---|---|---|
| 1.0 | May 2026 | Ibrahim | Initial draft |

### Appendix D: Approval

| Role | Name | Signature | Date |
|---|---|---|---|
| Product Owner | Ibrahim | | |
| Engineering Lead | TBD | | |
| Design Lead | TBD | | |
| Business Stakeholder | TBD | | |

---

**End of Document**
