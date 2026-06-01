import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-guard';

/**
 * Admin-only diagnostic: reports whether the analytics env vars
 * are present in the running container at request time. Lets the
 * admin verify a Coolify env-var change actually reached the
 * process, separate from any client-side caching / Tag Assistant
 * weirdness.
 *
 * Reveals the *shape* (set / not set / length) of secret tokens
 * but never their value.
 */
export const dynamic = 'force-dynamic';

export async function GET() {
  await requireAdmin();

  const expose = (v: string | undefined) =>
    v ? { set: true, length: v.length, sample: v.slice(0, 4) + '…' + v.slice(-4) } : { set: false };

  return NextResponse.json({
    NEXT_PUBLIC_GA_MEASUREMENT_ID: process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ?? null,
    NEXT_PUBLIC_FB_PIXEL_ID: process.env.NEXT_PUBLIC_FB_PIXEL_ID ?? null,
    NEXT_PUBLIC_TIKTOK_PIXEL_ID: process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID ?? null,
    NEXT_PUBLIC_CLARITY_ID: process.env.NEXT_PUBLIC_CLARITY_ID ?? null,
    FB_CONVERSIONS_API_TOKEN: expose(process.env.FB_CONVERSIONS_API_TOKEN),
    TIKTOK_EVENTS_API_TOKEN: expose(process.env.TIKTOK_EVENTS_API_TOKEN),
    BUNNY_TOKEN_KEY_668938: expose(process.env.BUNNY_TOKEN_KEY_668938),
    BUNNY_TOKEN_KEY_672644: expose(process.env.BUNNY_TOKEN_KEY_672644),
    BUNNY_TOKEN_KEY_671668: expose(process.env.BUNNY_TOKEN_KEY_671668),
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL ?? null,
  });
}
