import { useCallback, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import {
  POST_KINDS,
  POST_KIND_LABELS,
  fetchFeed,
  toggleLike,
  timeAgoAr,
  type FeedPost,
  type PostKind,
} from '../../src/lib/community';
import { useAuth } from '../../src/lib/auth-context';
import { track } from '../../src/lib/analytics';
import { Avatar, Badge, Card, EmptyState, ErrorState, Loading, T } from '../../src/components/ui';
import { colors, radius, spacing } from '../../src/lib/theme';

export default function CommunityScreen() {
  const router = useRouter();
  const { me } = useAuth();
  const [posts, setPosts] = useState<FeedPost[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [kind, setKind] = useState<PostKind | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const feed = await fetchFeed({ kind });
      setPosts(feed);
      track('community_viewed', { filter: kind ?? 'all', post_count: feed.length });
    } catch (e: any) {
      setError(e.message);
    }
  }, [kind]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  /**
   * Optimistic like: flip locally first so the tap feels instant on a
   * slow connection, then reconcile. On failure we put the old state
   * back rather than leaving a lie on screen.
   */
  const onLike = useCallback(async (post: FeedPost) => {
    const wasLiked = post.liked_by_me;
    setPosts((prev) =>
      (prev ?? []).map((p) =>
        p.id === post.id
          ? { ...p, liked_by_me: !wasLiked, like_count: p.like_count + (wasLiked ? -1 : 1) }
          : p
      )
    );
    try {
      await toggleLike('post', post.id, wasLiked);
      if (!wasLiked) track('community_post_liked', { post_id: post.id });
    } catch {
      setPosts((prev) =>
        (prev ?? []).map((p) =>
          p.id === post.id
            ? { ...p, liked_by_me: wasLiked, like_count: p.like_count + (wasLiked ? 1 : -1) }
            : p
        )
      );
    }
  }, []);

  if (error && !posts) return <ErrorState message={error} onRetry={load} />;
  if (!posts) return <Loading />;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={styles.header}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={[null, ...POST_KINDS]}
          keyExtractor={(k) => k ?? 'all'}
          contentContainerStyle={{ gap: spacing.sm, paddingVertical: spacing.md }}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => setKind(item)}
              style={[styles.chip, kind === item && styles.chipActive]}
            >
              <T size="sm" weight="bold" color={kind === item ? '#fff' : colors.textMuted}>
                {item ? POST_KIND_LABELS[item] : 'الكل'}
              </T>
            </Pressable>
          )}
        />
      </View>

      <FlatList
        data={posts}
        keyExtractor={(p) => p.id}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
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
        renderItem={({ item }) => (
          <PostCard post={item} onPress={() => router.push(`/post/${item.id}`)} onLike={() => onLike(item)} />
        )}
        ListEmptyComponent={
          <EmptyState
            title="لسه مفيش بوستات"
            body="كن أول واحد يكسر السكوت — اسأل سؤالك أو شارك حاجة اتعلمتها."
          />
        }
      />

      {me?.access.can_post_community ? (
        <Pressable style={styles.fab} onPress={() => router.push('/post/new')}>
          <T size="xxl" color="#fff" align="center">
            +
          </T>
        </Pressable>
      ) : null}
    </View>
  );
}

export function PostCard({
  post,
  onPress,
  onLike,
}: {
  post: FeedPost;
  onPress: () => void;
  onLike: () => void;
}) {
  return (
    <Card onPress={onPress}>
      <View style={styles.row}>
        <Avatar name={post.author_name} url={post.author_avatar} size={38} />
        <View style={{ flex: 1, gap: 4 }}>
          <View style={styles.meta}>
            <T size="sm" weight="bold" numberOfLines={1} style={{ maxWidth: 140 }}>
              {post.author_name}
            </T>
            <Badge label={`Lv ${post.author_level}`} tone="brand" />
            <T size="xs" color={colors.textFaint}>
              {timeAgoAr(post.created_at)}
            </T>
          </View>

          <View style={styles.meta}>
            <Badge label={POST_KIND_LABELS[post.kind]} />
            {post.course_title ? (
              <T size="xs" color={colors.textFaint} numberOfLines={1} style={{ flex: 1 }}>
                {post.course_title}
              </T>
            ) : null}
          </View>

          {post.title ? (
            <T weight="bold" numberOfLines={2}>
              {post.title}
            </T>
          ) : null}
          <T size="sm" color={colors.textMuted} numberOfLines={3}>
            {post.body}
          </T>

          <View style={[styles.meta, { marginTop: spacing.sm, gap: spacing.lg }]}>
            <Pressable onPress={onLike} hitSlop={8}>
              <T size="sm" color={post.liked_by_me ? colors.like : colors.textMuted}>
                {post.liked_by_me ? '❤️' : '🤍'} {post.like_count || ''}
              </T>
            </Pressable>
            <T size="sm" color={colors.textMuted}>
              💬 {post.comment_count || 'علّق'}
            </T>
          </View>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
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
  list: { padding: spacing.lg, paddingBottom: spacing.xxl * 3 },
  row: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  meta: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  fab: {
    position: 'absolute',
    bottom: spacing.xl,
    // `start` (not `left`) so the FAB lands on the correct side under RTL.
    start: spacing.xl,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
});
