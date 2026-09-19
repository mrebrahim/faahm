import { NextResponse } from 'next/server';
import { resolveAppUrl } from '@/lib/app-url';

/**
 * Retired subscription checkout endpoint.
 *
 * Plans are no longer sold. One-off course and bundle purchases go
 * through /api/checkout/course, which opens a Stripe Checkout Session
 * priced from lib/catalog.ts.
 *
 * Kept as a redirect rather than deleted: old Payment Link buttons and
 * bookmarks still hit this path, and a 404 there just loses the sale.
 */
export async function GET() {
  return NextResponse.redirect(`${resolveAppUrl()}/pricing`, { status: 303 });
}

export async function HEAD() {
  return NextResponse.json({ retired: true, use: '/api/checkout/course' });
}
