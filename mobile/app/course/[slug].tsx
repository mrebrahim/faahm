import { useCallback, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { api, type CourseDetail } from '../../src/lib/api';
import {
  Badge,
  Card,
  ErrorState,
  Loading,
  ProgressBar,
  T,
} from '../../src/components/ui';
import { lockedMessage } from '../../src/lib/store-policy';
import { track } from '../../src/lib/analytics';
import { LEVEL_LABELS, colors, formatDuration, radius, spacing } from '../../src/lib/theme';

export default function CourseScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const [data, setData] = useState<CourseDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <>
      <Stack.Screen options={{ title: course.title }} />
      <ScrollView contentContainerStyle={styles.scroll}>
        {course.thumbnail_url ? (
          <Image source={{ uri: course.thumbnail_url }} style={styles.cover} />
        ) : null}

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
                    <T size="xs" color={colors.textFaint}>
                      {formatDuration(l.duration_sec)}
                      {l.is_free_preview && !l.is_completed ? ' · معاينة مجانية' : ''}
                    </T>
                  </View>
                </Pressable>
              ))}
            </View>
          ))}
        </Section>
      </ScrollView>
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
  cover: { width: '100%', aspectRatio: 16 / 9, borderRadius: radius.lg, backgroundColor: '#f3f4f6' },
  tags: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap', marginTop: spacing.lg },
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
