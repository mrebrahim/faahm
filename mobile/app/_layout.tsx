import { useEffect } from 'react';
import { I18nManager } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '../src/lib/auth-context';
import { colors } from '../src/lib/theme';

/**
 * RTL is forced at module scope, before any component mounts.
 *
 * Caveat worth knowing: React Native applies a forceRTL flip only after
 * a full reload, so the FIRST launch on a fresh install can render LTR.
 * The production fix is to set it in the native shell too —
 * `android:supportsRtl="true"` plus a forceRTL call in MainApplication,
 * and CFBundleDevelopmentRegion=ar on iOS (already in app.json). After
 * `expo prebuild`, verify both before shipping a build.
 */
I18nManager.allowRTL(true);
I18nManager.forceRTL(true);

export default function RootLayout() {
  useEffect(() => {
    if (!I18nManager.isRTL) {
      // Dev-time warning only — in a release build the native config
      // above has already handled it.
      console.warn('[faahm] RTL not active — restart the app after install.');
    }
  }, []);

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: colors.card },
            headerTintColor: colors.text,
            headerTitleStyle: { fontWeight: '700' },
            headerBackTitleVisible: false,
            contentStyle: { backgroundColor: colors.bg },
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="login" options={{ title: 'تسجيل الدخول' }} />
          <Stack.Screen name="course/[slug]" options={{ title: 'الكورس' }} />
          <Stack.Screen name="lesson/[id]" options={{ title: 'الدرس' }} />
          <Stack.Screen name="post/[id]" options={{ title: 'البوست' }} />
          <Stack.Screen
            name="post/new"
            options={{ title: 'بوست جديد', presentation: 'modal' }}
          />
        </Stack>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
