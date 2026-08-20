import { useCallback, useState } from 'react';
import { Linking, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useAuth } from '../../src/lib/auth-context';
import { API_BASE_URL, getAccessToken } from '../../src/lib/supabase';
import { Badge, Button, Card, Loading, ProgressBar, T } from '../../src/components/ui';
import { CourseImage } from '../../src/components/course-image';
import { CourseRow } from '../../src/components/course-row';
import type { CourseListItem } from '../../src/lib/api';
import { colors, radius, spacing } from '../../src/lib/theme';

/**
 * Home.
 *
 * Everything comes from ONE call to /api/mobile/home. Five parallel
 * fetches would each be a chance to hang on a 3G connection, and the
 * screen would assemble itself in visible pieces.
 *
 * Deliberately NOT a sales screen. Somebody opening the app hasn't shown
 * intent yet — the subscribe prompt belongs on the course they actually
 * tapped into. What's here is what brings them back tomorrow: where they
 * left off, their points, what's new, and what people are talking about.
 */
type HomeData = {
  xp: {
    total: number;
    level: number;
    percent_to_next: number;
    xp_to_next: number;
    current_streak: number;
  } | null;
  has_subscription: boolean;
  continue_lesson: {
    lesson_id: string;
    lesson_title: string;
    course_slug: string;
    course_title: string;
  } | null;
  courses: CourseListItem[];
  news: Array<{
    id: string;
    slug: string;
    title: string;
    excerpt: string | null;
    cover_image_url: string | null;
    reading_time_min: number | null;
    url: string;
  }>;
  community: Array<{
    id: string;
    author_name: string;
    title: string | null;
    body: string;
    comment_count: number;
    like_count: number;
    group_name: string | null;
  }>;
};

const EMPTY: HomeData = {
  xp: null,
  has_subscription: false,
  continue_lesson: null,
  courses: [],
  news: [],
  community: [],
};

