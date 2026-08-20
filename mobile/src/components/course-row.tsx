import { StyleSheet, View } from 'react-native';
import { Link } from 'expo-router';
import type { CourseListItem } from '../lib/api';
import { Badge, Card, T } from './ui';
import { CourseImage } from './course-image';
import { colors, formatDuration, spacing } from '../lib/theme';

/**
 * One course card. Lives here rather than inside a screen because both
 * the home screen and the catalog render it, and a shared component
 * imported from a route file is how the two quietly drift apart.
 *
 * One column by design: at 360px a two-up grid clips Arabic titles.
 */
export function CourseRow({ course }: { course: CourseListItem }) {
  return (
    <Link href={`/course/${course.slug}`} asChild>
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        <CourseImage url={course.thumbnail_url} />
        <View style={styles.body}>
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
      </Card>
    </Link>
  );
}

const styles = StyleSheet.create({
  body: { padding: spacing.lg, gap: 4 },
  tags: { flexDirection: 'row', gap: spacing.xs, flexWrap: 'wrap' },
});
