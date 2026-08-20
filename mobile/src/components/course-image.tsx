import { useEffect, useState } from 'react';
import { Image, StyleSheet, View, type ImageStyle, type StyleProp } from 'react-native';
import { T } from './ui';
import { colors } from '../lib/theme';

/**
 * Course / article thumbnail.
 *
 * ## Why this isn't just <Image source={{uri}} />
 *
 * The covers on Bunny are **AVIF** (`.../cover.avif`). Browsers decode
 * that fine — which is why the website was never affected — but React
 * Native's Android image loader (Fresco) does not decode AVIF by
 * default, so every card rendered an empty box.
 *
 * Rather than guess which workaround is available, this walks a chain
 * and takes the first URL that actually loads:
 *
 *   1. Bunny Optimizer conversion — `?format=jpeg&width=800`. Works when
 *      Optimizer is enabled on the pull zone, and it converts at the
 *      edge so we pay no bandwidth for it. It also downsizes, which is
 *      worth doing on its own for a 3G audience.
 *   2. WebP — decodable by RN on both platforms, in case the zone
 *      serves it but not JPEG.
 *   3. The original URL — correct when the file was never AVIF to begin
 *      with (older courses are .jpg) or when the platform can decode it.
 *
 * Anything not on Bunny skips straight to step 3.
 *
 * Failing all three shows a visible placeholder instead of a blank
 * rectangle, so a broken image reads as a missing photo rather than a
 * broken app.
 */
function buildCandidates(url: string): string[] {
  // Encode exactly once. Bunny stores some files under Arabic names, so
  // the URLs mix percent-encoding with literal parentheses, and Android
  // is stricter than a browser about that mixture.
  let normalized = url;
  try {
    normalized = encodeURI(decodeURI(url));
  } catch {
    // Malformed percent-sequence — use it as-is rather than throwing
    // inside a render.
  }

  const isBunny = /\.b-cdn\.net\//i.test(normalized);
  if (!isBunny) return [normalized];

  const join = (params: string) =>
    normalized.includes('?') ? `${normalized}&${params}` : `${normalized}?${params}`;

  return [join('format=jpeg&width=800'), join('format=webp&width=800'), normalized];
}

export function CourseImage({
  url,
  style,
}: {
  url: string | null | undefined;
  style?: StyleProp<ImageStyle>;
}) {
  const [attempt, setAttempt] = useState(0);

  // A new url means a new chain — without this, a recycled list row
  // would inherit the previous item's failure count.
  useEffect(() => {
    setAttempt(0);
  }, [url]);

  const candidates = url ? buildCandidates(url) : [];
  const current = candidates[attempt];

  if (!current) {
    return (
      <View style={[styles.base, styles.fallback, style]}>
        <T size="xxl">📚</T>
      </View>
    );
  }

  return (
    <Image
      key={current}
      source={{ uri: current }}
      style={[styles.base, style]}
      resizeMode="cover"
      onError={() => {
        if (attempt === candidates.length - 1) {
          console.warn('[course-image] all variants failed', url);
        }
        setAttempt((n) => n + 1);
      }}
    />
  );
}

const styles = StyleSheet.create({
  base: { width: '100%', aspectRatio: 16 / 9, backgroundColor: '#f3f4f6' },
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.brandLight,
  },
});
