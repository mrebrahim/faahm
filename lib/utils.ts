import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge Tailwind classes intelligently
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format duration in seconds to "1h 23m" Arabic-friendly format
 */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours === 0) return `${minutes} دقيقة`;
  if (minutes === 0) return `${hours} ساعة`;
  return `${hours} ساعة و ${minutes} دقيقة`;
}

/**
 * Format price in cents to readable USD
 */
export function formatPrice(cents: number, currency = 'USD'): string {
  const amount = cents / 100;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
  }).format(amount);
}

/**
 * Get Vimeo embed URL with privacy options
 */
export function getVimeoEmbedUrl(videoId: string, options?: { autoplay?: boolean }): string {
  const params = new URLSearchParams({
    dnt: '1',                    // do not track
    pip: '0',                    // disable picture-in-picture
    portrait: '0',
    title: '0',
    byline: '0',
    ...(options?.autoplay && { autoplay: '1' }),
  });
  return `https://player.vimeo.com/video/${videoId}?${params.toString()}`;
}

/**
 * Get Vimeo thumbnail URL
 */
export function getVimeoThumbnailUrl(videoId: string): string {
  return `https://vumbnail.com/${videoId}.jpg`;
}

/**
 * Generate a unique certificate number
 */
export function generateCertificateNumber(): string {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
  return `FH-${year}-${random}`;
}

/**
 * Calculate subscription period end based on plan
 */
export function calculatePeriodEnd(plan: 'monthly' | 'yearly'): Date {
  const now = new Date();
  if (plan === 'monthly') {
    return new Date(now.setMonth(now.getMonth() + 1));
  }
  return new Date(now.setFullYear(now.getFullYear() + 1));
}
