# فاهم! — Engineering notes for Claude

Most of the audience visits on mid-range Android phones over patchy 3G/4G.
Mobile is the **default** target, not an afterthought. Desktop layouts are
the enhancement.

## Mobile-first is a hard rule

Every page, dialog, and component must be usable on a 360px-wide viewport.
Before considering UI work done, mentally (or actually) check the layout at
phone width. The following patterns are required:

- **Single-column by default**. Use `grid-cols-1` / `flex-col` as the base
  and add `sm:`, `md:`, `lg:` only to widen layouts. Never start with a
  multi-column grid and then try to collapse it.
- **Type that scales**. Headings start small and scale up:
  `text-2xl sm:text-3xl md:text-5xl`, not `text-5xl` with a mobile
  override. Same for emojis/score numbers — `text-5xl sm:text-7xl`.
- **Padding that scales**. Containers start tight and breathe on larger
  screens: `p-4 sm:p-6` / `py-6 sm:py-10`. Never use `p-10` on a card
  without a smaller mobile fallback.
- **No fixed widths**. Don't write `w-[480px]` on layout containers. Use
  `max-w-*` so the element shrinks below its max.
- **Long horizontal rows scroll, not wrap**. Filter chips, tab bars,
  category strips: use `-mx-4 px-4 overflow-x-auto md:flex-wrap md:mx-0`.
  Chips inside need `flex-shrink-0 whitespace-nowrap`.
- **Two-column hero blocks reorder on mobile**. The visual hook
  (image, trailer, illustration) goes FIRST on mobile via `order-1
  lg:order-2`, the meta/CTA block goes SECOND via `order-2 lg:order-1`.
- **Long lists in sidebars get a max-height on mobile**. A 30-item course
  outline must not dump as a single 4000px block below the player. Cap
  with `max-h-[60vh] overflow-y-auto` on mobile and undo on `lg:`.
- **Buttons full-width on mobile, auto on desktop**:
  `w-full sm:w-auto`. CTA stacks: `flex flex-col sm:flex-row gap-3`.
- **Min-w-0 + truncate** on any flex/grid child that holds dynamic text
  inside a constrained parent, otherwise long Arabic strings break the
  layout.
- **RTL safety**. Use `start`/`end` logical sides (`ms-2`, `pe-4`,
  `text-start`) instead of `left`/`right` wherever possible — the whole
  site is `dir="rtl"`.
- **Nothing escapes the viewport horizontally**. `globals.css` clips
  `html` + `body` with `overflow-x: clip; max-width: 100vw;` as a
  safety net, but don't rely on it — any new decorative orb,
  off-canvas drawer, wide table, or animated background must live
  inside a `relative overflow-hidden` (or `overflow-clip`) parent so
  positioning math can't leak past the page edge. Test at 360px and
  side-scroll: there should be zero side-scroll on any page.
- **Wide tables wrap in `overflow-x-auto`**. Admin tables and any
  multi-column data view sit inside a `<div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">`
  on mobile so the table itself scrolls, not the whole page.

When introducing a new page or section: run through this checklist
before commit. When fixing a layout, fix it for 360px first and let the
desktop layout fall out of the responsive variants.

## Other house rules

- Server actions / route handlers that issue redirects must use
  `resolveAppUrl()` from `@/lib/app-url` — never
  `new URL(path, request.url)` (leaks `localhost` behind Coolify/Traefik).
- New tables / enum values should use
  `mcp__dd38b21b-…__apply_migration` so the change is recorded.
- All copy is Egyptian Arabic. Keep it warm and direct ("يلا نبدأ" not
  "هيا بنا نبدأ").