export default function HomeScreen() {
  const { me, refresh } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<HomeData | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const token = await getAccessToken();
      const res = await fetch(`${API_BASE_URL}/api/mobile/home`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      // A 404 returns an HTML error page, and .json() on that throws
      // "Unexpected character: <" — check the type before parsing.
      const type = res.headers.get('content-type') ?? '';
      if (!res.ok || !type.includes('application/json')) throw new Error('bad response');
      setData(await res.json());
    } catch {
      // Show an empty-but-valid shell rather than blocking on an error
      // screen; pull-to-refresh is right there.
      setData((prev) => prev ?? EMPTY);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (!data) return <Loading />;

  const firstName = me?.user.full_name?.split(' ')[0] || 'يا بطل';

  return (
    <ScrollView
      contentContainerStyle={styles.scroll}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={async () => {
            setRefreshing(true);
            await Promise.all([load(), refresh()]);
            setRefreshing(false);
          }}
        />
      }
    >
      <T size="xxl" weight="extrabold">
        أهلاً، {firstName} 👋
      </T>

      {/* Resume — the most useful thing a learning app can put up front. */}
      {data.continue_lesson ? (
        <Card
          style={styles.resume}
          onPress={() => router.push(`/lesson/${data.continue_lesson!.lesson_id}`)}
        >
          <T size="xs" color="rgba(255,255,255,0.85)">
            كمّل من حيث ما وقفت
          </T>
          <T size="lg" weight="bold" color="#fff" numberOfLines={2} style={{ marginTop: 2 }}>
            {data.continue_lesson.lesson_title}
          </T>
          <T size="xs" color="rgba(255,255,255,0.85)" numberOfLines={1}>
            {data.continue_lesson.course_title}
          </T>
          <T size="sm" weight="bold" color="#fff" style={{ marginTop: spacing.md }}>
            ▶ كمّل الدرس
          </T>
        </Card>
      ) : null}

      {data.xp ? (
        <Card style={{ marginTop: spacing.lg }} onPress={() => router.push('/(tabs)/xp')}>
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <T size="sm" color={colors.textMuted}>
                نقاطك
              </T>
              <View style={styles.baseline}>
                <T size="display" weight="extrabold" color={colors.brand}>
                  {data.xp.total}
                </T>
                <T size="sm" color={colors.textMuted}>
                  {' '}
                  XP · مستوى {data.xp.level}
                </T>
              </View>
            </View>
            <View style={{ alignItems: 'center' }}>
              <T size="xxl" weight="extrabold" color={colors.streak}>
                🔥 {data.xp.current_streak}
              </T>
              <T size="xs" color={colors.textMuted}>
                يوم متواصل
              </T>
            </View>
          </View>
          <View style={{ marginTop: spacing.md }}>
            <ProgressBar percent={data.xp.percent_to_next} />
            <T size="xs" color={colors.textMuted} style={{ marginTop: spacing.xs }}>
              فاضل {data.xp.xp_to_next} نقطة للمستوى {data.xp.level + 1}
            </T>
          </View>
        </Card>
      ) : null}

      {/* News = the blog. Same articles the website ranks on. */}
      {data.news.length > 0 ? (
        <Section title="📰 جديد المدونة">
          {data.news.slice(0, 3).map((n) => (
            <Card
              key={n.id}
              style={{ padding: 0, overflow: 'hidden' }}
              onPress={() => Linking.openURL(n.url)}
            >
              {n.cover_image_url ? <CourseImage url={n.cover_image_url} /> : null}
              <View style={styles.cardBody}>
                <T weight="bold" numberOfLines={2}>
                  {n.title}
                </T>
                {n.excerpt ? (
                  <T size="sm" color={colors.textMuted} numberOfLines={2}>
                    {n.excerpt}
                  </T>
                ) : null}
                {n.reading_time_min ? (
                  <T size="xs" color={colors.textFaint}>
                    {n.reading_time_min} دقيقة قراءة
                  </T>
                ) : null}
              </View>
            </Card>
          ))}
        </Section>
      ) : null}

      {data.community.length > 0 ? (
        <Section
          title="👥 من الكوميونيتي"
          action={{ label: 'الكل', onPress: () => router.push('/(tabs)/community') }}
        >
          {data.community.slice(0, 3).map((p) => (
            <Card key={p.id} onPress={() => router.push(`/post/${p.id}`)}>
              <View style={styles.metaRow}>
                <T size="xs" weight="bold" numberOfLines={1} style={{ maxWidth: 130 }}>
                  {p.author_name}
                </T>
                {p.group_name ? <Badge label={p.group_name} tone="brand" /> : null}
              </View>
              {p.title ? (
                <T weight="bold" numberOfLines={1} style={{ marginTop: 4 }}>
                  {p.title}
                </T>
              ) : null}
              <T size="sm" color={colors.textMuted} numberOfLines={2} style={{ marginTop: 2 }}>
                {p.body}
              </T>
              <T size="xs" color={colors.textFaint} style={{ marginTop: spacing.sm }}>
                ❤️ {p.like_count} · 💬 {p.comment_count}
              </T>
            </Card>
          ))}
        </Section>
      ) : null}

      <Section
        title="📚 كورسات"
        action={{ label: 'الكل', onPress: () => router.push('/(tabs)/courses') }}
      >
        {data.courses.slice(0, 6).map((c) => (
          <CourseRow key={c.id} course={c} />
        ))}
      </Section>
    </ScrollView>
  );
}

function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: { label: string; onPress: () => void };
  children: React.ReactNode;
}) {
  return (
    <View style={{ marginTop: spacing.xxl, gap: spacing.md }}>
      <View style={styles.sectionHead}>
        <T size="lg" weight="extrabold" style={{ flex: 1 }}>
          {title}
        </T>
        {action ? (
          <Button
            label={action.label}
            variant="ghost"
            onPress={action.onPress}
            style={styles.sectionBtn}
          />
        ) : null}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.lg, paddingBottom: spacing.xxl * 2 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  baseline: { flexDirection: 'row', alignItems: 'baseline' },
  cardBody: { padding: spacing.lg, gap: 4 },
  metaRow: { flexDirection: 'row', gap: spacing.xs, flexWrap: 'wrap', alignItems: 'center' },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  sectionBtn: { paddingHorizontal: spacing.md, minHeight: 32 },
  resume: {
    marginTop: spacing.lg,
    backgroundColor: colors.brand,
    borderColor: colors.brand,
    borderRadius: radius.lg,
  },
});
