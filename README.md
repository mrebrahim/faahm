# 🎓 فاهم! — Faahm Learning Platform

> منصة تعليمية بالاشتراك للمحتوى العربي
> $5/شهر • $40/سنة • Stripe + Vimeo + Supabase

## 🚀 Quick Start

```bash
# 1. Clone & install
git clone https://github.com/mrebrahim/faahm.git
cd faahm
npm install

# 2. Setup environment
cp .env.example .env.local
# Edit .env.local with your actual keys

# 3. Run
npm run dev
# Open http://localhost:3000
```

---

## 🗄️ Database

The Supabase database is **already set up** with the complete schema:
- **Project**: `jnxtcpicctcnmirjorje`
- **Region**: Frankfurt (eu-central-1)
- **Tables**: 16 (profiles, courses, lessons, subscriptions, quizzes, certificates...)
- **Security**: RLS enabled on all tables

Migrations applied:
1. `01_extensions_and_enums`
2. `02_core_tables`
3. `03_course_content_tables`
4. `04_commerce_tables`
5. `05_engagement_tables`
6. `06_triggers_and_functions`
7. `07_rls_policies`
8. `08_seed_and_views`
9. `09_security_hardening`

To re-create from scratch: run `supabase/schema.sql` in SQL Editor.

---

## 📁 Project Structure

```
faahm/
├── app/                      # Next.js App Router
│   ├── layout.tsx           # Root layout (RTL + Arabic fonts)
│   ├── page.tsx             # Landing page
│   ├── globals.css
│   └── (auth)/              # Login / signup pages
│
├── components/
│   ├── ui/                  # Reusable UI primitives
│   └── shared/              # Header, footer, etc
│
├── lib/
│   ├── supabase/
│   │   ├── client.ts        # Browser client
│   │   ├── server.ts        # Server Component client
│   │   └── middleware.ts    # Session refresh
│   ├── utils.ts             # cn, formatDuration, getVimeoEmbedUrl
│   └── constants.ts         # Plans, routes, app config
│
├── supabase/
│   └── schema.sql           # Full DB schema (already deployed)
│
├── docs/
│   └── ARCHITECTURE.md      # Full system architecture
│
├── middleware.ts            # Auth + route protection
├── next.config.js
├── tailwind.config.ts       # Brand colors & theme
└── tsconfig.json
```

---

## 🎨 Brand

| Color | Hex |
|-------|-----|
| Primary Green | `#22C55E` |
| Deep Black | `#0A0A0A` |
| Card Dark | `#27272A` |

Fonts: **Cairo** (body) + **Tajawal** (display)

---

## 🛠️ Stack

- **Framework**: Next.js 14 (App Router, TypeScript)
- **Database**: Supabase (PostgreSQL + Auth + RLS)
- **Styling**: Tailwind CSS
- **UI**: shadcn-style components
- **Payments**: Stripe (primary) + Paymob (backup)
- **Video**: Vimeo (embedded, domain-restricted)
- **Storage**: Cloudflare R2
- **Hosting**: Vercel

---

## 📝 License

Proprietary — © 2026 فاهم
