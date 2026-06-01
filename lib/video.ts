import { createHash } from 'crypto';

/**
 * Video provider abstraction for lesson + course-trailer playback.
 *
 * Lessons and courses store:
 *   video_provider     enum  ('bunny' | 'vimeo' | 'cloudflare' | 'mux' | 'youtube' | 'self_hosted')
 *   video_id           text  provider-specific identifier (GUID, numeric ID, URL slug, etc.)
 *   video_library_id   text  optional — Bunny library / Mux env / Cloudflare account scope
 *
 * Today the platform actively uses Bunny Stream (primary) and Vimeo (fallback).
 * The rest are scaffolded so adding them later only touches this module.
 */

import { getVimeoEmbedUrl } from '@/lib/utils';

export type VideoProvider =
  | 'bunny'
  | 'vimeo'
  | 'cloudflare'
  | 'mux'
  | 'youtube'
  | 'self_hosted';

export const SUPPORTED_PROVIDERS: { value: VideoProvider; label: string }[] = [
  { value: 'bunny', label: 'Bunny Stream' },
  { value: 'vimeo', label: 'Vimeo' },
];

export const DEFAULT_PROVIDER: VideoProvider = 'bunny';

/**
 * Project-wide default Bunny Stream library. Library IDs are visible in every
 * embed URL so they are not secrets; we still expose an env var to support
 * staging/production splits. Falls back to the prod library when unset.
 */
export const DEFAULT_BUNNY_LIBRARY_ID =
  process.env.NEXT_PUBLIC_BUNNY_LIBRARY_ID || '668938';

export type EmbedKind = 'iframe' | 'native';

export type ResolvedEmbed = {
  kind: EmbedKind;
  src: string;
};

/**
 * Build the embeddable URL for a video. Returns null if the provider/value
 * combination is unusable (e.g. Bunny with no library configured anywhere).
 */
export function resolveVideoEmbed(
  provider: VideoProvider | string | null | undefined,
  videoId: string | null | undefined,
  libraryId?: string | null,
  options: { autoplay?: boolean; start?: number; tokenTtlSeconds?: number } = {}
): ResolvedEmbed | null {
  if (!videoId) return null;
  const p = (provider || DEFAULT_PROVIDER) as VideoProvider;

  switch (p) {
    case 'vimeo': {
      const id = extractVimeoId(videoId);
      if (!id) return null;
      return { kind: 'iframe', src: getVimeoEmbedUrl(id, { autoplay: options.autoplay }) };
    }

    case 'bunny': {
      const lib = libraryId || DEFAULT_BUNNY_LIBRARY_ID;
      const guid = extractBunnyGuid(videoId);
      if (!lib || !guid) return null;
      const params = new URLSearchParams({
        autoplay: options.autoplay ? 'true' : 'false',
        preload: 'true',
        responsive: 'true',
      });
      if (options.start && options.start > 0) params.set('t', String(Math.floor(options.start)));

      // Token-authenticated URL: when BUNNY_TOKEN_KEY_<libraryId> is set
      // we sign the embed with sha256(key + guid + expires). Bunny rejects
      // the embed if the token is missing/wrong, which blocks hot-linking
      // and direct embed reuse from other sites. No-op when the env is
      // not configured — the URL just stays unsigned.
      const tokenKey = lookupBunnyTokenKey(lib);
      if (tokenKey) {
        const expires = Math.floor(Date.now() / 1000) + (options.tokenTtlSeconds ?? 3600);
        const token = signBunnyToken(tokenKey, guid, expires);
        params.set('token', token);
        params.set('expires', String(expires));
      }

      return {
        kind: 'iframe',
        src: `https://iframe.mediadelivery.net/embed/${lib}/${guid}?${params.toString()}`,
      };
    }

    case 'youtube': {
      const id = extractYoutubeId(videoId);
      if (!id) return null;
      const params = new URLSearchParams({
        rel: '0',
        modestbranding: '1',
        ...(options.autoplay && { autoplay: '1' }),
        ...(options.start ? { start: String(Math.floor(options.start)) } : {}),
      });
      return { kind: 'iframe', src: `https://www.youtube-nocookie.com/embed/${id}?${params}` };
    }

    case 'self_hosted': {
      // Treat the value as a direct video URL (.mp4, .m3u8, etc.). Played
      // via <video> tag rather than iframe.
      return { kind: 'native', src: videoId };
    }

    case 'cloudflare':
    case 'mux':
    default:
      // Not implemented yet — surface as unplayable rather than rendering
      // a broken iframe.
      return null;
  }
}

