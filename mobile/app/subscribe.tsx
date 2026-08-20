import { useCallback, useEffect, useState } from 'react';
import { Linking, ScrollView, StyleSheet, View } from 'react-native';
import { Redirect, Stack } from 'expo-router';
import { API_BASE_URL } from '../src/lib/supabase';
import { Badge, Button, Card, ErrorState, Loading, T } from '../src/components/ui';
import { READER_MODE, salesWhatsappUrl, SALES_WHATSAPP_DISPLAY } from '../src/lib/store-policy';
import { colors, radius, spacing } from '../src/lib/theme';

/**
 * Subscribe screen.
 *
 * There is no checkout here. Subscribing happens over WhatsApp with a
 * human — no card handling in the app, no store commission, and it's how
 * faahm already closes most of its sales.
 *
 * The whole screen is unreachable on iOS: Apple 3.1.3(a) forbids a
 * reader app from carrying any call to action toward an outside
 * purchase, and a WhatsApp button asking to subscribe is exactly that.
 * See src/lib/store-policy.ts.
 */
type Pricing = {
  currency: string;
  monthly: { amount: number | string; per: string; features: string[]; missing: string[] };
  yearly: {
    amount: number | string;
    anchor: number | string;
    savings_pct: number;
    per: string;
    features: string[];
    badge?: string;
  };
  local: { currency: string; monthly: number; yearly: number; methods: string[] };
};

