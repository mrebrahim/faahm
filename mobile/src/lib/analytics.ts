import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { API_BASE_URL, getAccessToken } from './supabase';

/**
 * Analytics.
 *
 * ## Why this isn't the Firebase SDK
 *
 * `@react-native-firebase/analytics` on Android depends on Google Play
 * Services. Huawei devices (the AppGallery build) don't have it, so
 * Firebase would collect nothing there — silently. It also adds a few MB
 * to the binary and puts the API key inside the app where it can be
 * pulled out.
 *
 * Instead every event goes through `track()` here, gets queued, and is
 * flushed in batches to `/api/mobile/track`, which forwards to the same
 * GA4 property the website reports to. Plain HTTPS, works on every
 * device, and the secret never leaves the server.
 *
 * ## Adding Firebase later
 *
 * `track()` is the only call site anywhere in the app. To add Firebase
 * as a SECOND destination, implement the sink at the bottom of this file
 * — no screen changes. See docs/mobile-app-plan.md for the setup steps
 * (google-services.json, config plugin, and what it costs on Huawei).
 *
 * ## Offline
 *
 * The audience is on patchy 3G. A failed flush puts events back at the
 * front of the queue and persists them, so a lesson watched on the metro
 * still reports once signal comes back.
 */

const QUEUE_KEY = 'faahm_analytics_queue';
const CLIENT_ID_KEY = 'faahm_analytics_client_id';
const SESSION_GAP_MS = 30 * 60 * 1000; // GA4's own session timeout.

/** Flush when the queue reaches this, or on the interval below. */
const BATCH_SIZE = 10;
const FLUSH_INTERVAL_MS = 30_000;
/** Never let a stuck queue grow without bound on a long offline stretch. */
const MAX_QUEUE = 100;

type QueuedEvent = {
  name: string;
  params: Record<string, string | number | boolean>;
  /** Client timestamp, kept so ordering survives a delayed flush. */
  t: number;
};

let queue: QueuedEvent[] = [];
let clientId: string | null = null;
let sessionId: string | null = null;
let lastEventAt = 0;
let flushTimer: ReturnType<typeof setInterval> | null = null;
let initialised = false;

/**
 * A stable per-install id, the app's equivalent of GA4's browser
 * client_id. Generated once and kept in AsyncStorage — it is NOT a
 * device identifier and needs no ATT prompt, which is exactly why we
 * don't touch IDFA.
 */
async function getClientId(): Promise<string> {
  if (clientId) return clientId;
  try {
    const stored = await AsyncStorage.getItem(CLIENT_ID_KEY);
    if (stored) {
      clientId = stored;
      return stored;
    }
  } catch {
    // Storage unavailable — fall through and use an ephemeral id.
  }

  // GA4 accepts any stable string. This mirrors the browser format
  // (<random>.<timestamp>) so both surfaces look alike in BigQuery.
  const fresh = `${Math.floor(Math.random() * 1e10)}.${Math.floor(Date.now() / 1000)}`;
  clientId = fresh;
  try {
    await AsyncStorage.setItem(CLIENT_ID_KEY, fresh);
  } catch {
    // Non-fatal: the id just won't survive a restart.
  }
  return fresh;
}

/** Roll the session id after 30 minutes of inactivity, same rule as GA4. */
function currentSessionId(): string {
  const now = Date.now();
  if (!sessionId || now - lastEventAt > SESSION_GAP_MS) {
    sessionId = String(Math.floor(now / 1000));
  }
  lastEventAt = now;
  return sessionId;
}

const appVersion =
  Constants.expoConfig?.version ?? Constants.expoConfig?.runtimeVersion ?? 'dev';

/**
 * Params attached to every event so reports can segment by platform and
 * version without each call site remembering to pass them.
 */
function baseParams(): Record<string, string | number | boolean> {
  return {
    platform: Platform.OS,
    app_version: String(appVersion),
    session_id: currentSessionId(),
  };
}

/**
 * The event vocabulary. Typed as a union so a typo is a compile error
 * rather than a silently missing funnel step — GA4 accepts any name and
 * reports nothing when it's wrong, which is the worst failure mode.
 */
