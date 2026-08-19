import { useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import {
  REPORT_REASONS,
  REPORT_REASON_LABELS,
  blockUser,
  reportContent,
  type ReportReason,
} from '../lib/community';
import { Button, T } from './ui';
import { colors, radius, spacing } from '../lib/theme';

/**
 * Report / block sheet.
 *
 * App Store guideline 1.2 requires an app with user-generated content to
 * offer BOTH — a way to flag content for us to review, and a way for the
 * user to make an abusive account disappear from their own feed
 * immediately, without waiting on moderation.
 *
 * Blocking takes effect on the next refresh because the filter lives in
 * the feed RPC, so `onDone` reloads the caller's list.
 */
export function ReportSheet({
  visible,
  onClose,
  onDone,
  targetType,
  targetId,
  authorId,
  authorName,
}: {
  visible: boolean;
  onClose: () => void;
  onDone?: () => void;
  targetType: 'post' | 'comment';
  targetId: string;
  authorId: string;
  authorName: string;
}) {
  const [reason, setReason] = useState<ReportReason>('spam');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    try {
      await reportContent({ targetType, targetId, reason, note });
      onClose();
      Alert.alert('وصلنا بلاغك', 'هنراجعه في أقرب وقت. شكراً ليك.');
      onDone?.();
    } catch (e: any) {
      Alert.alert('حصلت مشكلة', e.message);
    } finally {
      setBusy(false);
    }
  }

  function confirmBlock() {
    Alert.alert(
      `تحظر ${authorName}؟`,
      'مش هتشوف بوستاته ولا تعليقاته تاني. تقدر تلغي الحظر من حسابك في أي وقت.',
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'احظر',
          style: 'destructive',
          onPress: async () => {
            try {
              await blockUser(authorId);
              onClose();
              Alert.alert('تم الحظر', 'مش هتشوف محتوى الشخص ده تاني.');
              onDone?.();
            } catch (e: any) {
              Alert.alert('حصلت مشكلة', e.message);
            }
          },
        },
      ]
    );
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.sheet}>
        <ScrollView keyboardShouldPersistTaps="handled">
          <T size="lg" weight="extrabold">
            بلّغ عن {targetType === 'post' ? 'البوست' : 'التعليق'}
          </T>
          <T size="sm" color={colors.textMuted} style={{ marginTop: spacing.xs }}>
            اختار السبب وهنراجعه بنفسنا.
          </T>

          <View style={{ marginTop: spacing.lg, gap: spacing.sm }}>
            {REPORT_REASONS.map((r) => (
              <Pressable
                key={r}
                onPress={() => setReason(r)}
                style={[styles.option, reason === r && styles.optionActive]}
              >
                <T size="sm" weight={reason === r ? 'bold' : 'normal'}>
                  {reason === r ? '● ' : '○ '}
                  {REPORT_REASON_LABELS[r]}
                </T>
              </Pressable>
            ))}
          </View>

          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="تفاصيل زيادة (اختياري)"
            placeholderTextColor={colors.textFaint}
            multiline
            maxLength={1000}
            style={styles.note}
          />

          <View style={{ gap: spacing.sm, marginTop: spacing.lg }}>
            <Button label="ابعت البلاغ" onPress={submit} loading={busy} />
            <Button
              label={`احظر ${authorName}`}
              variant="outline"
              onPress={confirmBlock}
            />
            <Button label="إلغاء" variant="ghost" onPress={onClose} />
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.xl,
    maxHeight: '85%',
  },
  option: {
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  optionActive: { borderColor: colors.brand, backgroundColor: colors.brandLight },
  note: {
    marginTop: spacing.lg,
    minHeight: 80,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: 15,
    color: colors.text,
    textAlign: 'right',
    textAlignVertical: 'top',
  },
});
