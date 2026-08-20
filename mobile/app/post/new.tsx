import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { POST_KINDS, POST_KIND_LABELS, createPost, type PostKind } from '../../src/lib/community';
import { Button, Card, T } from '../../src/components/ui';
import { track } from '../../src/lib/analytics';
import { colors, radius, spacing } from '../../src/lib/theme';

export default function NewPostScreen() {
  const router = useRouter();
  const { group } = useLocalSearchParams<{ group?: string }>();
  const [kind, setKind] = useState<PostKind>('discussion');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (body.trim().length < 2) {
      setError('اكتب حاجة الأول 🙂');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await createPost({ kind, title, body, groupId: group ?? null });
      track('community_post_created', { kind, has_title: Boolean(title.trim()), length: body.trim().length });
      // Back to the feed, not to the post — it isn't published yet, and
      // landing on a page that says "not found" would read as a failure.
      Alert.alert('وصلنا بوستك ✅', 'هيظهر للناس بعد مراجعة فريق فاهم.');
      router.back();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Card style={{ gap: spacing.lg }}>
          <View style={{ gap: spacing.sm }}>
            <T size="sm" weight="bold">
              نوع البوست
            </T>
            <View style={styles.chips}>
              {POST_KINDS.map((k) => (
                <Pressable
                  key={k}
                  onPress={() => setKind(k)}
                  style={[styles.chip, kind === k && styles.chipActive]}
                >
                  <T size="sm" weight="bold" color={kind === k ? '#fff' : colors.textMuted}>
                    {POST_KIND_LABELS[k]}
                  </T>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={{ gap: spacing.sm }}>
            <T size="sm" weight="bold">
              عنوان (اختياري)
            </T>
            <TextInput
              value={title}
              onChangeText={setTitle}
              maxLength={140}
              placeholder="مثلاً: ازاي أربط n8n بـ WhatsApp؟"
              placeholderTextColor={colors.textFaint}
              style={styles.input}
            />
          </View>

          <View style={{ gap: spacing.sm }}>
            <T size="sm" weight="bold">
              الكلام
            </T>
            <TextInput
              value={body}
              onChangeText={setBody}
              multiline
              maxLength={8000}
              placeholder="اكتب سؤالك أو شارك حاجة اتعلمتها…"
              placeholderTextColor={colors.textFaint}
              style={[styles.input, { minHeight: 160, textAlignVertical: 'top', paddingTop: spacing.md }]}
            />
          </View>

          {error ? (
            <T size="sm" color={colors.danger}>
              {error}
            </T>
          ) : null}

          <Button label="ابعت للمراجعة" onPress={submit} loading={busy} />
          <T size="xs" color={colors.textFaint} align="center">
            البوستات بتتراجع من فريق فاهم قبل ما تظهر للناس.
          </T>
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.lg, paddingBottom: spacing.xxl * 2 },
  chips: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    fontSize: 15,
    color: colors.text,
    backgroundColor: '#fff',
    textAlign: 'right',
  },
});
