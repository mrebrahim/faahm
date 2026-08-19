import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
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
  },
});

/** Current access token, or null when signed out. */
export async function getAccessToken(): Promise<string | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}
