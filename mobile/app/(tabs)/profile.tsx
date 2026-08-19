import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { useAuth } from '../../src/lib/auth-context';
import { API_BASE_URL } from '../../src/lib/supabase';
import { api } from '../../src/lib/api';
import { Avatar, Badge, Button, Card, Loading, T } from '../../src/components/ui';
import {
  CAN_SHOW_PURCHASE_CTA,
  SAFE_WEB_LINKS,
} from '../../src/lib/store-policy';
import { colors, radius, spacing } from '../../src/lib/theme';

/**
 * Account screen — reader-app safe.
 *
 * Subscription state is shown as READ-ONLY information. There is no
 * "شوف الباقات" button and no link into /pricing, /checkout, /billing,
 * or /settings, because Apple 3.1.3(a) treats any of those as a call to
 * action toward an external purchase. See src/lib/store-policy.ts for
 * the full reasoning and how to turn the CTAs back on.
 *
 * The links that remain (help, legal, certificates) are informational —
 * none of them reaches a payment flow.
 */
export default function ProfileScreen() {
  const { me, signOut, loading } = useAuth();
  const [deleting, setDeleting] = useState(false);

  if (loading || !me) return <Loading />;

  const openWeb = (path: string) => WebBrowser.openBrowserAsync(`${API_BASE_URL}${path}`);

  /**
   * Two-step delete. The first alert lists what goes; the second is a
   * plain "are you sure" on a destructive button. Guideline 5.1.1(v)
   * requires the control to exist in-app, but nothing requires making it
   * a single careless tap.
   */
  function confirmDelete() {
    Alert.alert(
      'حذف الحساب',
      [
        'هيتشال حسابك وبياناتك الشخصية نهائياً.',
        'هيتشال تقدّمك في الكورسات وشهاداتك ونقاطك.',
        'هيتشال كل بوستاتك وتعليقاتك في الكوميونيتي.',
        'لو عندك اشتراك شغّال، مش هيترد فلوسه.',
        '',
        'مفيش رجوع بعد التأكيد.',
      ].join('\n'),
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'كمّل',
          style: 'destructive',
          onPress: () =>
            Alert.alert('متأكد؟', 'دي آخر فرصة تتراجع.', [
              { text: 'لأ، رجّعني', style: 'cancel' },
              { text: 'احذف حسابي', style: 'destructive', onPress: runDelete },
            ]),
        },
      ]
    );
  }

  async function runDelete() {
    setDeleting(true);
    try {
      await api.deleteAccount();
      // The auth user is gone; clearing the local session drops us back
      // to the login screen via the guard in (tabs)/_layout.
      await signOut();
    } catch (e: any) {
      Alert.alert('مقدرناش نحذف الحساب', e.message);
    } finally {
      setDeleting(false);
    }
  }

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
        <T weight="bold">اشتراكك</T>
        {me.subscription ? (
          <>
            <View style={{ marginTop: spacing.sm, flexDirection: 'row', gap: spacing.sm }}>
              <Badge
                label={me.subscription.plan === 'yearly' ? '👑 سنوي' : 'شهري'}
                tone={me.subscription.plan === 'yearly' ? 'gold' : 'brand'}
              />
              <Badge label="فعّال" tone="free" />
            </View>
            <T size="sm" color={colors.textMuted} style={{ marginTop: spacing.sm }}>
              ساري لحد {new Date(me.subscription.current_period_end).toLocaleDateString('ar-EG')}
            </T>
            {me.subscription.plan === 'monthly' ? (
              <T size="xs" color={colors.textFaint} style={{ marginTop: spacing.xs }}>
                الباقة الشهرية مش شاملة كورسات n8n و AI Video و Vibe Coding.
              </T>
            ) : null}
          </>
        ) : (
          <T size="sm" color={colors.textMuted} style={{ marginTop: spacing.xs }}>
            مفيش اشتراك فعّال على الحساب ده. الكورسات المجانية مفتوحة ليك في
            أي وقت من تبويب الكورسات.
          </T>
        )}

        {/* Off in reader mode. See store-policy.ts before re-enabling. */}
        {CAN_SHOW_PURCHASE_CTA ? (
          <Button
            label={me.subscription ? 'إدارة الاشتراك' : 'شوف الباقات'}
            variant="outline"
            style={{ marginTop: spacing.md }}
            onPress={() => openWeb(me.subscription ? '/settings' : '/pricing')}
          />
        ) : null}
      </Card>

      <Card style={{ marginTop: spacing.lg }}>
        <View style={styles.stats}>
          <Stat label="دروس خلصتها" value={`${me.stats.completed_lessons}`} />
          <Stat label="شهادات" value={`${me.stats.certificates}`} />
          <Stat label="أطول سلسلة" value={`${me.xp.longest_streak}`} />
        </View>
      </Card>

      <View style={{ marginTop: spacing.lg, gap: spacing.sm }}>
        <Button
          label="مركز المساعدة"
          variant="outline"
          onPress={() => openWeb(SAFE_WEB_LINKS.help)}
        />
        <Button
          label="سياسة الخصوصية"
          variant="outline"
          onPress={() => openWeb(SAFE_WEB_LINKS.privacy)}
        />
        <Button
          label="الشروط والأحكام"
          variant="outline"
          onPress={() => openWeb(SAFE_WEB_LINKS.terms)}
        />
        <Button label="تسجيل الخروج" variant="ghost" onPress={signOut} />
      </View>

      {/* Account deletion — required in-app by App Store guideline
          5.1.1(v). Set apart from the rest so it can't be mis-tapped. */}
      <View style={styles.danger}>
        <T size="sm" weight="bold" color={colors.danger}>
          حذف الحساب
        </T>
        <T size="xs" color={colors.textMuted} style={{ marginTop: spacing.xs }}>
          هيتشال حسابك وكل بياناتك نهائياً. مفيش رجوع.
        </T>
        <Button
          label="احذف حسابي"
          variant="outline"
          loading={deleting}
          onPress={confirmDelete}
          style={{ marginTop: spacing.md }}
        />
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
  danger: {
    marginTop: spacing.xxl,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: '#fecaca',
    backgroundColor: '#fef2f2',
  },
});
