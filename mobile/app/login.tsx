import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { Redirect, Stack } from 'expo-router';
import { useAuth } from '../src/lib/auth-context';
import { Button, Card, T } from '../src/components/ui';
import { colors, radius, spacing } from '../src/lib/theme';

/**
 * Email-OTP login, matching the web /redeem flow.
 *
 * The code Supabase sends is 6–8 digits depending on project config, so
 * the input is NOT capped at 6 — that exact bug bit the web flow once
 * already, where the browser silently truncated a valid 8-digit code.
 */
export default function LoginScreen() {
  const { session, sendOtp, verifyOtp } = useAuth();
  const [stage, setStage] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (session) return <Redirect href="/(tabs)" />;

  async function handleSend() {
    setError(null);
    if (!email.includes('@')) {
      setError('اكتب إيميل صحيح.');
      return;
    }
    setBusy(true);
    try {
      await sendOtp(email, name.trim() ? { full_name: name.trim() } : undefined);
      setStage('code');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleVerify() {
    setError(null);
    if (code.trim().length < 4) {
      setError('اكتب الكود اللي وصلك على الإيميل.');
      return;
    }
    setBusy(true);
    try {
      await verifyOtp(email, code);
      // The auth listener in AuthProvider flips the session and the
      // guard in (tabs)/_layout routes us in — no manual navigation.
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

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
            {stage === 'email'
              ? 'اكتب إيميلك وهنبعتلك كود دخول. من غير باسورد تنساه.'
              : `بعتنا كود على ${email}. اكتبه هنا.`}
          </T>

          <Card style={{ marginTop: spacing.xl, gap: spacing.md }}>
            {stage === 'email' ? (
              <>
                <Field
                  label="الإيميل"
                  value={email}
                  onChangeText={setEmail}
                  placeholder="you@example.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  textAlign="left"
                />
                <Field
                  label="اسمك (اختياري)"
                  value={name}
                  onChangeText={setName}
                  placeholder="اسمك بالكامل"
                />
                <Button label="ابعتلي الكود" onPress={handleSend} loading={busy} />
              </>
            ) : (
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
                    setStage('email');
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
