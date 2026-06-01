'use client';

import { useEffect, useRef } from 'react';
import { updateWatchProgress } from './actions';
import type { ResolvedEmbed } from '@/lib/video';

/**
 * Provider-agnostic lesson player.
 *
 * - Renders an <iframe> for embedded providers (Vimeo, Bunny Stream, YouTube).
 * - Renders a <video> tag for self-hosted MP4/HLS URLs.
 * - For Vimeo specifically, hooks postMessage 'timeupdate' events and
 *   heartbeats progress to the server every ~15s. Other providers fall
 *   back to the manual "mark as complete" button on the lesson page;
 *   we don't track watch position automatically for them yet.
 *
 * Why postMessage instead of the Vimeo Player SDK? Keeps the bundle tiny
 * (Vimeo's player.js is ~25KB). The wire protocol is stable and documented.
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
    if (provider !== 'vimeo') return;
    const iframe = iframeRef.current;
    if (!iframe) return;

    const post = (method: string) => {
      try {
        iframe.contentWindow?.postMessage(
          JSON.stringify({ method, value: 'timeupdate' }),
          '*'
        );
      } catch {
        // iframe not ready yet — Vimeo will fire 'ready' once it is.
      }
    };

    const onMessage = (event: MessageEvent) => {
      // Only trust messages from the Vimeo player origin.
      if (typeof event.data !== 'string' || !event.origin.includes('vimeo.com')) return;
      let data: any;
      try {
        data = JSON.parse(event.data);
      } catch {
        return;
      }

      if (data.event === 'ready') {
        post('addEventListener');
        return;
      }

      if (data.event === 'timeupdate' && data.data) {
        const seconds = Number(data.data.seconds);
        if (!Number.isFinite(seconds)) return;
        latestSeconds.current = seconds;

        // Heartbeat at most every 15s.
        const now = Date.now();
        if (now - lastSent.current >= 15_000) {
          lastSent.current = now;
          void updateWatchProgress(lessonId, seconds);
        }
      }
    };

    window.addEventListener('message', onMessage);

    // Best-effort final flush when the user leaves the page.
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
        className="absolute text-sm md:text-base font-mono whitespace-nowrap animate-[wm-drift_20s_linear_infinite]"
        style={{
          color: 'rgba(255,255,255,0.55)',
          textShadow:
            '1px 0 0 #000, -1px 0 0 #000, 0 1px 0 #000, 0 -1px 0 #000, 1px 1px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000',
          letterSpacing: '0.5px',
        }}
      >
        {text}
      </div>
      <style>{`
        @keyframes wm-drift {
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
