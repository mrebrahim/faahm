'use client';

import Image from 'next/image';
import { useState } from 'react';
import { Play } from 'lucide-react';

/**
 * Zero-JS-until-click YouTube facade. Ships nothing but a thumbnail +
 * play button on initial render — the ~1MB YouTube iframe only loads
 * when the visitor actually taps play. Saves ~800KB from LCP-blocking
 * network work on every page it's mounted on.
 *
 * Pattern lifted from paulirish/lite-youtube-embed but wired to Next.js
 * <Image> for AVIF re-encoding + responsive sizes.
 */
export function LiteYouTube({
  videoId,
  title,
  aspectRatio = '16/9',
  className = '',
  /** rounded corners inside the wrapping card. */
  rounded = 'rounded-xl',
}: {
  videoId: string;
  title: string;
  aspectRatio?: string;
  className?: string;
  rounded?: string;
}) {
  const [active, setActive] = useState(false);

  if (active) {
    return (
      <div
        className={`relative w-full overflow-hidden ${rounded} ${className}`}
        style={{ aspectRatio }}
      >
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 w-full h-full"
        />
      </div>
    );
  }

  const thumbSrc = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

  return (
    <button
      type="button"
      onClick={() => setActive(true)}
      aria-label={`تشغيل: ${title}`}
      className={`group relative w-full overflow-hidden ${rounded} bg-gray-900 cursor-pointer ${className}`}
      style={{ aspectRatio }}
    >
      <Image
        src={thumbSrc}
        alt={title}
        fill
        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 720px"
        className="object-cover opacity-90 group-hover:opacity-100 transition-opacity"
        loading="lazy"
      />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-red-600 group-hover:bg-red-700 flex items-center justify-center shadow-2xl transition-colors">
          <Play className="w-7 h-7 sm:w-9 sm:h-9 text-white fill-white translate-x-0.5" />
        </div>
      </div>
    </button>
  );
}
