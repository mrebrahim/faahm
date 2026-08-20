import 'react-native-url-polyfill/auto';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, processLock } from '@supabase/supabase-js';
import Constants from 'expo-constants';

/**
 * The app talks to the SAME Supabase project as faahm.com, with the
 * anon key and the user's own JWT. Everything it reads directly —
 * community feed, XP, leaderboard — is protected by RLS, so a stolen
 * anon key gets an attacker nothing they couldn't see logged in.
 *
 * Anything whose access rule lives in TypeScript (course gating,
 * playback URLs) goes through /api/mobile/* instead. See src/lib/api.ts.
 */
const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, string>;

export const SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL || extra.supabaseUrl || '';
export const SUPABASE_ANON_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || extra.supabaseAnonKey || '';
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL || extra.apiBaseUrl || 'https://faahm.com';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    // Native apps have no URL bar to parse a session out of; the OTP
    // flow hands us the session directly from verifyOtp().
    detectSessionInUrl: false,
    /**
     * REQUIRED on React Native.
     *
     * supabase-js serialises auth calls behind a lock. Its default
     * implementation reaches for the browser's `navigator.locks` API,
     * which doesn't exist here — and when it's missing, an auth call can
     * sit waiting on a lock that will never be granted. That's exactly
     * what "ابعت الكود" did: the spinner ran forever because
     * signInWithOtp never resolved, neither resolving nor rejecting.
     *
     * `processLock` is the in-process implementation Supabase ships for
     * this environment.
     */
    lock: processLock,
  },
  global: {
    headers: { 'x-client-info': 'faahm-mobile' },
  },
});

/**
 * Token auto-refresh only makes sense while the app is in the
 * foreground. Left running in the background it wakes the process to
 * make network calls nobody is waiting for, which costs battery and
 * data on exactly the devices that can least afford it.
 */
AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});

/**
 * Guard against a request that never comes back.
 *
 * `fetch` in React Native has no default timeout, so a stalled
 * connection — a captive portal, a dropped 3G handover — leaves a
 * promise pending forever and the UI spinning. Every auth call is
 * wrapped in this so the worst case is an error message the user can
 * act on.
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  ms = 20_000,
  message = 'الطلب أخد وقت طويل. اتأكد من النت وجرّب تاني.'
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error(message)), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/** Current access token, or null when signed out. */
export async function getAccessToken(): Promise<string | null> {
  try {
    const {
      data: { session },
    } = await withTimeout(supabase.auth.getSession(), 10_000);
    return session?.access_token ?? null;
  } catch {
    // Never let a token lookup block a screen — the caller falls back
    // to an unauthenticated request.
    return null;
  }
}
