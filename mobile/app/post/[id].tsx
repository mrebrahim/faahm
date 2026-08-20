import { useCallback, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import {
  POST_KIND_LABELS,
  createComment,
  deletePost,
  fetchPost,
  fetchThread,
  timeAgoAr,
  toggleLike,
  type FeedPost,
  type ThreadComment,
} from '../../src/lib/community';
import { useAuth } from '../../src/lib/auth-context';
import { track } from '../../src/lib/analytics';
import { Avatar, Badge, Button, Card, ErrorState, Loading, T } from '../../src/components/ui';
import { ReportSheet } from '../../src/components/report-sheet';
import { colors, radius, spacing } from '../../src/lib/theme';

export default function PostScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { me } = useAuth();
  const [post, setPost] = useState<FeedPost | null>(null);
  const [comments, setComments] = useState<ThreadComment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [replyTo, setReplyTo] = useState<ThreadComment | null>(null);
  const [sending, setSending] = useState(false);
  const [reporting, setReporting] = useState<{
    targetType: 'post' | 'comment';
    targetId: string;
    authorId: string;
    authorName: string;
  } | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setError(null);
    try {
      const [p, thread] = await Promise.all([fetchPost(id), fetchThread(id)]);
      setPost(p);
      setComments(thread);
    } catch (e: any) {
      setError(e.message);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function send() {
    if (!id || !draft.trim()) return;
    setSending(true);
    try {
      await createComment({ postId: id, body: draft, parentId: replyTo?.id ?? null });
      track('community_comment_created', { post_id: id, is_reply: Boolean(replyTo) });
      setDraft('');
      setReplyTo(null);
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSending(false);
    }
  }

  async function like(target: 'post' | 'comment', targetId: string, liked: boolean) {
    try {
      await toggleLike(target, targetId, liked);
      await load();
    } catch {
      // Silent — the next refresh reconciles.
    }
  }

  if (error && !post) return <ErrorState message={error} onRetry={load} />;
  if (!post) return <Loading />;

  const roots = comments.filter((c) => !c.parent_id);
  const repliesOf = (parentId: string) => comments.filter((c) => c.parent_id === parentId);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <ScrollView contentContainerStyle={styles.scroll}>
        <Card>
          <View style={styles.row}>
            <Avatar name={post.author_name} url={post.author_avatar} size={40} />
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
              <Badge label={POST_KIND_LABELS[post.kind]} />
            </View>
          </View>

          {post.title ? (
            <T size="xl" weight="extrabold" style={{ marginTop: spacing.md }}>
              {post.title}
            </T>
          ) : null}
          <T style={{ marginTop: spacing.sm }}>{post.body}</T>

          <View style={[styles.meta, { marginTop: spacing.lg, gap: spacing.xl }]}>
            <Pressable onPress={() => like('post', post.id, post.liked_by_me)} hitSlop={8}>
              <T size="sm" color={post.liked_by_me ? colors.like : colors.textMuted}>
                {post.liked_by_me ? '❤️' : '🤍'} {post.like_count || ''}
              </T>
            </Pressable>
            {post.is_mine ? (
              <Pressable
                onPress={async () => {
                  await deletePost(post.id);
                  router.back();
                }}
                hitSlop={8}
              >
                <T size="sm" color={colors.danger}>
                  حذف
                </T>
              </Pressable>
            ) : (
              <Pressable
                onPress={() =>
                  setReporting({
                    targetType: 'post',
                    targetId: post.id,
                    authorId: post.user_id,
                    authorName: post.author_name,
                  })
                }
                hitSlop={8}
              >
                <T size="sm" color={colors.textMuted}>
                  🚩 بلّغ
                </T>
              </Pressable>
            )}
          </View>
        </Card>

        <T size="lg" weight="extrabold" style={{ marginTop: spacing.xxl }}>
          {post.comment_count > 0 ? `${post.comment_count} تعليق` : 'التعليقات'}
        </T>

        <View style={{ marginTop: spacing.md, gap: spacing.md }}>
          {roots.length === 0 ? (
            <T color={colors.textMuted}>مفيش تعليقات لسه. قول رأيك 👇</T>
          ) : (
            roots.map((c) => (
              <View key={c.id} style={{ gap: spacing.md }}>
                <CommentCard
                  comment={c}
                  onLike={() => like('comment', c.id, c.liked_by_me)}
                  onReply={() => setReplyTo(c)}
                  onReport={() =>
                    setReporting({
                      targetType: 'comment',
                      targetId: c.id,
                      authorId: c.user_id,
                      authorName: c.author_name,
                    })
                  }
                  canReply={!!me?.access.can_post_community && !post.is_locked}
                />
                {repliesOf(c.id).map((r) => (
                  <View key={r.id} style={{ marginStart: spacing.xl }}>
                    <CommentCard
                      comment={r}
                      onLike={() => like('comment', r.id, r.liked_by_me)}
                      onReport={() =>
                        setReporting({
                          targetType: 'comment',
                          targetId: r.id,
                          authorId: r.user_id,
                          authorName: r.author_name,
                        })
                      }
                      canReply={false}
                    />
                  </View>
                ))}
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {me?.access.can_post_community && !post.is_locked ? (
        <View style={styles.composer}>
          {replyTo ? (
            <Pressable onPress={() => setReplyTo(null)}>
              <T size="xs" color={colors.brand}>
                بترد على {replyTo.author_name} — اضغط للإلغاء
              </T>
            </Pressable>
          ) : null}
          <View style={styles.composerRow}>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder="اكتب تعليقك…"
              placeholderTextColor={colors.textFaint}
              multiline
              style={styles.input}
            />
            <Button
              label="ابعت"
              onPress={send}
              loading={sending}
              disabled={!draft.trim()}
              style={{ paddingHorizontal: spacing.lg, minHeight: 44 }}
            />
          </View>
        </View>
      ) : null}

      {reporting ? (
        <ReportSheet
          visible
          onClose={() => setReporting(null)}
          onDone={load}
          targetType={reporting.targetType}
          targetId={reporting.targetId}
          authorId={reporting.authorId}
          authorName={reporting.authorName}
        />
      ) : null}
    </KeyboardAvoidingView>
  );
}

function CommentCard({
  comment,
  onLike,
  onReply,
  onReport,
  canReply,
}: {
  comment: ThreadComment;
  onLike: () => void;
  onReply?: () => void;
  onReport?: () => void;
  canReply: boolean;
}) {
  return (
    <Card>
      <View style={styles.row}>
        <Avatar name={comment.author_name} url={comment.author_avatar} size={32} />
        <View style={{ flex: 1, gap: 4 }}>
          <View style={styles.meta}>
            <T size="sm" weight="bold" numberOfLines={1} style={{ maxWidth: 130 }}>
              {comment.author_name}
            </T>
            <Badge label={`Lv ${comment.author_level}`} tone="brand" />
            <T size="xs" color={colors.textFaint}>
              {timeAgoAr(comment.created_at)}
            </T>
          </View>
          <T size="sm">{comment.body}</T>
          <View style={[styles.meta, { gap: spacing.lg, marginTop: spacing.xs }]}>
            <Pressable onPress={onLike} hitSlop={8}>
              <T size="xs" color={comment.liked_by_me ? colors.like : colors.textMuted}>
                {comment.liked_by_me ? '❤️' : '🤍'} {comment.like_count || ''}
              </T>
            </Pressable>
            {canReply && onReply ? (
              <Pressable onPress={onReply} hitSlop={8}>
                <T size="xs" color={colors.brand}>
                  رد
                </T>
              </Pressable>
            ) : null}
            {!comment.is_mine && onReport ? (
              <Pressable onPress={onReport} hitSlop={8}>
                <T size="xs" color={colors.textFaint}>
                  🚩 بلّغ
                </T>
              </Pressable>
            ) : null}
          </View>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.lg, paddingBottom: spacing.xxl * 2 },
  row: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  meta: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  composer: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.card,
    padding: spacing.md,
    gap: spacing.sm,
  },
  composerRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-end' },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    fontSize: 15,
    color: colors.text,
    textAlign: 'right',
  },
});
