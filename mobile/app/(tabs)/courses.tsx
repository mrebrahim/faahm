import { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, TextInput, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { api, type CourseListItem } from '../../src/lib/api';
import { track } from '../../src/lib/analytics';
import { EmptyState, ErrorState, Loading, T } from '../../src/components/ui';
import { CourseRow } from '../../src/components/course-row';
import { colors, radius, spacing } from '../../src/lib/theme';

type Filter = 'all' | 'free' | 'mine';

export default function CoursesScreen() {
  const [courses, setCourses] = useState<CourseListItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  // Honour ?free=1 from the home screen's "كورسات مجانية" link —
  // otherwise that link lands on an unfiltered catalog and the section
  // it came from looks meaningless.
  const { free } = useLocalSearchParams<{ free?: string }>();
  const [filter, setFilter] = useState<Filter>(free === '1' ? 'free' : 'all');
  const [query, setQuery] = useState('');

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await api.courses();
      setCourses(res.courses);
      track('course_list_viewed', { count: res.count });
    } catch (e: any) {
      setError(e.message);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const visible = useMemo(() => {
    if (!courses) return [];
    const q = query.trim();
    return courses.filter((c) => {
      if (filter === 'free' && !c.is_free) return false;
      if (filter === 'mine' && !c.unlocked) return false;
      if (q && !c.title.includes(q)) return false;
      return true;
    });
  }, [courses, filter, query]);

  if (error && !courses) return <ErrorState message={error} onRetry={load} />;
  if (!courses) return <Loading />;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={styles.header}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="ابحث عن كورس…"
          placeholderTextColor={colors.textFaint}
          style={styles.search}
        />
        {/* Chips scroll sideways rather than wrapping — same rule as web. */}
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={
            [
              { key: 'all', label: 'الكل' },
              { key: 'free', label: '🎁 مجاني' },
              { key: 'mine', label: '✅ المفتوح ليا' },
            ] as Array<{ key: Filter; label: string }>
          }
          keyExtractor={(i) => i.key}
          contentContainerStyle={{ gap: spacing.sm, paddingVertical: spacing.md }}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => setFilter(item.key)}
              style={[styles.chip, filter === item.key && styles.chipActive]}
            >
              <T size="sm" weight="bold" color={filter === item.key ? '#fff' : colors.textMuted}>
                {item.label}
              </T>
            </Pressable>
          )}
        />
      </View>

      <FlatList
        data={visible}
        keyExtractor={(c) => c.id}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
        renderItem={({ item }) => <CourseRow course={item} />}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await load();
              setRefreshing(false);
            }}
          />
        }
        ListEmptyComponent={
          <EmptyState
            title="مفيش كورسات هنا"
            body={
              filter === 'mine'
                ? 'لسه مفتحتش أي كورس. ابدأ بواحد مجاني.'
                : 'جرّب تشيل الفلتر أو تبحث بكلمة تانية.'
            }
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  search: {
    minHeight: 46,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    fontSize: 15,
    color: colors.text,
    textAlign: 'right',
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  chipActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  list: { padding: spacing.lg, paddingBottom: spacing.xxl * 2 },
});
