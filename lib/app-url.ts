import { headers } from 'next/headers';

/**
 * Resolve the absolute base URL the current request is on, suitable for
 * stitching into emails (Supabase invite/confirm links, Stripe redirects,
 * password resets, etc.).
 *
 * Priority: x-forwarded-host (proxy-aware: Coolify/Traefik, Vercel,
 * sslip.io) → Host header → NEXT_PUBLIC_APP_URL env → final hard
 * fallback. We don't trust NEXT_PUBLIC_APP_URL first because Next.js
 * inlines it at build time — if Coolify didn't pass the env var as a
 * build-arg the compiled binary carries the wrong default.
 *
 * Always returns a string with no trailing slash.
 */
export function resolveAppUrl(): string {
  try {
    const h = headers();
    const proto = h.get('x-forwarded-proto') || 'https';
    const forwardedHost = h.get('x-forwarded-host');
    if (forwardedHost) return `${proto}://${forwardedHost}`.replace(/\/$/, '');
    const host = h.get('host');
    if (host) return `${proto}://${host}`.replace(/\/$/, '');
  } catch {
    // headers() throws outside a request scope (e.g. build-time generation);
    // fall through to the env-var fallback.
  }
  return (process.env.NEXT_PUBLIC_APP_URL || 'https://faahm.com').replace(/\/$/, '');
}
