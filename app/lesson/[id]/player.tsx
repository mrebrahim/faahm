'use client';

import { useEffect, useRef } from 'react';
import { updateWatchProgress } from './actions';
import type { ResolvedEmbed } from '@/lib/video';

/**
 * Provider-agnostic lesson player.
 *
 * - Renders an <iframe> for embedded providers (Vimeo, Bunny Stream, YouTube).
 * - Renders a <video> tag for self-hosted MP4/HLS URLs.
 * - For Vimeo and Bunny, hooks postMessage 'timeupdate' events and
 *   heartbeats progress to the server every ~15s. updateWatchProgress
 *   auto-marks the lesson as completed once watched_sec crosses 90% of
 *   the lesson duration. YouTube and self-hosted don't have a stable
 *   postMessage protocol from us yet — they fall through unread.
 *
 * Why postMessage instead of the provider SDKs? Keeps the bundle tiny
 * (Vimeo's player.js is ~25KB, Bunny's is similar). Both providers'
 * postMessage protocols are stable and documented.
 */
export function LessonPlayer({
  lessonId,
  embed,
  provider,
  title,
  watermark,
}: {
  lessonId: string;
  embed: ResolvedEmbed;
  provider: string;
  title: string;
  /** Identifier overlaid on the video as a leak deterrent (user email). */
  watermark?: string | null;
}) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const lastSent = useRef<number>(0);
  const latestSeconds = useRef<number>(0);

  useEffect(() => {
    if (provider !== 'vimeo' && provider !== 'bunny') return;
    const iframe = iframeRef.current;
    if (!iframe) return;

    // Vimeo wants {method, value: <event>} per subscription; Bunny ships
    // its own player.js variant — the data shape on the wire is the same
    // (data.event + data.data.seconds) so the handler below works for
    // both. We send subscriptions for Vimeo only because Bunny streams
    // timeupdate by default.
    const postVimeo = (method: string) => {
      try {
        iframe.contentWindow?.postMessage(
          JSON.stringify({ method, value: 'timeupdate' }),
          '*'
        );
      } catch {
        // iframe not ready yet — provider fires 'ready' once it is.
      }
    };

    const isVimeoOrigin = (o: string) => o.includes('vimeo.com');
    const isBunnyOrigin = (o: string) =>
      o.includes('mediadelivery.net') || o.includes('b-cdn.net');

    const onMessage = (event: MessageEvent) => {
      if (typeof event.data !== 'string') return;
      const fromVimeo = provider === 'vimeo' && isVimeoOrigin(event.origin);
      const fromBunny = provider === 'bunny' && isBunnyOrigin(event.origin);
      if (!fromVimeo && !fromBunny) return;

      let data: any;
      try {
        data = JSON.parse(event.data);
      } catch {
        return;
      }

      if (data.event === 'ready' && fromVimeo) {
        postVimeo('addEventListener');
        return;
      }

      // Bunny's player ships timeupdate in several shapes depending on the
      // embed version: { event:'timeupdate', data:{seconds} }, or with the
      // payload at data.value, data.context.seconds, or just data.seconds.
      // Read whichever is finite so we don't silently miss heartbeats.
      const isTimeUpdate =
        data.event === 'timeupdate' || data.eventName === 'timeupdate';
      if (isTimeUpdate) {
        const candidate =
          data?.data?.seconds ??
          data?.context?.seconds ??
          data?.value?.seconds ??
          data?.value ??
          data?.seconds ??
          data?.currentTime;
        const seconds = Number(candidate);
        if (!Number.isFinite(seconds) || seconds < 0) return;
        latestSeconds.current = seconds;

        const now = Date.now();
        if (now - lastSent.current >= 15_000) {
          lastSent.current = now;
          void updateWatchProgress(lessonId, seconds);
        }
      }
    };

    window.addEventListener('message', onMessage);

    const flush = () => {
      if (latestSeconds.current > 0) {
        void updateWatchProgress(lessonId, latestSeconds.current);
      }
    };
    window.addEventListener('pagehide', flush);

    return () => {
      window.removeEventListener('message', onMessage);
      window.removeEventListener('pagehide', flush);
      flush();
    };
  }, [lessonId, provider]);

  if (embed.kind === 'native') {
    return (
      <div className="relative aspect-video w-full bg-black rounded-2xl overflow-hidden border border-gray-200">
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <video
          src={embed.src}
          controls
          playsInline
          preload="metadata"
          controlsList="nodownload"
          onContextMenu={(e) => e.preventDefault()}
          className="w-full h-full"
        />
        {watermark && <Watermark text={watermark} />}
      </div>
    );
  }

  return (
    <div className="relative aspect-video w-full bg-black rounded-2xl overflow-hidden border border-gray-200">
      <iframe
        ref={iframeRef}
        src={embed.src}
        title={title}
        className="w-full h-full"
        allow="autoplay; fullscreen; picture-in-picture; encrypted-media; accelerometer; gyroscope"
        allowFullScreen
      />
      {watermark && <Watermark text={watermark} />}
    </div>
  );
}

/**
 * Drifting watermark overlay. Sits above the video so any screen-recording
 * / screenshot carries the viewer's identifier. pointer-events:none lets
 * clicks pass through to the player controls underneath.
 *
 * Avoids mix-blend-difference: CSS blend modes don't compose across iframe
 * boundaries, so the overlay would render invisibly on top of a Bunny
 * embed. Instead we use a semi-opaque white with a hard black stroke,
 * which stays legible on both bright and dark video frames.
 */
function Watermark({ text }: { text: string }) {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 select-none overflow-hidden z-10"
      dir="ltr"
    >
      <div
        className="absolute text-xs md:text-sm font-mono whitespace-nowrap animate-[wm-jump_80s_step-end_infinite]"
        style={{
          // Low opacity so the lesson stays comfortable to watch, but with
          // a soft dark glow so the email still survives a screenshot for
          // forensic tracing.
          color: 'rgba(255,255,255,0.22)',
          textShadow: '0 0 2px rgba(0,0,0,0.55), 0 1px 1px rgba(0,0,0,0.35)',
          letterSpacing: '0.5px',
        }}
      >
        {text}
      </div>
      <style>{`
        @keyframes wm-jump {
          0%   { top: 8%;  left: 6%; }
          25%  { top: 78%; left: 4%; }
          50%  { top: 82%; left: 68%; }
          75%  { top: 14%; left: 72%; }
          100% { top: 8%;  left: 6%; }
        }
      `}</style>
    </div>
  );
}