/**
 * Extract a Vimeo numeric ID from the user input. Accepts:
 *   - bare numeric ID:                "912345678"
 *   - full Vimeo URL:                 "https://vimeo.com/912345678"
 *   - showcase / channel URL:         "https://vimeo.com/channels/staffpicks/912345678"
 */
export function extractVimeoId(input: string): string | null {
  const trimmed = input.trim();
  if (/^\d+$/.test(trimmed)) return trimmed;
  const match = trimmed.match(/vimeo\.com\/(?:.*\/)?(\d+)/);
  return match?.[1] ?? null;
}

/**
 * Extract a Bunny Stream video GUID from input. Accepts:
 *   - bare GUID:               "abc12345-6789-1234-1234-1234567890ab"
 *   - full embed URL:          "https://iframe.mediadelivery.net/embed/123/<guid>?..."
 *   - direct HLS URL:          "https://vz-xxx.b-cdn.net/<guid>/playlist.m3u8"
 *   - play page URL:           "https://iframe.mediadelivery.net/play/123/<guid>"
 */
export function extractBunnyGuid(input: string): string | null {
  const trimmed = input.trim();
  const guidPattern = /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/;
  const match = trimmed.match(guidPattern);
  return match?.[0] ?? null;
}

/**
 * Try to pull a Bunny library ID out of a full embed URL. Returns null if
 * the input was just a GUID (caller falls back to DEFAULT_BUNNY_LIBRARY_ID).
 */
export function extractBunnyLibraryId(input: string): string | null {
  const trimmed = input.trim();
  const match = trimmed.match(/iframe\.mediadelivery\.net\/(?:embed|play)\/(\d+)\//);
  return match?.[1] ?? null;
}

/**
 * Extract a YouTube video ID from input.
 */
export function extractYoutubeId(input: string): string | null {
  const trimmed = input.trim();
  if (/^[\w-]{11}$/.test(trimmed)) return trimmed;
  const match = trimmed.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|v\/)|youtu\.be\/)([\w-]{11})/
  );
  return match?.[1] ?? null;
}

/**
 * Provider-aware parser for admin form input. Returns the normalised
 * { video_id, video_library_id } that should go into the database. Returns
 * null when the input doesn't yield a usable ID — caller should reject.
 */
export function parseVideoInput(
  provider: VideoProvider,
  raw: string
): { video_id: string; video_library_id: string | null } | null {
  if (!raw?.trim()) return null;
  switch (provider) {
    case 'vimeo': {
      const id = extractVimeoId(raw);
      return id ? { video_id: id, video_library_id: null } : null;
    }
    case 'bunny': {
      const guid = extractBunnyGuid(raw);
      if (!guid) return null;
      const lib = extractBunnyLibraryId(raw); // may be null — falls back to env
      return { video_id: guid, video_library_id: lib };
    }
    case 'youtube': {
      const id = extractYoutubeId(raw);
      return id ? { video_id: id, video_library_id: null } : null;
    }
    case 'self_hosted':
      return { video_id: raw.trim(), video_library_id: null };
    default:
      return null;
  }
}

/**
 * Look up the Bunny token-authentication key for a library.
 *
 * Reads BUNNY_TOKEN_KEY_<libraryId> from env first (per-library override),
 * then BUNNY_TOKEN_KEY_DEFAULT (global). Returns null when nothing is
 * configured — the embed URL is then served unsigned, which is fine in
 * dev / when the admin hasn't enabled token auth on the Bunny library yet.
 */
function lookupBunnyTokenKey(libraryId: string): string | null {
  const perLibrary = process.env[`BUNNY_TOKEN_KEY_${libraryId}`];
  if (perLibrary) return perLibrary;
  return process.env.BUNNY_TOKEN_KEY_DEFAULT ?? null;
}

/**
 * Sign a Bunny Stream embed URL: sha256(secret + videoGuid + expires).
 * Output is hex; Bunny accepts both hex and base64url tokens but hex is
 * what their dashboard examples use, so we stay consistent with that.
 */
function signBunnyToken(secret: string, videoGuid: string, expires: number): string {
  return createHash('sha256').update(secret + videoGuid + expires).digest('hex');
}
