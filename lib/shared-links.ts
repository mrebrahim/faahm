/**
 * Student-supplied attachment links (Drive / YouTube / Loom).
 *
 * We take a LINK rather than an upload. Hosting student screenshots and
 * screen recordings would cost storage and bandwidth for content watched
 * once, and everyone already has Drive or YouTube.
 *
 * The catch is that a Google Drive file is PRIVATE by default. A student
 * pastes the link, it looks fine to them because they're signed in, and
 * the admin opens it days later to a permission wall. So the link is
 * probed at submit time — while the student is still on the page and can
 * fix it in ten seconds.
 */

export type LinkKind = 'drive' | 'youtube' | 'loom' | 'image' | 'other';
export type LinkAccess = 'public' | 'private' | 'unknown';

export type ParsedLink = {
  url: string;
  kind: LinkKind;
  /** Drive/YouTube file or video id, when we can extract one. */
  id: string | null;
};

/** Recognise the link and normalise it. Returns null if it isn't a URL we accept. */
export function parseSharedLink(raw: string): ParsedLink | null {
  const url = raw.trim();
  if (!url) return null;
  if (!/^https?:\/\//i.test(url)) return null;

  let host: string;
  try {
    host = new URL(url).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return null;
  }

  // Google Drive — /file/d/<id>/view, or ?id=<id>
  if (host === 'drive.google.com' || host === 'docs.google.com') {
    const m = url.match(/\/d\/([a-zA-Z0-9_-]{10,})/) || url.match(/[?&]id=([a-zA-Z0-9_-]{10,})/);
    return { url, kind: 'drive', id: m?.[1] ?? null };
  }

  if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'youtu.be') {
    const m =
      url.match(/[?&]v=([a-zA-Z0-9_-]{6,20})/) ||
      url.match(/youtu\.be\/([a-zA-Z0-9_-]{6,20})/) ||
      url.match(/\/shorts\/([a-zA-Z0-9_-]{6,20})/);
    return { url, kind: 'youtube', id: m?.[1] ?? null };
  }

  if (host === 'loom.com' || host.endsWith('.loom.com')) {
    const m = url.match(/\/share\/([a-zA-Z0-9]+)/);
    return { url, kind: 'loom', id: m?.[1] ?? null };
  }

  if (/\.(png|jpe?g|gif|webp|avif)(\?|$)/i.test(url)) {
    return { url, kind: 'image', id: null };
  }

  // Anything else on https is allowed through — the admin can judge it.
  // Blocking unknown hosts would reject perfectly good Dropbox/OneDrive
  // links for no gain.
  return { url, kind: 'other', id: null };
}

/**
 * Is the link actually reachable by someone who isn't the owner?
 *
 * Never throws and never blocks submission — a slow or unreachable host
 * returns 'unknown', and the question is saved either way. The point is
 * to WARN, not to gatekeep.
 */
export async function checkLinkAccess(link: ParsedLink): Promise<LinkAccess> {
  // A YouTube video that isn't public simply won't embed; Loom share
  // links are public by construction. Neither is worth a network call.
  if (link.kind === 'youtube' || link.kind === 'loom') return 'public';

  const target =
    link.kind === 'drive' && link.id
      ? // This endpoint serves the file itself when the link is shared
        // publicly, and redirects to a sign-in page when it isn't —
        // which is exactly the distinction we need.
        `https://drive.google.com/uc?export=download&id=${link.id}`
      : link.url;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(target, {
      redirect: 'follow',
      signal: controller.signal,
      headers: { 'User-Agent': 'faahm-link-check/1.0' },
    });
    clearTimeout(timer);

    if (res.status === 401 || res.status === 403 || res.status === 404) return 'private';

    const finalUrl = res.url ?? '';
    // Landing on an accounts page means it wanted a login, which means
    // whoever we send it to will hit the same wall.
    if (/accounts\.google\.com|ServiceLogin|signin/i.test(finalUrl)) return 'private';

    if (link.kind === 'drive') {
      const type = (res.headers.get('content-type') ?? '').toLowerCase();
      // A public Drive file comes back as the file. An HTML body here is
      // either the permission page or the virus-scan interstitial —
      // treat the latter as public since it means the file IS shared.
      if (type.includes('text/html')) {
        const body = (await res.text()).slice(0, 4000);
        if (/virus scan|too large|download anyway/i.test(body)) return 'public';
        return 'private';
      }
      return 'public';
    }

    return res.ok ? 'public' : 'unknown';
  } catch {
    // Timeout, DNS failure, blocked egress — don't punish the student
    // for our network.
    return 'unknown';
  }
}

export const LINK_KIND_LABELS: Record<LinkKind, string> = {
  drive: 'Google Drive',
  youtube: 'YouTube',
  loom: 'Loom',
  image: 'صورة',
  other: 'لينك',
};

/** What to tell the student when the probe says the link is locked. */
export const PRIVATE_LINK_HINT =
  'اللينك مقفول — مش هنقدر نفتحه. من Google Drive اضغط Share ثم غيّر "Restricted" لـ "Anyone with the link"، وبعدها ابعت اللينك تاني.';
