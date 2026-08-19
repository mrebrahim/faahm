import { Redirect, Tabs } from 'expo-router';
import { Text } from 'react-native';
import { useAuth } from '../../src/lib/auth-context';
import { Loading } from '../../src/components/ui';
import { colors } from '../../src/lib/theme';

/**
 * The tab shell is behind the auth gate. Browsing the catalog signed-out
 * is possible at the API level (free courses are the funnel), but the
 * app funnels through login first so the XP and community tabs always
 * have a user — a signed-out tab bar with two dead tabs reads as broken.
 */
export default function TabsLayout() {
  const { session, loading } = useAuth();

  if (loading) return <Loading />;
  if (!session) return <Redirect href="/login" />;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.brand,
        tabBarInactiveTintColor: colors.textFaint,
        tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.border },
        tabBarLabelStyle: { fontSize: 11 },
        headerStyle: { backgroundColor: colors.card },
        headerTitleStyle: { fontWeight: '700' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'الرئيسية', tabBarIcon: () => <Text>🏠</Text> }}
      />
      <Tabs.Screen
        name="courses"
        options={{ title: 'الكورسات', tabBarIcon: () => <Text>📚</Text> }}
      />
      <Tabs.Screen
        name="community"
        options={{ title: 'الكوميونيتي', tabBarIcon: () => <Text>👥</Text> }}
      />
      <Tabs.Screen
        name="xp"
        options={{ title: 'نقاطي', tabBarIcon: () => <Text>⚡</Text> }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: 'حسابي', tabBarIcon: () => <Text>👤</Text> }}
      />
    </Tabs>
  );
}