export type AnalyticsEvent =
  // lifecycle
  | 'app_open'
  | 'login_started'
  | 'login_code_sent'
  | 'login_succeeded'
  | 'login_failed'
  | 'logout'
  | 'account_deleted'
  // catalog
  | 'course_list_viewed'
  | 'course_viewed'
  | 'course_locked_seen'
  | 'free_course_opened'
  | 'search_performed'
  // learning
  | 'lesson_started'
  | 'lesson_completed'
  | 'course_completed'
  | 'attachment_opened'
  // gamification
  | 'xp_earned'
  | 'xp_screen_viewed'
  | 'leaderboard_viewed'
  // community
  | 'community_viewed'
  | 'community_post_created'
  | 'community_comment_created'
  | 'community_post_liked'
  | 'community_content_reported'
  | 'community_user_blocked';

/**
 * Record an event. Fire-and-forget — never awaited by UI code, and never
 * throws. If analytics breaks, the app carries on.
 */
export function track(
  name: AnalyticsEvent,
  params: Record<string, string | number | boolean | undefined | null> = {}
): void {
  const clean: Record<string, string | number | boolean> = {};
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === '') continue;
    clean[k] = typeof v === 'string' ? v.slice(0, 100) : v;
  }

  queue.push({ name, params: { ...baseParams(), ...clean }, t: Date.now() });

  // Drop the OLDEST events when the cap is hit. Recent behaviour is what
  // explains a problem; a week-old queue tail isn't worth the memory.
  if (queue.length > MAX_QUEUE) queue = queue.slice(-MAX_QUEUE);

  void persist();
  if (queue.length >= BATCH_SIZE) void flush();
}

async function persist(): Promise<void> {
  try {
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch {
    // Queue stays in memory only. Acceptable for analytics.
  }
}

/**
 * Ship whatever is queued. Safe to call at any time; a failure returns
 * the batch to the front of the queue so nothing is lost to a dropped
 * connection.
 */
export async function flush(): Promise<void> {
  if (!queue.length) return;

  const batch = queue.slice(0, 25);
  queue = queue.slice(batch.length);
  await persist();

  try {
    const cid = await getClientId();
    // A token is optional here: pre-login events are the top of the
    // funnel and matter most. When present, it stitches app activity to
    // the same user the website reports.
    const token = await getAccessToken();

    const res = await fetch(`${API_BASE_URL}/api/mobile/track`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        client_id: cid,
        events: batch.map((e) => ({ name: e.name, params: e.params })),
      }),
    });

    if (!res.ok) throw new Error(`track failed: ${res.status}`);
  } catch {
    // Offline or server hiccup — put the batch back at the FRONT so
    // ordering survives, and let the next interval retry.
    queue = [...batch, ...queue].slice(-MAX_QUEUE);
    await persist();
  }
}

/**
 * Start the analytics pipeline. Called once from the root layout.
 * Restores anything left over from a previous session before the app
 * was killed, then flushes on a timer.
 */
export async function initAnalytics(): Promise<void> {
  if (initialised) return;
  initialised = true;

  try {
    const stored = await AsyncStorage.getItem(QUEUE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) queue = parsed.slice(-MAX_QUEUE);
    }
  } catch {
    // Corrupt queue — start clean rather than crashing on boot.
    queue = [];
  }

  await getClientId();
  track('app_open');

  if (!flushTimer) {
    flushTimer = setInterval(() => {
      void flush();
    }, FLUSH_INTERVAL_MS);
  }

  // Send whatever survived the last session right away.
  void flush();
}

export function stopAnalytics(): void {
  if (flushTimer) {
    clearInterval(flushTimer);
    flushTimer = null;
  }
  void flush();
}

// ---------------------------------------------------------------------
// Firebase — not wired up, deliberately.
//
// To add it as a second destination:
//   1. npx expo install @react-native-firebase/app @react-native-firebase/analytics
//   2. Drop google-services.json (Android) and GoogleService-Info.plist
//      (iOS) into mobile/, and reference them from app.json under
//      android.googleServicesFile / ios.googleServicesFile.
//   3. Add "@react-native-firebase/app" to the plugins array in app.json.
//   4. Call logEvent inside `track()` above — one place, no screen edits.
//
// Before doing that, know what it costs:
//   - It collects NOTHING on Huawei devices (no Google Play Services),
//     and fails silently rather than erroring.
//   - It adds a few MB to the download, on an audience with expensive data.
//   - App Store review requires declaring the data collection, and a
//     PrivacyInfo.xcprivacy manifest listing the SDK.
//
// GA4 through the server already covers the reporting. Firebase earns
// its place when you want Crashlytics or push, not for analytics alone.
// ---------------------------------------------------------------------
