import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { WebView } from 'react-native-webview';
import * as WebBrowser from 'expo-web-browser';
import { ApiError, api, type LessonPayload } from '../../src/lib/api';
import { useAuth } from '../../src/lib/auth-context';
import {
  CAN_SHOW_PURCHASE_CTA,
  lockedMessage,
  type LockReason,
} from '../../src/lib/store-policy';
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
  const router = useRouter();
  const { refresh } = useAuth();
  const [data, setData] = useState<LessonPayload | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [completing, setCompleting] = useState(false);
  const [question, setQuestion] = useState('');
  const [attachment, setAttachment] = useState('');
  const [asking, setAsking] = useState(false);

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

  async function askQuestion() {
    if (!id || question.trim().length < 5) {
      setToast('اكتب سؤالك بتفصيل شوية.');
      return;
    }
    setAsking(true);
    try {
      const res = await api.askQuestion(id, question.trim(), attachment.trim() || undefined);
      setQuestion('');
      setAttachment('');
      Alert.alert('وصلنا سؤالك ✅', res.message);
      // Reload so the pending question shows under the lesson — proof
      // to the asker that it actually landed.
      await load();
    } catch (e: any) {
      Alert.alert('حصلت مشكلة', e.message);
    } finally {
      setAsking(false);
    }
  }

  if (error) {
    // A 403 isn't an error state — it's the paywall, and it converts.
    if (error.status === 403) {
      const locked = lockedMessage((error.lockReason as LockReason) ?? null);
      return (
        <View style={styles.locked}>
          <T size="xl" weight="extrabold" align="center">
            {locked.title}
          </T>
          <T color={colors.textMuted} align="center" style={{ marginTop: spacing.sm }}>
            {locked.body}
          </T>
          {CAN_SHOW_PURCHASE_CTA ? (
            <Button
              label="شوف الباقات"
              style={{ marginTop: spacing.lg }}
              onPress={() => router.push('/subscribe')}
            />
          ) : null}
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

        {/* Lesson-to-lesson navigation. Without it the learner has to
            back out to the course page after every single lesson, which
            is the difference between finishing a course and abandoning
            it halfway. `replace` rather than `push` so the back stack
            doesn't grow one entry per lesson watched. */}
        <View style={styles.nav}>
          {data.nav.previous ? (
            <Button
              label="⟶ السابق"
              variant="outline"
              style={{ flex: 1 }}
              onPress={() => router.replace(`/lesson/${data.nav.previous!.id}`)}
            />
          ) : (
            <View style={{ flex: 1 }} />
          )}

          {data.nav.next ? (
            <Button
              label={data.nav.next.playable ? 'التالي ⟵' : '🔒 التالي'}
              variant={data.nav.next.playable ? 'primary' : 'outline'}
              disabled={!data.nav.next.playable}
              style={{ flex: 1 }}
              onPress={() => router.replace(`/lesson/${data.nav.next!.id}`)}
            />
          ) : (
            <View style={{ flex: 1 }} />
          )}
        </View>

        {data.nav.index ? (
          <T size="xs" color={colors.textFaint} align="center" style={{ marginTop: spacing.sm }}>
            الدرس {data.nav.index} من {data.nav.total}
          </T>
        ) : null}

        {data.nav.next ? (
          <T size="sm" color={colors.textMuted} align="center" style={{ marginTop: spacing.xs }}>
            التالي: {data.nav.next.title}
          </T>
        ) : (
          <T size="sm" color={colors.brand} weight="bold" align="center" style={{ marginTop: spacing.xs }}>
            🎉 ده آخر درس في الكورس
          </T>
        )}

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
        {/* Q&A. Sits under the lesson because that's where someone
            realises they didn't follow it — asking from a support page
            three taps away loses the context of which lesson and which
            moment. */}
        <View style={{ marginTop: spacing.xxl, gap: spacing.md }}>
          <T size="lg" weight="extrabold">
            🙋 مش فاهم حاجة؟
          </T>
          <T size="sm" color={colors.textMuted}>
            اسأل وفريق فاهم هيرد عليك، والرد هيوصلك على الإيميل.
          </T>

          <TextInput
            value={question}
            onChangeText={setQuestion}
            placeholder="اكتب سؤالك عن الدرس ده…"
            placeholderTextColor={colors.textFaint}
            multiline
            maxLength={2000}
            style={styles.questionInput}
          />
          <TextInput
            value={attachment}
            onChangeText={setAttachment}
            placeholder="https://drive.google.com/... (اختياري)"
            placeholderTextColor={colors.textFaint}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            style={[styles.questionInput, { minHeight: 48, textAlign: 'left' }]}
          />
          <T size="xs" color={colors.textFaint}>
            عندك صورة أو فيديو يوضّح المشكلة؟ ارفعه على Google Drive أو YouTube
            وحط اللينك هنا.{'\n'}
            ⚠️ لو على Drive: اضغط Share وغيّر Restricted لـ "Anyone with the
            link" — من غير كده مش هنقدر نفتحه.
          </T>
          <Button label="ابعت السؤال" onPress={askQuestion} loading={asking} />

          {data.questions.length > 0 ? (
            <View style={{ gap: spacing.md, marginTop: spacing.md }}>
              {data.questions.map((q) => (
                <Card key={q.id}>
                  <View style={styles.qMeta}>
                    <T size="xs" weight="bold" numberOfLines={1} style={{ flex: 1 }}>
                      {q.is_mine ? 'سؤالك' : q.asker_name}
                    </T>
                    {q.status === 'pending' ? (
                      <T size="xs" color={colors.gold}>
                        ⏳ مستني الرد
                      </T>
                    ) : null}
                  </View>
                  <T size="sm" style={{ marginTop: spacing.xs }}>
                    {q.question}
                  </T>
                  {q.attachment_url ? (
                    <Pressable
                      onPress={() => Linking.openURL(q.attachment_url!)}
                      hitSlop={8}
                      style={{ marginTop: spacing.xs }}
                    >
                      <T size="xs" color={colors.brand}>
                        📎 مرفق
                      </T>
                    </Pressable>
                  ) : null}
                  {q.answer ? (
                    <View style={styles.answer}>
                      <T size="xs" weight="bold" color={colors.brandDark}>
                        رد فاهم
                      </T>
                      <T size="sm" style={{ marginTop: 2 }}>
                        {q.answer}
                      </T>
                    </View>
                  ) : null}
                </Card>
              ))}
            </View>
          ) : null}
        </View>
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
  questionInput: {
    minHeight: 90,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: 15,
    color: colors.text,
    backgroundColor: '#fff',
    textAlign: 'right',
    textAlignVertical: 'top',
  },
  qMeta: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  answer: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.brandLight,
  },
  nav: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.md },
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
