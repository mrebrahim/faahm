import { SARSymbol } from './sar-symbol';

/**
 * Renders a SAR amount with the official 2025 Saudi Riyal symbol next
 * to the number. Keeps the symbol's size in sync with the surrounding
 * text by sizing it as a fraction of the parent's em — pricing cards
 * with `text-5xl` get a big symbol, an inline body sentence gets a
 * small one, no extra props needed.
 *
 * `symbolClassName` lets specific call sites nudge the symbol's size
 * up or down independently of the number (e.g. shrink it a touch on
 * the giant headline price so the digits remain dominant).
 */
export function SARMoney({
  value,
  symbolClassName = 'w-[0.7em] h-[0.7em] mx-0.5',
  className = '',
}: {
  value: number | string;
  symbolClassName?: string;
  className?: string;
}) {
  return (
    <span dir="ltr" className={`inline-flex items-center ${className}`}>
      <span>{value}</span>
      <SARSymbol className={symbolClassName} />
    </span>
  );
}
