import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { api, type Me } from './api';

/**
 * Session + profile state for the whole app.
 *
 * Auth is email OTP, matching the web's /redeem flow — no passwords to
 * forget, and it works for the many students who arrive from a WhatsApp
 * link with no account yet.
 */
type AuthState = {
  session: Session | null;
  me: Me | null;
  loading: boolean;
  /** Send the 6–8 digit code. `shouldCreateUser` makes signup implicit. */
  sendOtp: (email: string, meta?: { full_name?: string; phone?: string }) => Promise<void>;
  verifyOtp: (email: string, token: string) => Promise<void>;
  signOut: () => Promise<void>;
  /** Re-pull /api/mobile/me — call after anything that changes XP or access. */
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const {
        data: { session: current },
      } = await supabase.auth.getSession();
      if (!current) {
        setMe(null);
        return;
      }
      setMe(await api.me());
    } catch {
      // A failed profile fetch must not sign the user out — they may
      // just be offline. Keep the cached `me` and let screens retry.
    }
  }, []);

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setLoading(false);
      if (data.session) refresh();
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      if (next) refresh();
      else setMe(null);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [refresh]);

  const sendOtp = useCallback(
    async (email: string, meta?: { full_name?: string; phone?: string }) => {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim().toLowerCase(),
        options: {
          shouldCreateUser: true,
          // Feeds the handle_new_user trigger, which copies these into
          // public.profiles — same contract as the web signup.
          data: meta,
        },
      });
      if (error) throw new Error(otpErrorAr(error.message));
    },
    []
  );

  const verifyOtp = useCallback(async (email: string, token: string) => {
    const { error } = await supabase.auth.verifyOtp({
      email: email.trim().toLowerCase(),
      // Supabase sends 6–8 digits depending on project config — never
      // validate the length client-side, just pass it through.
      token: token.trim(),
      type: 'email',
    });
    if (error) throw new Error(otpErrorAr(error.message));
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setMe(null);
  }, []);

  const value = useMemo(
    () => ({ session, me, loading, sendOtp, verifyOtp, signOut, refresh }),
    [session, me, loading, sendOtp, verifyOtp, signOut, refresh]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

/** Supabase auth errors come back in English; translate the common ones. */
function otpErrorAr(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('expired')) return 'الكود انتهت صلاحيته. اطلب كود جديد.';
  if (m.includes('invalid')) return 'الكود غلط. راجعه وجرّب تاني.';
  if (m.includes('rate') || m.includes('too many'))
    return 'طلبت أكواد كتير. استنى شوية وجرّب تاني.';
  if (m.includes('email')) return 'الإيميل مش مظبوط.';
  return 'حصلت مشكلة. جرّب تاني.';
}
