import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { api, type CourseDetail } from '../../src/lib/api';
import {
  Badge,
  Button,
  Card,
  ErrorState,
  Loading,
  ProgressBar,
  T,
} from '../../src/components/ui';
import { CAN_SHOW_PURCHASE_CTA, lockedMessage } from '../../src/lib/store-policy';
import { track } from '../../src/lib/analytics';
import { CourseImage } from '../../src/components/course-image';
import { LEVEL_LABELS, colors, formatDuration, radius, spacing } from '../../src/lib/theme';

export default function CourseScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const [data, setData] = useState<CourseDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [playingTrailer, setPlayingTrailer] = useState(false);

  const load = useCallback(async () => {
    if (!slug) return;
    setError(null);
    try {
      const detail = await api.course(slug);
      setData(detail);
      track('course_viewed', {
        course_slug: slug,
        course_title: detail.course.title,
        unlocked: detail.access.unlocked,
        is_free: detail.course.is_free,
      });
      if (detail.course.is_free) {
        track('free_course_opened', { course_slug: slug });
      }
      if (!detail.access.unlocked) {
        // The paywall impression is the denominator for every
        // conversion question we'll ask later.
        track('course_locked_seen', {
          course_slug: slug,
          lock_reason: detail.access.lock_reason ?? 'unknown',
        });
      }
    } catch (e: any) {
      setError(e.message);
    }
  }, [slug]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (error && !data) return <ErrorState message={error} onRetry={load} />;
  if (!data) return <Loading />;

  const { course, access, progress, chapters } = data;

  const showBanner = !access.unlocked && CAN_SHOW_PURCHASE_CTA;

  return (
    <>
      <Stack.Screen options={{ title: course.title }} />
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          // Leave room so the sticky banner never covers the last lesson.
          showBanner && { paddingBottom: 140 },
        ]}
      >
        {/* Trailer if there is one, cover image otherwise. The trailer
            is the strongest thing we can show someone deciding whether
            to subscribe, so it gets the prime slot. */}
        {course.trailer ? (
          <View style={styles.cover}>
            {playingTrailer ? (
              <WebView
                source={{ uri: course.trailer.url }}
                style={{ flex: 1, backgroundColor: '#000' }}
                allowsFullscreenVideo
                allowsInlineMediaPlayback
                mediaPlaybackRequiresUserAction={false}
                javaScriptEnabled
                domStorageEnabled
              />
            ) : (
              // Click-to-load: an autoplaying WebView on every course
              // page would burn data before anyone asked for it.
              <Pressable style={styles.trailerPoster} onPress={() => setPlayingTrailer(true)}>
                <CourseImage url={course.thumbnail_url} style={StyleSheet.absoluteFillObject} />
                <View style={styles.trailerOverlay}>
                  <View style={styles.playBtn}>
                    <T size="xxl" color="#fff">
                      ▶
                    </T>
                  </View>
                  <T size="sm" weight="bold" color="#fff" style={{ marginTop: spacing.sm }}>
                    شوف الفيديو التشويقي
                  </T>
                </View>
              </Pressable>
            )}
          </View>
        ) : (
          <CourseImage url={course.thumbnail_url} style={styles.cover} />
        )}

        <View style={styles.tags}>
          {course.is_free ? <Badge label="🎁 مجاني" tone="free" /> : null}
          {course.yearly_only ? <Badge label="👑 الباقة السنوية" tone="gold" /> : null}
          <Badge label={LEVEL_LABELS[course.level] ?? course.level} />
        </View>

        <T size="xxl" weight="extrabold" style={{ marginTop: spacing.md }}>
          {course.title}
        </T>
        <T size="sm" color={colors.textMuted} style={{ marginTop: spacing.xs }}>
          {course.total_lessons} درس · {formatDuration(course.total_duration_sec)}
          {course.instructor ? ` · ${course.instructor.name}` : ''}
        </T>

        {access.unlocked && progress.total_lessons > 0 ? (
          <Card style={{ marginTop: spacing.lg }}>
            <T size="sm" weight="bold">
              تقدّمك: {progress.completed_lessons} من {progress.total_lessons} درس
            </T>
            <View style={{ marginTop: spacing.sm }}>
              <ProgressBar percent={progress.percent} />
            </View>
          </Card>
        ) : null}

        {/* Locked state only — no price, no purchase link. Stating that
            access is missing is allowed; pointing at where to buy is
            what 3.1.3(a) blocks. */}
        {!access.unlocked ? (
          <Card style={{ marginTop: spacing.lg }}>
            <T weight="bold">{lockedMessage(access.lock_reason).title}</T>
            <T size="sm" color={colors.textMuted} style={{ marginTop: spacing.xs }}>
              {lockedMessage(access.lock_reason).body}
            </T>
          </Card>
        ) : null}

        {course.short_description || course.description ? (
          <Section title="عن الكورس">
            <T size="sm" color={colors.textMuted}>
              {course.description || course.short_description}
            </T>
          </Section>
        ) : null}

        {course.what_you_learn.length > 0 ? (
          <Section title="هتتعلّم إيه">
            {course.what_you_learn.map((item, i) => (
              <T key={i} size="sm" color={colors.textMuted}>
                ✅ {item}
              </T>
            ))}
          </Section>
        ) : null}

        <Section title="محتوى الكورس">
          {chapters.map((ch) => (
            <View key={ch.id} style={{ gap: spacing.sm }}>
              <T weight="bold" size="sm">
                {ch.title}
              </T>
              {ch.lessons.map((l) => (
                <Pressable
                  key={l.id}
                  disabled={!l.playable}
                  onPress={() => router.push(`/lesson/${l.id}`)}
                  style={({ pressed }) => [
                    styles.lesson,
                    !l.playable && { opacity: 0.55 },
                    pressed && { backgroundColor: '#f9fafb' },
                  ]}
                >
                  <T size="md">{l.is_completed ? '✅' : l.playable ? '▶️' : '🔒'}</T>
                  <View style={{ flex: 1 }}>
                    <T size="sm" numberOfLines={2}>
                      {l.title}
                    </T>
                    <T
                      size="xs"
                      color={l.is_free_preview && !access.unlocked ? colors.brand : colors.textFaint}
                    >
                      {formatDuration(l.duration_sec)}
                      {l.is_free_preview ? ' · 👁 معاينة مجانية' : ''}
                    </T>
                  </View>
                </Pressable>
              ))}
            </View>
          ))}
        </Section>
      </ScrollView>

      {/* The sell lives HERE — on a course someone actually wanted to
          open — not on the home screen. Somebody browsing the library
          hasn't shown intent yet; somebody who tapped into a locked
          course has. */}
      {showBanner ? (
        <View style={styles.banner}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <T size="sm" weight="bold" color="#fff">
              الكورس ده مقفول
            </T>
            <T size="xs" color="rgba(255,255,255,0.85)">
              اشترك دلوقتي وافتحه مع باقي المكتبة
            </T>
          </View>
          <Button
            label="اشترك دلوقتي"
            variant="outline"
            style={styles.bannerBtn}
            onPress={() => router.push('/subscribe')}
          />
        </View>
      ) : null}
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ marginTop: spacing.xxl, gap: spacing.md }}>
      <T size="lg" weight="extrabold">
        {title}
      </T>
      <View style={{ gap: spacing.md }}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.lg, paddingBottom: spacing.xxl * 2 },
  cover: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: '#f3f4f6',
  },
  trailerPoster: { flex: 1 },
  trailerOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  playBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tags: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap', marginTop: spacing.lg },
  banner: {
    position: 'absolute',
    bottom: 0,
    start: 0,
    end: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    backgroundColor: colors.brand,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: -3 },
  },
  bannerBtn: { backgroundColor: '#fff', borderColor: '#fff', paddingHorizontal: spacing.lg, minHeight: 44 },
  lesson: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
});
