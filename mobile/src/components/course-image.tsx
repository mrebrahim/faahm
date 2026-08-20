import { useState } from 'react';
import { Image, StyleSheet, View, type StyleProp, type ImageStyle } from 'react-native';
import { T } from './ui';
import { colors } from '../lib/theme';

/**
 * Course thumbnail.
 *
 * Bunny stores these under Arabic filenames, so the URLs mix
 * percent-encoded characters with literal parentheses:
 *
 *   https://faahm.b-cdn.net/%D8%AA%D8%B5...%20(37).jpg
 *
 * Android's image loader is stricter than a browser about that mixture,
 * which is why the cards rendered an empty grey box instead of a photo.
 * `normalize()` re-encodes the URL exactly once so what reaches the
 * loader is well-formed either way.
 *
 * A failed load falls back to a visible placeholder rather than an empty
 * box, so a broken URL looks like a missing image instead of a broken
 * app — and `onError` puts the reason in the log.
 */
function normalize(url: string): string {
  try {
    // decodeURI first so an already-encoded URL isn't double-encoded;
    // encodeURI then escapes what Android needs escaped, including the
    // parentheses that Bunny leaves raw.
    return encodeURI(decodeURI(url));
  } catch {
    // Malformed percent-sequence — pass it through untouched rather than
    // throwing inside a render.
    return url;
  }
}

export function CourseImage({
  url,
  style,
}: {
  url: string | null | undefined;
  style?: StyleProp<ImageStyle>;
}) {
  const [failed, setFailed] = useState(false);

  if (!url || failed) {
    return (
      <View style={[styles.base, styles.fallback, style]}>
        <T size="xxl">📚</T>
      </View>
    );
  }

  return (
    <Image
      source={{ uri: normalize(url) }}
      style={[styles.base, style]}
      resizeMode="cover"
      onError={(e) => {
        console.warn('[course-image] failed', url, e.nativeEvent?.error);
        setFailed(true);
      }}
    />
  );
}

const styles = StyleSheet.create({
  base: { width: '100%', aspectRatio: 16 / 9, backgroundColor: '#f3f4f6' },
  fallback: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.brandLight },
});
