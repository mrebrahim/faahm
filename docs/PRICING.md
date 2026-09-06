# Pricing — the whole price list in one place

Last changed: 2026-09-06 (premium courses moved out of the subscription).

## What is sold

| Product | Price | EGP rail | What it opens | Duration |
|---|---|---|---|---|
| Monthly subscription | $10 | 500 ج.م | The general catalogue | Renews monthly |
| Yearly subscription | $40 | 2,000 ج.م | The general catalogue + AI assistant + certificates | Renews yearly |
| n8n | $60 | 3,000 ج.م | That course | **Permanent** |
| AI Video Master | $60 | 3,000 ج.م | That course | **Permanent** |
| Vibe Coding | $60 | 3,000 ج.م | That course | **Permanent** |
| AI Bundle | $99 | 5,000 ج.م | All three above | **Permanent** |

**No subscription covers n8n, AI Video or Vibe Coding.** This is the single
rule the whole implementation exists to enforce. A $40/year plan that also
unlocked them would make the $60 and $99 products unsellable, so they sit
outside every plan.

The bundle anchor ($180) is real arithmetic — 3 × $60 — not an invented list
price, so "you save $81" survives a sceptical reading.

## Where the numbers live

`lib/catalog.ts` is the single source of truth for the one-off prices.
`lib/constants.ts` (`PLANS`) and `lib/promo.ts` hold the subscription
figures. Every marketing surface imports from those — no page hard-codes a
price, so a change is one edit and cannot drift from what Stripe charges.

The one exception is the EGP table, which is deliberately a fixed charm-priced
list rather than a live FX conversion: an admin reconciles a WhatsApp payment
screenshot against it, and a rate that moves daily makes that impossible.
`app/offline/egp/page.tsx` and `app/api/mobile/pricing/route.ts` must always
agree — a mismatch between web and app is a support ticket every time.

## How access is decided

`lib/access.ts → canAccessCourse()` in three rules, in order:

1. `courses.is_free` → open to anyone signed in.
2. `courses.yearly_only` → open **only** on an `enrollments` row.
3. Otherwise → open on any live subscription.

### The `yearly_only` column name is a lie

It used to mean "included with the yearly plan". It now means **"sold
separately"**. Renaming the column would need a migration plus a coordinated
deploy for zero behavioural gain, so the column stayed and every TypeScript
surface calls it `soldSeparately`. If you are reading the DB directly, that is
what the flag means.

### Everything grants through `enrollments`

A purchase, a coupon redemption, an admin hand-grant and the grandfather
backfill all write the same row. There is exactly one way into a premium
course, which is why there is no second code path to keep in sync.

`expires_at = null` means permanent — that is what a purchase writes. A
non-null value is a time-boxed grant.

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
payment links to keep in sync — the same approach the dubbing service uses.
(The *subscription* funnel still uses pre-built Payment Links; that is
unchanged.)

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

## Existing subscribers (the 2026-09-06 migration)

Yearly subscribers who had these three courses when the change shipped keep
them **until their current subscription period ends**, then lose them at
renewal. That is encoded as an `enrollments` row whose `expires_at` is their
`current_period_end` — no special-case code, and the lock happens by itself on
the right date.

Run `supabase/2026-09-06-grandfather-premium-courses.sql` once, at deploy time.
It has a dry run, the insert, verification queries and a rollback. It is
idempotent and `ON CONFLICT DO NOTHING`, so it can never downgrade someone who
actually bought a course.

Monthly subscribers are excluded — `yearly_only` already blocked them, so they
lose nothing.

## The mobile app

iOS runs in **reader mode** (`mobile/src/lib/store-policy.ts`): App Store
guideline 3.1.3(a) forbids any call to action pointing at an outside purchase,
so the iOS build shows that a course is locked and says nothing about price or
where to buy. Android may show the price and a WhatsApp buy button.

Every purchase CTA in the app must stay behind `CAN_SHOW_PURCHASE_CTA`.

## Copy rule

Every surface that prices a plan must also say, on the same card, that n8n /
AI Video / Vibe Coding are bought separately. Not in an FAQ — on the card.
A buyer who discovers it after paying asks for a refund; one who reads it at
the point of decision buys the bundle too.

Surfaces currently carrying that line: `/` , `/pricing`, `/personal-plan`,
`/faq`, `/help`, the app's subscribe screen.
