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
  options: { autoplay?: boolean; start?: number } = {}
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
