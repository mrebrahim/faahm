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
import { API_BASE_URL } from '../src/lib/supabase';
import { Button, Card, T } from '../src/components/ui';
import { colors, radius, spacing } from '../src/lib/theme';

/**
 * Two ways in, because the existing student base needs both.
 *
 * Every one of faahm's current subscribers signed up on the web with a
 * password, so PASSWORD IS THE DEFAULT — asking them to wait for an
 * email when they already know their password is friction for no gain.
 *
 * The OTP path stays as the fallback: it covers anyone who forgot their
 * password, anyone whose account came from a coupon redemption, and the
 * case where a student's mail provider is slow. Between the two, a
 * paying subscriber should never be locked out of content they bought.
 *
 * The code Supabase sends is 6 OR 8 digits depending on project config,
 * so the input is NOT capped at 6 — that exact bug bit the web flow
 * once already, where the browser silently truncated a valid 8-digit
 * code and every attempt failed.
 */
type Mode = 'password' | 'otp-email' | 'otp-code';

export default function LoginScreen() {
  const { session, sendOtp, verifyOtp, signInWithPassword } = useAuth();
  const [mode, setMode] = useState<Mode>('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (session) return <Redirect href="/(tabs)" />;

  function validEmail() {
    if (!email.includes('@')) {
      setError('اكتب إيميل صحيح.');
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
    run(() => signInWithPassword(email, password));
  };

  const handleSendOtp = () => {
    if (!validEmail()) return;
    run(async () => {
      await sendOtp(email, name.trim() ? { full_name: name.trim() } : undefined);
      setMode('otp-code');
    });
  };

  const handleVerify = () => {
    if (code.trim().length < 4) {
      setError('اكتب الكود اللي وصلك على الإيميل.');
      return;
    }
    run(() => verifyOtp(email, code));
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
            {mode === 'password'
              ? 'ادخل بنفس الإيميل والباسورد بتوع الموقع.'
              : mode === 'otp-email'
                ? 'اكتب إيميلك وهنبعتلك كود دخول.'
                : `بعتنا كود على ${email}. اكتبه هنا.`}
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
                  label="ادخل بكود على الإيميل بدل الباسورد"
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
                <Field
                  label="اسمك (لو حساب جديد)"
                  value={name}
                  onChangeText={setName}
                  placeholder="اسمك بالكامل"
                />
                <Button label="ابعتلي الكود" onPress={handleSendOtp} loading={busy} />
                <Button
                  label="عندي باسورد — ادخل بيه"
                  variant="ghost"
                  onPress={() => {
                    setMode('password');
                    setError(null);
                  }}
                />
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
