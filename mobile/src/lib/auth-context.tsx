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
 * Two sign-in paths. Email OTP is the default — nothing to remember,
 * same flow as the web's /redeem. Password is the fallback, and it
 * matters: every existing faahm subscriber created their account on the
 * web with one, so it's the way in when the code is slow or lands in
 * spam.
 */
type AuthState = {
  session: Session | null;
  me: Me | null;
  loading: boolean;
  /** Send the 6–8 digit code. `shouldCreateUser` makes signup implicit. */
  sendOtp: (email: string, meta?: { full_name?: string; phone?: string }) => Promise<void>;
  verifyOtp: (email: string, token: string) => Promise<void>;
  /**
   * Password login — the fallback behind the OTP flow. Every existing
   * faahm student signed up on the web with a password, so this is what
   * keeps a paying subscriber from being locked out when the code
   * doesn't arrive.
   */
  signInWithPassword: (email: string, password: string) => Promise<void>;
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

  const signInWithPassword = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    if (error) throw new Error(otpErrorAr(error.message));
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setMe(null);
  }, []);

  const value = useMemo(
    () => ({ session, me, loading, sendOtp, verifyOtp, signInWithPassword, signOut, refresh }),
    [session, me, loading, sendOtp, verifyOtp, signInWithPassword, signOut, refresh]
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
  // Password failures come back as "Invalid login credentials" — check
  // that before the generic 'invalid', which would otherwise tell a
  // password user their "code" is wrong.
  if (m.includes('login credentials')) return 'الإيميل أو الباسورد غلط.';
  if (m.includes('expired')) return 'الكود انتهت صلاحيته. اطلب كود جديد.';
  if (m.includes('invalid')) return 'الكود غلط. راجعه وجرّب تاني.';
  if (m.includes('rate') || m.includes('too many'))
    return 'طلبت أكواد كتير. استنى شوية وجرّب تاني.';
  if (m.includes('email')) return 'الإيميل مش مظبوط.';
  return 'حصلت مشكلة. جرّب تاني.';
}