export default function SubscribeScreen() {
  const [data, setData] = useState<Pricing | null>(null);
  const [error, setError] = useState<string | null>(null);

  /**
   * Baked-in defaults. The API is the source of truth because the yearly
   * price moves on a promo cycle, but a pricing screen that shows NOTHING
   * because of a network hiccup — or a route that hasn't finished
   * deploying — is worse than one showing last-known numbers. The
   * WhatsApp conversation settles the final price anyway.
   */
  const FALLBACK: Pricing = {
    currency: 'USD',
    monthly: {
      amount: 10,
      per: 'شهر',
      features: ['وصول لمعظم الكورسات', 'فيديوهات بجودة عالية', 'ملفات وموارد قابلة للتحميل'],
      missing: ['بدون n8n و AI Video و Vibe Coding', 'بدون المساعد الذكي', 'بدون شهادة إتمام'],
    },
    yearly: {
      amount: 40,
      anchor: 120,
      savings_pct: 67,
      per: 'سنة',
      features: [
        'وصول كامل لكل الكورسات',
        'كورسات n8n و AI Video و Vibe Coding',
        'المساعد الذكي فاهم',
        'شهادة إتمام لكل كورس',
      ],
      badge: 'وفّر 67%',
    },
    local: { currency: 'ج.م', monthly: 500, yearly: 4000, methods: ['InstaPay', 'Vodafone Cash'] },
  };

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/mobile/pricing`);
      // A 404 from the CDN returns an HTML error page, and .json() on
      // that throws "Unexpected character: <" — check the type before
      // parsing so the failure is understandable.
      const type = res.headers.get('content-type') ?? '';
      if (!res.ok || !type.includes('application/json')) {
        throw new Error('pricing endpoint unavailable');
      }
      setData(await res.json());
    } catch {
      setData(FALLBACK);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Belt and braces: the tab that links here is already hidden on iOS,
  // but a deep link could still land on this route.
  if (READER_MODE) return <Redirect href="/(tabs)" />;

  const contact = (context: string) => Linking.openURL(salesWhatsappUrl(context));

  if (error && !data) return <ErrorState message={error} onRetry={load} />;
  if (!data) return <Loading />;

  return (
    <>
      <Stack.Screen options={{ title: 'الاشتراك' }} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <T size="xxl" weight="extrabold" align="center">
          افتح كل كورسات فاهم
        </T>
        <T color={colors.textMuted} align="center" style={{ marginTop: spacing.sm }}>
          اشتراك واحد بيفتحلك المكتبة كاملة — من غير ما تدفع لكل كورس لوحده.
        </T>

        {/* Yearly first: it's the plan we actually want people on, and
            burying it under the monthly card costs conversions. */}
        <Card style={[styles.card, styles.featured]}>
          <View style={styles.badges}>
            <Badge label="👑 الأكثر توفيراً" tone="gold" />
            {data.yearly.badge ? <Badge label={data.yearly.badge} tone="brand" /> : null}
          </View>

          <T size="lg" weight="bold" style={{ marginTop: spacing.md }}>
            الاشتراك السنوي
          </T>
          <View style={styles.priceRow}>
            <T size="display" weight="extrabold" color={colors.brand}>
              ${data.yearly.amount}
            </T>
            <T size="md" color={colors.textFaint} style={styles.struck}>
              ${data.yearly.anchor}
            </T>
            <T size="sm" color={colors.textMuted}>
              / {data.yearly.per}
            </T>
          </View>
          <T size="sm" color={colors.brandDark} weight="bold">
            وفّر {data.yearly.savings_pct}%
          </T>

          <View style={{ marginTop: spacing.lg, gap: spacing.sm }}>
            {data.yearly.features.map((f) => (
              <T key={f} size="sm">
                ✅ {f}
              </T>
            ))}
          </View>

          <Button
            label="اشترك سنوي عبر واتساب"
            style={{ marginTop: spacing.lg }}
            onPress={() => contact('الباقة السنوية')}
          />
        </Card>

        <Card style={styles.card}>
          <T size="lg" weight="bold">
            الاشتراك الشهري
          </T>
          <View style={styles.priceRow}>
            <T size="xxl" weight="extrabold">
              ${data.monthly.amount}
            </T>
            <T size="sm" color={colors.textMuted}>
              / {data.monthly.per}
            </T>
          </View>

          <View style={{ marginTop: spacing.md, gap: spacing.sm }}>
            {data.monthly.features.map((f) => (
              <T key={f} size="sm">
                ✅ {f}
              </T>
            ))}
            {data.monthly.missing.map((f) => (
              <T key={f} size="sm" color={colors.textFaint}>
                ❌ {f}
              </T>
            ))}
          </View>

          <Button
            label="اشترك شهري عبر واتساب"
            variant="outline"
            style={{ marginTop: spacing.lg }}
            onPress={() => contact('الباقة الشهرية')}
          />
        </Card>

        <Card style={styles.card}>
          <T weight="bold">🇪🇬 بتدفع من مصر؟</T>
          <T size="sm" color={colors.textMuted} style={{ marginTop: spacing.xs }}>
            فيه دفع محلي بالجنيه عبر {data.local.methods.join(' أو ')} —{' '}
            {data.local.monthly} {data.local.currency} شهري أو {data.local.yearly}{' '}
            {data.local.currency} سنوي. كلّمنا وهنظبطهالك.
          </T>
        </Card>

        {/* The main CTA, repeated at the bottom because that's where a
            reader lands after comparing the two plans. */}
        <Card style={[styles.card, styles.contact]}>
          <T size="lg" weight="extrabold" align="center">
            تحب تتكلم مع حد الأول؟
          </T>
          <T size="sm" color={colors.textMuted} align="center" style={{ marginTop: spacing.xs }}>
            كلّم فريق فاهم على واتساب وهيرشحلك الباقة المناسبة ليك.
          </T>
          <Button
            label="تواصل مع الفريق للحجز"
            style={{ marginTop: spacing.lg }}
            onPress={() => contact('عايز أعرف الباقة المناسبة')}
          />
          <T size="xs" color={colors.textFaint} align="center" style={{ marginTop: spacing.sm }}>
            {SALES_WHATSAPP_DISPLAY}
          </T>
        </Card>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.lg, paddingBottom: spacing.xxl * 2 },
  card: { marginTop: spacing.lg },
  featured: { borderColor: colors.brand, borderWidth: 2 },
  badges: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.sm,
    marginTop: spacing.xs,
    flexWrap: 'wrap',
  },
  struck: { textDecorationLine: 'line-through' },
  contact: { backgroundColor: colors.brandLight, borderColor: colors.brand, borderRadius: radius.lg },
});
