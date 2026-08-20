import { useCallback, useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { WebView } from 'react-native-webview';
import * as WebBrowser from 'expo-web-browser';
import { ApiError, api, type LessonPayload } from '../../src/lib/api';
import { useAuth } from '../../src/lib/auth-context';
import { lockedMessage } from '../../src/lib/store-policy';
import { track } from '../../src/lib/analytics';
import { Button, Card, ErrorState, Loading, T } from '../../src/components/ui';
import { colors, formatDuration, radius, spacing } from '../../src/lib/theme';

/**
 * Lesson player.
 *
 * Bunny is an iframe embed, so the video renders in a WebView rather
 * than a native player. That costs us precise playback events — the
 * WebView won't tell us the current time — so progress is tracked by
 * WALL-CLOCK time on screen instead: we assume a lesson open in the
 * foreground is a lesson being watched, and tick every 20s.
 *
 * It's an approximation, and it's the same one the web player makes.
 * The server still owns the 90%-complete rule and the XP award, so the
 * worst case is a slightly generous progress bar, never double XP.
 *
 * A native player (expo-video + Bunny HLS + signed URLs) is the Phase 3
 * upgrade — see docs/mobile-app-plan.md.
 */
const TICK_MS = 20_000;

export default function LessonScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { refresh } = useAuth();
  const [data, setData] = useState<LessonPayload | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [completing, setCompleting] = useState(false);

  const watchedRef = useRef(0);
  const startedAtRef = useRef<number | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setError(null);
    try {
      const payload = await api.lesson(id);
      setData(payload);
      track('lesson_started', {
        lesson_id: id,
        course_slug: payload.lesson.course.slug,
        duration_sec: payload.lesson.duration_sec,
        resumed: payload.progress.watched_sec > 0,
      });
      watchedRef.current = payload.progress.watched_sec;
      startedAtRef.current = Date.now();
    } catch (e: any) {
      setError(e instanceof ApiError ? e : new ApiError(0, 'error', e.message));
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  // Heartbeat. Cleared on unmount so a backgrounded lesson stops
  // accruing watch time the moment the user navigates away.
  useEffect(() => {
    if (!data?.playback || !id) return;

    const timer = setInterval(async () => {
      const started = startedAtRef.current;
      if (!started) return;
      const elapsed = (Date.now() - started) / 1000;
      startedAtRef.current = Date.now();
      watchedRef.current += elapsed;

      try {
        const res = await api.saveProgress(id, watchedRef.current);
        if (res.xp_awarded > 0) {
          track('lesson_completed', { lesson_id: id, trigger: 'auto' });
          track('xp_earned', { amount: res.xp_awarded, source: 'lesson', level: res.xp.level });
          setToast(`+${res.xp_awarded} XP 🎉`);
          refresh();
        }
      } catch {
        // Offline tick — keep counting locally and try again next time.
      }
    }, TICK_MS);

    return () => clearInterval(timer);
  }, [data?.playback, id, refresh]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  async function markComplete() {
    if (!id) return;
    setCompleting(true);
    try {
      const res = await api.saveProgress(id, watchedRef.current, true);
      setData((prev) =>
        prev ? { ...prev, progress: { ...prev.progress, is_completed: true } } : prev
      );
      track('lesson_completed', { lesson_id: id, trigger: 'manual' });
      if (res.xp_awarded > 0) {
        track('xp_earned', { amount: res.xp_awarded, source: 'lesson', level: res.xp.level });
      }
      setToast(res.xp_awarded > 0 ? `+${res.xp_awarded} XP 🎉` : 'تمام، خلصت الدرس ✅');
      refresh();
    } catch (e: any) {
      setToast(e.message);
    } finally {
      setCompleting(false);
    }
  }

  if (error) {
    // A 403 isn't an error state — it's the paywall, and it converts.
    if (error.status === 403) {
      const locked = lockedMessage(
        (error.lockReason as 'needs_yearly' | 'needs_subscription' | null) ?? null
      );
      return (
        <View style={styles.locked}>
          <T size="xl" weight="extrabold" align="center">
            {locked.title}
          </T>
          <T color={colors.textMuted} align="center" style={{ marginTop: spacing.sm }}>
            {locked.body}
          </T>
        </View>
      );
    }
    return <ErrorState message={error.message} onRetry={load} />;
  }

  if (!data) return <Loading />;

  return (
    <>
      <Stack.Screen options={{ title: data.lesson.title }} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.player}>
          {data.playback ? (
            <WebView
              source={{ uri: data.playback.url }}
              style={{ flex: 1, backgroundColor: '#000' }}
              allowsFullscreenVideo
              allowsInlineMediaPlayback
              mediaPlaybackRequiresUserAction={false}
              javaScriptEnabled
              domStorageEnabled
            />
          ) : (
            <View style={styles.noVideo}>
              <T color="#fff" align="center">
                الفيديو مش متاح دلوقتي.
              </T>
            </View>
          )}
        </View>

        <T size="xl" weight="extrabold" style={{ marginTop: spacing.lg }}>
          {data.lesson.title}
        </T>
        <T size="sm" color={colors.textMuted}>
          {data.lesson.course.title} · {formatDuration(data.lesson.duration_sec)}
        </T>

        {data.lesson.description ? (
          <T size="sm" color={colors.textMuted} style={{ marginTop: spacing.md }}>
            {data.lesson.description}
          </T>
        ) : null}

        <Button
          label={data.progress.is_completed ? '✅ خلصت الدرس ده' : 'خلصت الدرس'}
          variant={data.progress.is_completed ? 'outline' : 'primary'}
          disabled={data.progress.is_completed}
          loading={completing}
          onPress={markComplete}
          style={{ marginTop: spacing.xl }}
        />

        {data.attachments.length > 0 ? (
          <View style={{ marginTop: spacing.xxl, gap: spacing.md }}>
            <T size="lg" weight="extrabold">
              📎 ملفات الدرس
            </T>
            {data.attachments.map((a) => (
              <Card
                key={a.id}
                onPress={() => {
                  track('attachment_opened', { lesson_id: data.lesson.id, file_type: a.file_type ?? 'unknown' });
                  WebBrowser.openBrowserAsync(a.url);
                }}
              >
                <T size="sm" weight="bold" numberOfLines={2}>
                  {a.title}
                </T>
                {a.size_kb ? (
                  <T size="xs" color={colors.textFaint}>
                    {Math.round(a.size_kb)} KB
                  </T>
                ) : null}
              </Card>
            ))}
          </View>
        ) : null}
      </ScrollView>

      {toast ? (
        <View style={styles.toast}>
          <T color="#fff" weight="bold" align="center">
            {toast}
          </T>
        </View>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.lg, paddingBottom: spacing.xxl * 2 },
  player: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  noVideo: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  locked: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    backgroundColor: colors.bg,
  },
  toast: {
    position: 'absolute',
    bottom: spacing.xxl,
    alignSelf: 'center',
    backgroundColor: colors.brandDark,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
  },
});
