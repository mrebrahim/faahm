/**
 * Design tokens mirrored from the web app's Tailwind config so the two
 * surfaces don't drift into looking like different products.
 */
export const colors = {
  brand: '#16a34a',
  brandDark: '#15803d',
  brandLight: '#dcfce7',
  bg: '#f9fafb',
  card: '#ffffff',
  border: '#e5e7eb',
  text: '#111827',
  textMuted: '#6b7280',
  textFaint: '#9ca3af',
  danger: '#dc2626',
  like: '#e11d48',
  streak: '#ea580c',
  gold: '#f59e0b',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 999,
} as const;

/**
 * Arabic needs a font that actually ships the glyphs. System defaults
 * cover Arabic on both platforms, so we set the family to undefined and
 * let the OS pick rather than bundling a webfont into the binary.
 */
export const font = {
  regular: undefined as string | undefined,
  sizes: {
    xs: 11,
    sm: 13,
    md: 15,
    lg: 17,
    xl: 20,
    xxl: 26,
    display: 34,
  },
} as const;

export function formatDuration(sec: number): string {
  if (!sec || sec < 0) return '0 د';
  const h = Math.floor(sec / 3600);
  const m = Math.round((sec % 3600) / 60);
  if (h > 0) return m > 0 ? `${h} س ${m} د` : `${h} س`;
  return `${m} د`;
}

export const LEVEL_LABELS: Record<string, string> = {
  beginner: 'مبتدئ',
  intermediate: 'متوسط',
  advanced: 'متقدّم',
};
