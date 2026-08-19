import { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { Link, useFocusEffect } from 'expo-router';
import { useAuth } from '../../src/lib/auth-context';
import { api, type CourseListItem } from '../../src/lib/api';
import { Badge, Card, Loading, ProgressBar, T } from '../../src/components/ui';
import { CAN_SHOW_PURCHASE_CTA } from '../../src/lib/store-policy';
import { colors, formatDuration, spacing } from '../../src/lib/theme';

/**
 * Home: XP standing, then free courses (the funnel), then the rest of
 * the catalog. Deliberately one column — the audience is on 360px
 * phones and a two-up grid makes Arabic titles clip.
 */
export default function HomeScreen() {
  const { me, refresh } = useAuth();
  const [courses, setCourses] = useState<CourseListItem[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.courses();
      setCourses(res.courses);
    } catch {
      setCourses([]);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([load(), refresh()]);
    setRefreshing(false);
  }, [load, refresh]);

  if (!courses) return <Loading />;

  const free = courses.filter((c) => c.is_free);
  const rest = courses.filter((c) => !c.is_free);

  return (
    <ScrollView
      contentContainerStyle={styles.scroll}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <T size="xxl" weight="extrabold">
        أهلاً، {me?.user.full_name?.split(' ')[0] || 'يا بطل'} 👋
      </T>

      {me ? (
        <Card style={{ marginTop: spacing.lg }}>
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <T size="sm" color={colors.textMuted}>
                نقاطك
              </T>
              <View style={styles.rowBaseline}>
                <T size="display" weight="extrabold" color={colors.brand}>
                  {me.xp.total}
                </T>
                <T size="sm" color={colors.textMuted}>
                  {' '}
                  XP · مستوى {me.xp.level}
                </T>
              </View>
            </View>
            <View style={{ alignItems: 'center' }}>
              <T size="xxl" weight="extrabold" color={colors.streak}>
                🔥 {me.xp.current_streak}
              </T>
              <T size="xs" color={colors.textMuted}>
                يوم متواصل
              </T>
            </View>
          </View>
          <View style={{ marginTop: spacing.md }}>
            <ProgressBar percent={me.xp.percent_to_next} />
            <T size="xs" color={colors.textMuted} style={{ marginTop: spacing.xs }}>
              فاضل {me.xp.xp_to_next} نقطة للمستوى {me.xp.level + 1}
            </T>
          </View>
        </Card>
      ) : null}

      {/* No upsell card in reader mode — Apple 3.1.3(a) forbids a call to
          action pointing at an external purchase. The free-courses
          section below is the only thing a non-subscriber is nudged
          toward, and it costs nothing. */}
      {CAN_SHOW_PURCHASE_CTA && !me?.access.has_subscription ? (
        <Card style={{ marginTop: spacing.lg, borderColor: colors.brand }}>
          <T weight="bold">افتح كل الكورسات</T>
          <T size="sm" color={colors.textMuted} style={{ marginTop: spacing.xs }}>
            الاشتراك السنوي بيفتحلك المكتبة كاملة + المساعد الذكي + الشهادات.
          </T>
        </Card>
      ) : null}

      {free.length > 0 && (
        <Section title="🎁 كورسات مجانية" subtitle="ابدأ من غير ما تدفع حاجة">
          {free.map((c) => (
            <CourseRow key={c.id} course={c} />
          ))}
        </Section>
      )}

      <Section title="📚 كل الكورسات">
        {rest.map((c) => (
          <CourseRow key={c.id} course={c} />
        ))}
      </Section>
    </ScrollView>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={{ marginTop: spacing.xxl, gap: spacing.md }}>
      <View>
        <T size="lg" weight="extrabold">
          {title}
        </T>
        {subtitle ? (
          <T size="sm" color={colors.textMuted}>
            {subtitle}
          </T>
        ) : null}
      </View>
      {children}
    </View>
  );
}

export function CourseRow({ course }: { course: CourseListItem }) {
  return (
    <Link href={`/course/${course.slug}`} asChild>
      <Card>
        <View style={styles.rowStart}>
          <View style={{ flex: 1, gap: 4 }}>
            <View style={styles.tags}>
              {course.is_free ? <Badge label="🎁 مجاني" tone="free" /> : null}
              {course.yearly_only ? <Badge label="👑 سنوي" tone="gold" /> : null}
              {!course.unlocked && !course.is_free ? <Badge label="🔒 مقفول" /> : null}
            </View>
            <T weight="bold" numberOfLines={2}>
              {course.title}
            </T>
            <T size="xs" color={colors.textMuted}>
              {course.total_lessons} درس · {formatDuration(course.total_duration_sec)}
              {course.instructor ? ` · ${course.instructor}` : ''}
            </T>
          </View>
        </View>
      </Card>
    </Link>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.lg, paddingBottom: spacing.xxl * 2 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  rowStart: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  rowBaseline: { flexDirection: 'row', alignItems: 'baseline' },
  tags: { flexDirection: 'row', gap: spacing.xs, flexWrap: 'wrap' },
});
