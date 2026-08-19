import { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { api, type XpPayload } from '../../src/lib/api';
import { Avatar, Card, ErrorState, Loading, ProgressBar, T } from '../../src/components/ui';
import { colors, spacing } from '../../src/lib/theme';

const RULE_LABELS: Record<string, string> = {
  lesson_complete: 'تخلّص درس',
  quiz_pass: 'تنجح في امتحان',
  quiz_perfect: 'تجيب الدرجة النهائية',
  course_complete: 'تخلّص كورس كامل',
  streak_day: 'تذاكر يوم جديد',
  community_post: 'تنشر بوست في الكوميونيتي',
  community_comment: 'تعلّق على بوست',
};

export default function XpScreen() {
  const [data, setData] = useState<XpPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      setData(await api.xp());
    } catch (e: any) {
      setError(e.message);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (error && !data) return <ErrorState message={error} onRetry={load} />;
  if (!data) return <Loading />;

  const { xp, history, leaderboard, rules } = data;

  return (
    <ScrollView
      contentContainerStyle={styles.scroll}
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
    >
      <Card>
        <T size="sm" color={colors.textMuted}>
          إجمالي نقاطك
        </T>
        <View style={styles.baseline}>
          <T size="display" weight="extrabold" color={colors.brand}>
            {xp.total}
          </T>
          <T size="md" color={colors.textMuted}>
            {' '}
            XP
          </T>
        </View>

        <View style={[styles.row, { marginTop: spacing.md }]}>
          <Stat label="المستوى" value={`${xp.level}`} />
          <Stat label="السلسلة" value={`🔥 ${xp.current_streak}`} />
          <Stat label="أطول سلسلة" value={`${xp.longest_streak}`} />
          <Stat label="ترتيبك" value={xp.rank > 0 ? `#${xp.rank}` : '—'} />
        </View>

        <View style={{ marginTop: spacing.lg }}>
          <ProgressBar percent={xp.percent_to_next} />
          <T size="xs" color={colors.textMuted} style={{ marginTop: spacing.xs }}>
            {xp.xp_into_level} / {xp.xp_for_level} — فاضل {xp.xp_to_next} نقطة للمستوى{' '}
            {xp.level + 1}
          </T>
        </View>
      </Card>

      <Section title="🏆 المتصدرين">
        <Card style={{ gap: spacing.md }}>
          {leaderboard.length === 0 ? (
            <T color={colors.textMuted}>لسه بدري — ذاكر واطلع فوق 🚀</T>
          ) : (
            leaderboard.slice(0, 20).map((row) => (
              <View key={row.user_id} style={styles.leader}>
                <T
                  size="sm"
                  color={row.rank <= 3 ? colors.gold : colors.textFaint}
                  weight={row.rank <= 3 ? 'bold' : 'normal'}
                  style={{ width: 28 }}
                >
                  {row.rank}
                </T>
                <Avatar name={row.name} url={row.avatar_url} size={32} />
                <T
                  size="sm"
                  weight={row.is_me ? 'bold' : 'normal'}
                  color={row.is_me ? colors.brand : colors.text}
                  numberOfLines={1}
                  style={{ flex: 1 }}
                >
                  {row.name}
                  {row.is_me ? ' (إنت)' : ''}
                </T>
                <T size="sm" color={colors.textMuted}>
                  {row.total_xp}
                </T>
              </View>
            ))
          )}
        </Card>
      </Section>

      <Section title="⚡ ازاي تجمع نقاط">
        <Card style={{ gap: spacing.sm }}>
          {Object.entries(rules).map(([key, points]) => (
            <View key={key} style={styles.ruleRow}>
              <T size="sm" style={{ flex: 1 }}>
                {RULE_LABELS[key] ?? key}
              </T>
              <T size="sm" weight="bold" color={colors.brand}>
                +{points}
              </T>
            </View>
          ))}
        </Card>
      </Section>

      <Section title="📜 آخر نقاطك">
        <Card style={{ gap: spacing.md }}>
          {history.length === 0 ? (
            <T color={colors.textMuted}>لسه مجمعتش نقاط. ابدأ درس دلوقتي.</T>
          ) : (
            history.map((e) => (
              <View key={e.id} style={styles.ruleRow}>
                <View style={{ flex: 1 }}>
                  <T size="sm">{e.label}</T>
                  <T size="xs" color={colors.textFaint}>
                    {new Date(e.created_at).toLocaleDateString('ar-EG')}
                  </T>
                </View>
                <T size="sm" weight="bold" color={colors.brand}>
                  +{e.points}
                </T>
              </View>
            ))
          )}
        </Card>
      </Section>
    </ScrollView>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1 }}>
      <T size="lg" weight="extrabold" align="center">
        {value}
      </T>
      <T size="xs" color={colors.textMuted} align="center">
        {label}
      </T>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ marginTop: spacing.xxl, gap: spacing.md }}>
      <T size="lg" weight="extrabold">
        {title}
      </T>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.lg, paddingBottom: spacing.xxl * 2 },
  row: { flexDirection: 'row', gap: spacing.sm },
  baseline: { flexDirection: 'row', alignItems: 'baseline' },
  leader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  ruleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
});
