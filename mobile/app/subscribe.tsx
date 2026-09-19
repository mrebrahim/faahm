import { useCallback, useEffect, useState } from 'react';
import { Linking, ScrollView, StyleSheet, View } from 'react-native';
import { Redirect, Stack } from 'expo-router';
import { API_BASE_URL } from '../src/lib/supabase';
import { Badge, Button, Card, ErrorState, Loading, T } from '../src/components/ui';
import {
  READER_MODE,
  salesWhatsappUrl,
  purchaseWhatsappUrl,
  SALES_WHATSAPP_DISPLAY,
} from '../src/lib/store-policy';
import { colors, radius, spacing } from '../src/lib/theme';

/**
 * Purchase screen.
 *
 * There is no checkout here. Buying happens over WhatsApp with a human —
 * no card handling in the app, no store commission, and it's how faahm
 * already closes most of its sales.
 *
 * The whole screen is unreachable on iOS: Apple 3.1.3(a) forbids a
 * reader app from carrying any call to action toward an outside
 * purchase, and a WhatsApp button asking to buy is exactly that.
 * See src/lib/store-policy.ts.
 */
type CourseOffer = {
  id: string;
  title: string;
  price_usd: number;
  price_egp: number;
};

type Pricing = {
  currency: string;
  courses: CourseOffer[];
  bundle: {
    title: string;
    price_usd: number;
    price_egp: number;
    anchor_usd: number;
    savings_usd: number;
  };
  features: string[];
  local: { currency: string; course: number; bundle: number; methods: string[] };
};

export default function SubscribeScreen() {
  const [data, setData] = useState<Pricing | null>(null);
  const [error, setError] = useState<string | null>(null);

  /**
   * Baked-in defaults. The API is the source of truth, but a price
   * screen showing NOTHING because of a network hiccup — or a route
   * that hasn't finished deploying — is worse than one showing
   * last-known numbers. The WhatsApp conversation settles it anyway.
   */
  const FALLBACK: Pricing = {
    currency: 'USD',
    courses: [
      { id: 'n8n', title: 'أتمتة n8n', price_usd: 60, price_egp: 3000 },
      { id: 'ai-video', title: 'AI Video Master', price_usd: 60, price_egp: 3000 },
      { id: 'vibe-coding', title: 'Vibe Coding', price_usd: 60, price_egp: 3000 },
    ],
    bundle: {
      title: 'AI Bundle — التلات كورسات',
      price_usd: 99,
      price_egp: 5000,
      anchor_usd: 180,
      savings_usd: 81,
    },
    features: [
      'وصول دائم — من غير اشتراك ولا تجديد',
      'كل التحديثات المستقبلية مجاناً',
      'شهادة إتمام لكل كورس',
      'ضمان استرداد ٧ أيام',
    ],
    local: { currency: 'ج.م', course: 3000, bundle: 5000, methods: ['InstaPay', 'Vodafone Cash'] },
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
      const body = await res.json();
      // An older server that still answers with plan shapes has no
      // `bundle`; fall back rather than render an empty screen.
      setData(body?.bundle ? body : FALLBACK);
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

  if (error && !data) return <ErrorState message={error} onRetry={load} />;
  if (!data) return <Loading />;

  return (
    <>
      <Stack.Screen options={{ title: 'الكورسات' }} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <T size="xxl" weight="extrabold" align="center">
          اشتري مرة واحدة — والكورس معاك للأبد
        </T>
        <T color={colors.textMuted} align="center" style={{ marginTop: spacing.sm }}>
          مفيش اشتراك ولا تجديد. بتدفع مرة وخلاص.
        </T>

        {/* The bundle leads: it's the offer, and the single courses are
            the comparison that makes it look right. */}
        <Card style={[styles.card, styles.featured]}>
          <View style={styles.badges}>
            <Badge label="👑 الأوفر" tone="gold" />
            <Badge label={`وفّر $${data.bundle.savings_usd}`} tone="brand" />
          </View>

          <T weight="bold" size="lg" style={{ marginTop: spacing.sm }}>
            {data.bundle.title}
          </T>

          <View style={styles.priceRow}>
            <T size="display" weight="extrabold" color={colors.brand}>
              ${data.bundle.price_usd}
            </T>
            <T size="md" color={colors.textFaint} style={styles.struck}>
              ${data.bundle.anchor_usd}
            </T>
            <T size="sm" color={colors.textMuted}>
              مرة واحدة
            </T>
          </View>

          <View style={{ marginTop: spacing.lg, gap: spacing.sm }}>
            {data.features.map((f) => (
              <T key={f} size="sm">
                ✅ {f}
              </T>
            ))}
          </View>

          <Button
            label="اطلب الـ Bundle عبر واتساب"
            style={{ marginTop: spacing.lg }}
            onPress={() => Linking.openURL(purchaseWhatsappUrl(data.bundle.title))}
          />
        </Card>

        <T weight="bold" style={{ marginTop: spacing.xl }}>
          أو كورس لوحده — ${data.courses[0]?.price_usd ?? 60}
        </T>

        {data.courses.map((c) => (
          <Card key={c.id} style={styles.card}>
            <View style={styles.priceRow}>
              <T weight="bold" style={{ flex: 1 }}>
                {c.title}
              </T>
              <T size="lg" weight="extrabold" color={colors.brand}>
                ${c.price_usd}
              </T>
            </View>
            <Button
              label="اطلب الكورس"
              variant="outline"
              style={{ marginTop: spacing.md }}
              onPress={() => Linking.openURL(purchaseWhatsappUrl(c.title))}
            />
          </Card>
        ))}

        <Card style={[styles.card, styles.contact]}>
          <T weight="bold">من مصر؟</T>
          <T size="sm" color={colors.textMuted} style={{ marginTop: spacing.xs }}>
            {data.local.course} {data.local.currency} للكورس أو {data.local.bundle}{' '}
            {data.local.currency} للـ Bundle عبر {data.local.methods.join(' أو ')}.
          </T>
          <Button
            label={`كلّمنا على ${SALES_WHATSAPP_DISPLAY}`}
            variant="outline"
            style={{ marginTop: spacing.md }}
            onPress={() => Linking.openURL(salesWhatsappUrl('الدفع من مصر'))}
          />
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
