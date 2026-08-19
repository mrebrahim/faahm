import { ScrollView, StyleSheet, View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { useAuth } from '../../src/lib/auth-context';
import { API_BASE_URL } from '../../src/lib/supabase';
import { Avatar, Badge, Button, Card, Loading, T } from '../../src/components/ui';
import { colors, spacing } from '../../src/lib/theme';

/**
 * Account screen.
 *
 * Subscribing does NOT happen in-app. Both stores take 15–30% on
 * in-app purchases of digital content, and faahm's margin on a $40/year
 * plan can't absorb that — so checkout opens the existing web funnel in
 * a browser tab. Note this is the exact behaviour Apple's guideline
 * 3.1.1 restricts: the app must not link out to purchase from inside a
 * paid-content flow. Before the first iOS submission, decide between
 * (a) applying for the External Purchase Link entitlement, or (b)
 * shipping the app as a "reader" app where content bought elsewhere is
 * simply consumable. See docs/mobile-app-plan.md §المخاطر.
 */
export default function ProfileScreen() {
  const { me, signOut, loading } = useAuth();

  if (loading || !me) return <Loading />;

  const openWeb = (path: string) =>
    WebBrowser.openBrowserAsync(`${API_BASE_URL}${path}`);

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <Card>
        <View style={styles.row}>
          <Avatar name={me.user.full_name || 'ف'} url={me.user.avatar_url} size={56} />
          <View style={{ flex: 1 }}>
            <T size="lg" weight="bold" numberOfLines={1}>
              {me.user.full_name || 'طالب في فاهم'}
            </T>
            <T size="sm" color={colors.textMuted} numberOfLines={1}>
              {me.user.email}
            </T>
            <View style={{ marginTop: spacing.sm, flexDirection: 'row', gap: spacing.sm }}>
              <Badge label={`مستوى ${me.xp.level}`} tone="brand" />
              <Badge label={`${me.xp.total} XP`} />
            </View>
          </View>
        </View>
      </Card>

      <Card style={{ marginTop: spacing.lg }}>
        <T weight="bold">الاشتراك</T>
        {me.subscription ? (
          <>
            <T size="sm" color={colors.textMuted} style={{ marginTop: spacing.xs }}>
              {me.subscription.plan === 'yearly' ? 'الباقة السنوية 👑' : 'الباقة الشهرية'} —
              فعّالة لحد{' '}
              {new Date(me.subscription.current_period_end).toLocaleDateString('ar-EG')}
            </T>
            {me.subscription.plan === 'monthly' ? (
              <T size="xs" color={colors.textFaint} style={{ marginTop: spacing.xs }}>
                الباقة الشهرية مش شاملة كورسات n8n و AI Video و Vibe Coding.
              </T>
            ) : null}
            <Button
              label="إدارة الاشتراك"
              variant="outline"
              style={{ marginTop: spacing.md }}
              onPress={() => openWeb('/settings')}
            />
          </>
        ) : (
          <>
            <T size="sm" color={colors.textMuted} style={{ marginTop: spacing.xs }}>
              مفيش اشتراك فعّال. الباقة السنوية بتفتحلك كل الكورسات + المساعد
              الذكي + الشهادات.
            </T>
            <Button
              label="شوف الباقات"
              style={{ marginTop: spacing.md }}
              onPress={() => openWeb('/pricing')}
            />
          </>
        )}
      </Card>

      <Card style={{ marginTop: spacing.lg }}>
        <View style={styles.stats}>
          <Stat label="دروس خلصتها" value={`${me.stats.completed_lessons}`} />
          <Stat label="شهادات" value={`${me.stats.certificates}`} />
          <Stat label="أطول سلسلة" value={`${me.xp.longest_streak}`} />
        </View>
      </Card>

      <View style={{ marginTop: spacing.lg, gap: spacing.sm }}>
        <Button label="الشهادات" variant="outline" onPress={() => openWeb('/certificates')} />
        <Button label="مركز المساعدة" variant="outline" onPress={() => openWeb('/help')} />
        <Button label="سياسة الخصوصية" variant="outline" onPress={() => openWeb('/privacy')} />
        <Button label="تسجيل الخروج" variant="ghost" onPress={signOut} />
      </View>
    </ScrollView>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1 }}>
      <T size="xl" weight="extrabold" align="center" color={colors.brand}>
        {value}
      </T>
      <T size="xs" color={colors.textMuted} align="center">
        {label}
      </T>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.lg, paddingBottom: spacing.xxl * 2 },
  row: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  stats: { flexDirection: 'row', gap: spacing.sm },
});
