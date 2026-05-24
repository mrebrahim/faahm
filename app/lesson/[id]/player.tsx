'use client';

import { useEffect, useRef } from 'react';
import { updateWatchProgress } from './actions';

/**
 * Vimeo player wrapper that:
 *  - embeds the video via iframe
 *  - listens to Vimeo postMessage 'timeupdate' events
 *  - heartbeats current position to the server every ~15s
 *
 * Why postMessage and not @vimeo/player? Keeps the bundle tiny — Vimeo's
 * own JS API is ~25KB. The wire protocol is stable and documented.
 */
export function LessonPlayer({
  lessonId,
  embedUrl,
  title,
}: {
  lessonId: string;
  embedUrl: string;
  title: string;
}) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const lastSent = useRef<number>(0);
  const latestSeconds = useRef<number>(0);

  useEffect(() => {
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

        // Heartbeat at most every 15s, and skip if user hasn't actually progressed.
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
  }, [lessonId]);

  return (
    <div className="aspect-video w-full bg-black rounded-2xl overflow-hidden border border-gray-200">
      <iframe
        ref={iframeRef}
        src={embedUrl}
        title={title}
        className="w-full h-full"
        allow="autoplay; fullscreen; picture-in-picture"
        allowFullScreen
      />
    </div>
  );
}
