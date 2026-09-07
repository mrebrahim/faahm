-- ============================================================================
-- Grandfather existing yearly subscribers into the premium courses
-- ============================================================================
-- STATUS: APPLIED to production on 2026-09-07.
--   77 enrollment rows inserted, 11 existing rows extended.
--   Verified afterwards: 183/183 (61 subscribers × 3 courses) open, 0 locked.
-- Kept in the repo as the record of what ran. It is idempotent, so re-running
-- it is safe and will report zero changes.
--
-- WHY THIS EXISTS
-- ---------------
-- `courses.yearly_only = true` used to mean "included with the yearly plan".
-- It now means "sold separately — no plan covers it", and lib/access.ts opens
-- those courses ONLY on an `enrollments` row.
--
-- The agreed policy for people who were already paying: they keep access for
-- the subscription they already bought, and lose it at renewal. That is
-- encoded as an enrollment whose expires_at is their current period end — no
-- special case in the app, and the lock happens by itself on the right date.
--
-- ⚠️ LESSON LEARNED — READ BEFORE SHIPPING ANYTHING LIKE THIS AGAIN
-- The deploy that flipped the access rule went out BEFORE this script ran, so
-- for a period every yearly subscriber was locked out of three courses they
-- had paid for. The ordering was documented but nothing enforced it.
--
-- An access change whose safe state depends on a human remembering to run a
-- script is a broken design. Either run the backfill FIRST (these rows are
-- inert under the old code — they grant access that the old rules already
-- granted), or put the grandfathering in the application code so no manual
-- step exists at all. Do not rely on a note in a commit message.
--
-- Monthly subscribers are deliberately excluded: `yearly_only` already
-- blocked them, so they are losing nothing.
--
-- SAFETY
-- ------
--   * ON CONFLICT DO NOTHING — never overwrites an existing row, so anyone
--     who actually BOUGHT a course (expires_at = null, permanent) keeps their
--     permanent grant instead of being downgraded to an expiring one.
--   * STEP 3 handles the case ON CONFLICT silently skips: a subscriber whose
--     existing grant (an old coupon, say) expires BEFORE their subscription
--     does. Without it, 11 people would have been locked out early.
--   * `source = 'compensation'` — an allowed value in enrollments_source_check.
-- ============================================================================


-- ── STEP 1: dry run ─────────────────────────────────────────────────────────
-- Read this BEFORE writing anything.

select
  p.email,
  s.plan,
  s.status,
  s.current_period_end as keeps_access_until
from subscriptions s
join profiles p on p.id = s.user_id
where s.plan = 'yearly'
  and s.status in ('active', 'trialing')
  and s.current_period_end > now()
order by s.current_period_end;

-- Sanity check: all three slugs must come back, and all be flagged.
-- A missing slug here means the insert below would silently skip that course.
select slug, title_ar, yearly_only, is_free
from courses
where slug in ('n8n', 'ai-video', 'vibe-coding');


-- ── STEP 2: grant what's missing ────────────────────────────────────────────

with grandfathered as (
  -- One row per user carrying their LATEST period end. Someone with more
  -- than one subscription row keeps access until the last of them lapses.
  select s.user_id, max(s.current_period_end) as access_until
  from subscriptions s
  where s.plan = 'yearly'
    and s.status in ('active', 'trialing')
    and s.current_period_end > now()
  group by s.user_id
),
premium as (
  select id, slug from courses where slug in ('n8n', 'ai-video', 'vibe-coding')
)
insert into enrollments (user_id, course_id, expires_at, source, notes)
select
  g.user_id,
  c.id,
  g.access_until,
  'compensation',
  'Grandfathered - yearly subscriber when premium courses moved to one-off pricing (2026-09-06)'
from grandfathered g
cross join premium c
on conflict (user_id, course_id) do nothing;


-- ── STEP 3: extend grants that would expire too early ───────────────────────
-- STEP 2 skips anyone who already has a row. Some of those rows came from
-- old coupons and expire before the subscription does — which would lock a
-- paying subscriber out early. Push those out to the subscription's end.
-- Permanent grants (expires_at is null) are left alone.

with grandfathered as (
  select s.user_id, max(s.current_period_end) as access_until
  from subscriptions s
  where s.plan = 'yearly'
    and s.status in ('active', 'trialing')
    and s.current_period_end > now()
  group by s.user_id
),
premium as (
  select id from courses where slug in ('n8n', 'ai-video', 'vibe-coding')
)
update enrollments e
set expires_at = g.access_until,
    notes = coalesce(e.notes, '') || ' | extended to subscription end (2026-09-06)'
from grandfathered g, premium c
where e.user_id = g.user_id
  and e.course_id = c.id
  and e.expires_at is not null
  and e.expires_at < g.access_until;


-- ── STEP 4: verify ──────────────────────────────────────────────────────────
-- `still_locked` MUST be 0. Anything else means someone who paid cannot
-- open a course they paid for.

with grandfathered as (
  select s.user_id, max(s.current_period_end) as access_until
  from subscriptions s
  where s.plan = 'yearly'
    and s.status in ('active', 'trialing')
    and s.current_period_end > now()
  group by s.user_id
),
premium as (
  select id, slug from courses where slug in ('n8n', 'ai-video', 'vibe-coding')
)
select
  count(distinct g.user_id) as yearly_subscribers,
  count(*) as pairs_expected,
  count(*) filter (
    where e.id is not null and (e.expires_at is null or e.expires_at > now())
  ) as pairs_open_now,
  count(*) filter (
    where e.id is null or (e.expires_at is not null and e.expires_at <= now())
  ) as still_locked
from grandfathered g
cross join premium c
left join enrollments e on e.user_id = g.user_id and e.course_id = c.id;


-- ── ROLLBACK ────────────────────────────────────────────────────────────────
-- Undoes STEP 2 only. Matches on source + notes so it can never touch a real
-- purchase (source = 'purchase', expires_at = null).
--
-- delete from enrollments
-- where source = 'compensation'
--   and notes like 'Grandfathered - yearly subscriber%';
