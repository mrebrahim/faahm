-- ============================================================================
-- Grandfather existing yearly subscribers into the premium courses
-- ============================================================================
-- Run ONCE, in the Supabase SQL Editor, at the same time as the deploy that
-- moves n8n / ai-video / vibe-coding to one-off pricing ($60 each, $99 for
-- the bundle).
--
-- WHY THIS EXISTS
-- ---------------
-- Until this change, `courses.yearly_only = true` meant "included with the
-- yearly plan". It now means "sold separately — no plan covers it", and
-- lib/access.ts opens those courses ONLY on an `enrollments` row.
--
-- Without this script, every current yearly subscriber loses access to three
-- courses the moment the deploy lands. The agreed policy is: they keep access
-- for the subscription they already paid for, and lose it at renewal. This
-- script encodes exactly that by writing an enrollment that EXPIRES at their
-- current period end — no special-case code in the app, and the lock happens
-- by itself on the right date.
--
-- Monthly subscribers are deliberately excluded: `yearly_only` already
-- blocked them, so they are losing nothing.
--
-- SAFETY
-- ------
--   * ON CONFLICT DO NOTHING — never touches an existing row, so anyone who
--     actually BOUGHT a course (expires_at = null, permanent) keeps their
--     permanent grant instead of being downgraded to an expiring one.
--   * Idempotent — running it twice changes nothing the second time.
--   * `source = 'manual'` because that value is already in use by the admin
--     tools and is therefore known to pass any CHECK constraint on the
--     column. The real story is in `notes`.
-- ============================================================================


-- ── STEP 1: dry run ─────────────────────────────────────────────────────────
-- Read this BEFORE inserting anything. It shows who is about to be
-- grandfathered and until when.

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

-- How many grants this will create (expect: subscribers × 3 courses,
-- minus anyone who already has an enrollment row).
select
  count(*) as subscribers,
  count(*) * 3 as enrollment_rows_at_most
from subscriptions s
where s.plan = 'yearly'
  and s.status in ('active', 'trialing')
  and s.current_period_end > now();

-- Sanity check: these three slugs must all come back, and all be flagged.
-- If a slug is missing here, FIX IT before running step 2 — the insert
-- would silently skip that course.
select slug, title_ar, yearly_only, is_free
from courses
where slug in ('n8n', 'ai-video', 'vibe-coding');


-- ── STEP 2: apply ───────────────────────────────────────────────────────────
-- Run this only once the dry run above looks right.

with grandfathered as (
  -- One row per user, carrying their LATEST period end. A user with more
  -- than one subscription row should keep access until the last of them
  -- lapses, not the first.
  select
    s.user_id,
    max(s.current_period_end) as access_until
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
  'manual',
  'Grandfathered — yearly subscriber when premium courses moved to one-off pricing (2026-09-06)'
from grandfathered g
cross join premium c
on conflict (user_id, course_id) do nothing;


-- ── STEP 3: verify ──────────────────────────────────────────────────────────

select
  c.slug,
  count(*) filter (where e.expires_at is null)     as permanent_grants,
  count(*) filter (where e.expires_at is not null) as grandfathered_grants
from enrollments e
join courses c on c.id = e.course_id
where c.slug in ('n8n', 'ai-video', 'vibe-coding')
group by c.slug
order by c.slug;

-- Spot-check one subscriber end to end: they should have three rows, each
-- expiring on their subscription's period end.
-- select p.email, c.slug, e.expires_at
-- from enrollments e
-- join courses c on c.id = e.course_id
-- join profiles p on p.id = e.user_id
-- where p.email = 'PUT_A_REAL_SUBSCRIBER_EMAIL_HERE'
--   and c.slug in ('n8n', 'ai-video', 'vibe-coding');


-- ── ROLLBACK ────────────────────────────────────────────────────────────────
-- Undoes step 2 only. Matches on the notes string so it can never delete a
-- real purchase (those have expires_at = null and different notes).
--
-- delete from enrollments
-- where expires_at is not null
--   and notes like 'Grandfathered — yearly subscriber%';
