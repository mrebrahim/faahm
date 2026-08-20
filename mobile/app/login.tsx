import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { Redirect, Stack } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useAuth } from '../src/lib/auth-context';
import { track } from '../src/lib/analytics';
import { API_BASE_URL } from '../src/lib/supabase';
import { Button, Card, T } from '../src/components/ui';
import { colors, radius, spacing } from '../src/lib/theme';

/**
 * Two ways in, because the student base needs both.
 *
 * EMAIL CODE IS THE DEFAULT — nothing to remember, and it's the same
 * flow as the web's /redeem, so it works identically for a brand-new
 * student and for someone who forgot the password they set months ago.
 *
 * Password is NOT offered on the opening screen — it appears only on
 * the code-entry screen, once a student has actually asked for a code
 * and it hasn't shown up. That keeps the first screen to a single
 * decision while still guaranteeing an escape hatch: every one of
 * faahm's current subscribers created their account on the web with a
 * password, so nobody who paid can end up locked out because an email
 * went to spam.
 *
 * The code Supabase sends is 6 OR 8 digits depending on project config,
 * so the input is NOT capped at 6 — that exact bug bit the web flow
 * once already, where the browser silently truncated a valid 8-digit
 * code and every attempt failed.
 */
type Mode = 'password' | 'otp-email' | 'otp-code';

export default function LoginScreen() {
  const { session, sendOtp, verifyOtp, signInWithPassword } = useAuth();
  const [mode, setMode] = useState<Mode>('otp-email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (session) return <Redirect href="/(tabs)" />;

  function validEmail() {
    // `includes('@')` accepted "ahmed@gmail" and "ahmed@" — Supabase then
    // reported success and the code simply never arrived, which reads as
    // a broken app rather than a typo.
    const ok = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
    if (!ok) {
      setError('الإيميل مش مظبوط. اتأكد منه وجرّب تاني.');
      return false;
    }
    return true;
  }

  async function run(fn: () => Promise<void>) {
    setError(null);
    setBusy(true);
    try {
      await fn();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  const handlePassword = () => {
    if (!validEmail()) return;
    if (!password) {
      setError('اكتب الباسورد.');
      return;
    }
    // On success the auth listener flips the session and the guard in
    // (tabs)/_layout routes us in — no manual navigation needed.
    track('login_started', { method: 'password' });
    run(async () => {
      try {
        await signInWithPassword(email, password);
        track('login_succeeded', { method: 'password' });
      } catch (e) {
        track('login_failed', { method: 'password' });
        throw e;
      }
    });
  };

  const handleSendOtp = () => {
    if (!validEmail()) return;
    track('login_started', { method: 'otp' });
    run(async () => {
      await sendOtp(email);
      track('login_code_sent');
      setMode('otp-code');
    });
  };

  const handleVerify = () => {
    if (code.trim().length < 4) {
      setError('اكتب الكود اللي وصلك على الإيميل.');
      return;
    }
    run(async () => {
      try {
        await verifyOtp(email, code);
        track('login_succeeded', { method: 'otp' });
      } catch (e) {
        track('login_failed', { method: 'otp' });
        throw e;
      }
    });
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: colors.bg }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.logo}>
            <T size="display" weight="extrabold" align="center" color="#fff">
              ف
            </T>
          </View>

          <T size="xxl" weight="extrabold" align="center">
            أهلاً بيك في فاهم
          </T>
          <T color={colors.textMuted} align="center" style={{ marginTop: spacing.sm }}>
            {mode === 'otp-email'
              ? 'اكتب إيميلك وهنبعتلك كود دخول. من غير باسورد تنساه.'
              : mode === 'otp-code'
                ? `بعتنا كود على ${email}. اكتبه هنا.`
                : 'ادخل بنفس الإيميل والباسورد بتوع الموقع.'}
          </T>

          <Card style={{ marginTop: spacing.xl, gap: spacing.md }}>
            {mode === 'password' && (
              <>
                <Field
                  label="الإيميل"
                  value={email}
                  onChangeText={setEmail}
                  placeholder="you@example.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  textAlign="left"
                />
                <Field
                  label="الباسورد"
                  value={password}
                  onChangeText={setPassword}
                  placeholder="••••••••"
                  secureTextEntry
                  autoCapitalize="none"
                  textAlign="left"
                />
                <Button label="ادخل" onPress={handlePassword} loading={busy} />
                <Button
                  label="ارجع للدخول بكود على الإيميل"
                  variant="ghost"
                  onPress={() => {
                    setMode('otp-email');
                    setError(null);
                  }}
                />
                <Pressable
                  onPress={() => WebBrowser.openBrowserAsync(`${API_BASE_URL}/login/password`)}
                >
                  <T size="xs" color={colors.textMuted} align="center">
                    نسيت الباسورد؟
                  </T>
                </Pressable>
              </>
            )}

            {mode === 'otp-email' && (
              <>
                <Field
                  label="الإيميل"
                  value={email}
                  onChangeText={setEmail}
                  placeholder="you@example.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  textAlign="left"
                />
                <Button label="ابعتلي الكود" onPress={handleSendOtp} loading={busy} />
              </>
            )}

            {mode === 'otp-code' && (
              <>
                <Field
                  label="كود الدخول"
                  value={code}
                  onChangeText={setCode}
                  placeholder="——————"
                  keyboardType="number-pad"
                  // Supabase sends 6 OR 8 digits — never hardcode 6.
                  maxLength={8}
                  textAlign="center"
                />
                <Button label="ادخل" onPress={handleVerify} loading={busy} />
                <Button
                  label="غيّر الإيميل"
                  variant="ghost"
                  onPress={() => {
                    setMode('otp-email');
                    setCode('');
                    setError(null);
                  }}
                />
                <T size="xs" color={colors.textFaint} align="center">
                  الكود مش واصل؟ بصّ في الـ spam.
                </T>
                <Button
                  label="ادخل بالباسورد بدل الكود"
                  variant="ghost"
                  onPress={() => {
                    setMode('password');
                    setCode('');
                    setError(null);
                  }}
                />
              </>
            )}

            {error ? (
              <T color={colors.danger} size="sm" align="center">
                {error}
              </T>
            ) : null}
          </Card>

          <T size="xs" color={colors.textFaint} align="center" style={{ marginTop: spacing.xl }}>
            بدخولك بتوافق على شروط الاستخدام وسياسة الخصوصية بتاعة فاهم.
          </T>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

function Field({
  label,
  textAlign = 'right',
  ...props
}: React.ComponentProps<typeof TextInput> & { label: string }) {
  return (
    <View style={{ gap: spacing.xs }}>
      <T size="sm" weight="bold">
        {label}
      </T>
      <TextInput
        {...props}
        placeholderTextColor={colors.textFaint}
        style={[styles.input, { textAlign }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.xl, paddingTop: 80, paddingBottom: spacing.xxl },
  logo: {
    width: 72,
    height: 72,
    borderRadius: radius.xl,
    backgroundColor: colors.brand,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  input: {
    minHeight: 50,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    fontSize: 16,
    color: colors.text,
    backgroundColor: '#fff',
  },
});
