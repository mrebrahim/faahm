# Pricing — the whole price list in one place

Last changed: 2026-09-19 (subscriptions retired; the site is a one-off course shop).

## What is sold

| Product | Price | EGP rail | Access |
|---|---|---|---|
| n8n | $60 | 3,000 ج.م | **Permanent** |
| AI Video Master | $60 | 3,000 ج.م | **Permanent** |
| Vibe Coding | $60 | 3,000 ج.م | **Permanent** |
| AI Bundle (all three) | $99 | 5,000 ج.م | **Permanent** |

| AI Lab — monthly | $40/mo | 2,000 ج.م | Renews monthly |
| AI Lab — yearly | $199/yr | 10,000 ج.م | Renews yearly |

**Courses never recur. AI Lab does.** The old $10/$40 platform plans were
retired on 2026-09-19 and are not coming back: a course is bought once and
kept forever. AI Lab is the deliberate exception added on 2026-09-26 — a
cohort programme with weekly live sessions is an ongoing service, and
charging once while delivering forever doesn't work. Nothing else should
grow an `interval`.

Egypt pays the SAME price as everyone else. The EGP figures are a straight
conversion at the table's standing 50 ج.م/$, not a discount — they exist only
because you cannot send dollars over InstaPay. InstaPay is yearly-only; a
manual monthly transfer would mean reviewing a screenshot twelve times a year.

AI Lab access is one lookup — `ai_lab_members.expires_at > now()`. The Stripe
subscription pushes its period end into that row on every renewal webhook, so
a cancelled or lapsed card stops access on exactly the date it should, with no
cron and no second code path. A capped `founding` tier ($99, one-off year)
exists in the catalogue but is parked — put it back in `AI_LAB_PUBLIC_TIERS`
to run a launch offer.

The bundle anchor ($180) is real arithmetic — 3 × $60 — not an invented list
price, so "you save $81" survives a sceptical reading.

## Where the numbers live

`lib/catalog.ts` is the single source of truth. Every marketing surface
imports from it — no page hard-codes a price, so a change is one edit and
cannot drift from what Stripe charges.

The one exception is the EGP table, which is deliberately a fixed charm-priced
list rather than a live FX conversion: an admin reconciles a WhatsApp payment
screenshot against it, and a rate that moves daily makes that impossible.
`app/offline/egp/page.tsx` and `app/api/mobile/pricing/route.ts` must always
agree — a mismatch between web and app is a support ticket every time.

`lib/promo.ts` no longer carries a price. It is just the rolling monthly
countdown deadline the landing page shows.

## How access is decided

`lib/access.ts → canAccessCourse()` in three rules, in order:

1. `courses.is_free` → open to anyone signed in.
2. `courses.yearly_only` → open **only** on an `enrollments` row.
3. Otherwise → open on any live subscription (legacy holders only).

### The `yearly_only` column name is a lie

It used to mean "included with the yearly plan". It now means **"sold
separately"**. Renaming the column would need a migration plus a coordinated
deploy for zero behavioural gain, so the column stayed and every TypeScript
surface calls it `soldSeparately`. If you are reading the DB directly, that is
what the flag means. All three published courses carry it.

### Everything grants through `enrollments`

A purchase, a coupon redemption, an admin hand-grant and the grandfather
backfill all write the same row. There is exactly one way into a course, which
is why there is no second code path to keep in sync.

`expires_at = null` means permanent — that is what a purchase writes.

## Purchase flow

```
/api/checkout/course?product=<id>
    → Stripe Checkout Session (mode=payment, inline price_data)
    → /purchase/success?session_id=…   ─┐
                                        ├─ both call fulfilCoursePurchaseSession()
    → webhook checkout.session.completed┘
    → grantCoursePurchase()  → enrollments + payments + receipt email
```

Nothing is configured in the Stripe dashboard. The session is built with
inline `price_data` from `lib/catalog.ts`, so there are no products, prices or
payment links to keep in sync.

Fulfilment runs from **both** the webhook and the success page on purpose. The
webhook is the reliable path; the success page is the fast one, and it means a
misconfigured webhook secret degrades to "access on redirect" rather than
"customer paid and got nothing". Both running is safe — the enrollment upsert
converges and the payments row is deduped on the Stripe session id.

### Egypt / manual payments

The buyer pays on `/offline/egp?product=<id>` and sends a screenshot on
WhatsApp. An admin then grants access from **/admin/students/[id] →
Enrollments**, which writes the same permanent `enrollments` row. Note this
path does *not* write a `payments` row, so manual sales don't appear in
/admin/revenue — record those separately if the number matters.

## Legacy subscribers

~61 people bought a yearly plan before it was retired. They keep working:

* `canAccessCourse` still honours a live subscription (rule 3).
* They hold `enrollments` rows for the three courses, expiring at their
  `current_period_end` — written by
  `supabase/2026-09-06-grandfather-premium-courses.sql`.
* `/settings` and `/api/billing/portal` still let them cancel.
* The Stripe webhook still processes their renewals and cancellations, which
  is why `planFromPriceId` and the `STRIPE_PRICE_ID_*` env vars stay.

Nothing sells them a renewal. When their period ends, they lose the three
courses unless someone decides to make those grants permanent.

## Retired routes

Kept as redirects so old ads, emails and WhatsApp links don't 404:

| Route | Goes to |
|---|---|
| `/checkout`, `/api/checkout` | `/pricing` |
| `/personal-plan` | `/` |

Deleted outright: `/checkout/paypal`, `/offline/barq`, `lib/paypal.ts`,
`lib/region.ts`, `components/promo-banner.tsx`, `components/personal-plan-quiz.tsx`.

## The front door

`/` and `/ai-bundle` render the same component
(`components/ai-bundle-landing.tsx`). The bundle funnel is the home page; the
old URL keeps working for every ad already pointing at it, and its metadata
sets `/` as canonical so the two don't compete in search.

Course cards on that page link to the course pages, so a visitor can read the
whole syllabus and play the free previews before spending $60.

## The community

Gated on **course ownership**, not a plan — it used to be a yearly-plan perk,
which after the retirement would have sealed it shut for everyone new. The SQL
function is still named `has_yearly_subscription` because RLS policies call it
by name; the rule inside is "owns a live enrollment, or holds a legacy
subscription".

## The mobile app

iOS runs in **reader mode** (`mobile/src/lib/store-policy.ts`): App Store
guideline 3.1.3(a) forbids any call to action pointing at an outside purchase,
so the iOS build shows that a course is locked and says nothing about price or
where to buy. Android may show the price and a WhatsApp buy button.

Every purchase CTA in the app must stay behind `CAN_SHOW_PURCHASE_CTA`.
