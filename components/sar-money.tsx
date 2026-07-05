/**
 * Currency renderer. Historically this rendered SAR with the
 * official 2025 Saudi Riyal SVG glyph. The site has since moved to
 * USD pricing across every surface, so the component now emits a
 * plain `$X` (dir=ltr) instead. The name is kept because every
 * pricing page + the marketing pages already import it — swapping
 * the internals here means the callers didn't have to change.
 *
 * `symbolClassName` and other props are accepted-and-ignored so
 * old JSX (`<SARMoney value={40} symbolClassName="w-4 h-4" />`)
 * keeps compiling.
 */
export function SARMoney({
  value,
  className = '',
}: {
  value: number | string;
  /** Kept for backwards compatibility — no-op now that the SAR
   *  glyph is gone. */
  symbolClassName?: string;
  className?: string;
}) {
  return (
    <span dir="ltr" className={`inline-flex items-baseline ${className}`}>
      <span className="opacity-90">$</span>
      <span>{value}</span>
    </span>
  );
}
