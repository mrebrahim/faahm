/**
 * The 2025 Saudi Riyal currency symbol issued by SAMA. We render it
 * as an inline SVG instead of the Unicode codepoint (U+20C0) because
 * font support is still patchy — embedding the glyph guarantees it
 * shows up identically on every browser without waiting for system
 * fonts to catch up.
 *
 * The symbol is currentColor-filled so it inherits whatever text
 * colour its parent uses — no extra props needed for green prices,
 * gray strikethroughs, etc.
 */
export function SARSymbol({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 1124.14 1256.39"
      role="img"
      aria-label="ريال سعودي"
      className={`inline-block fill-current align-[-0.125em] ${className}`}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M699.62 1113.02h0c-20.06 44.48-33.32 92.75-38.4 143.37l424.51-90.24c20.06-44.47 33.31-92.75 38.4-143.37l-424.51 90.24Z" />
      <path d="M1085.73 895.8c20.06-44.48 33.32-92.75 38.4-143.37l-330.68 70.33v-135.2l292.27-62.11c20.06-44.47 33.32-92.75 38.4-143.37l-330.68 70.27V66.13c-50.67 28.45-95.67 66.32-132.25 110.99v403.35l-132.21 28.11V0c-50.67 28.44-95.67 66.32-132.25 110.99v525.69l-295.91 62.88c-20.06 44.47-33.33 92.75-38.42 143.37l334.33-71.05v170.26l-358.3 76.14c-20.06 44.47-33.32 92.75-38.4 143.37l375.04-79.7c30.53-6.35 56.77-24.4 73.83-49.24l68.78-101.97v-002l132.21-28.11v270.4l424.53-90.28Z" />
    </svg>
  );
}
