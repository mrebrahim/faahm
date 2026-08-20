import { API_BASE_URL, getAccessToken } from './supabase';

/**
 * Thin client over /api/mobile/*.
 *
 * Every call attaches the Supabase access token as a bearer header; the
 * route handler validates it server-side. Failures come back as a typed
 * ApiError so screens can distinguish "you're locked out of this course"
 * from "the network died", which matters a lot on 3G.
 */
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public lockReason?: string | null
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(
  path: string,
  init: RequestInit & { auth?: boolean } = {}
): Promise<T> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(init.headers as Record<string, string>),
  };

  if (init.auth !== false) {
    const token = await getAccessToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  if (init.body) headers['Content-Type'] = 'application/json';

  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, { ...init, headers });
  } catch {
    throw new ApiError(0, 'network', 'مفيش نت. اتأكد من الاتصال وجرّب تاني.');
  }

  const text = await res.text();
  let body: any = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    // Non-JSON response (a proxy error page, usually) — surface it as a
    // server error rather than crashing on the parse.
    throw new ApiError(res.status, 'bad_response', 'رد غير متوقع من السيرفر.');
  }

  if (!res.ok) {
    throw new ApiError(
      res.status,
      body?.error ?? 'error',
      body?.message ?? 'حصل خطأ. جرّب تاني.',
      body?.lock_reason ?? null
    );
  }

  return body as T;
}

// ---------------- types ----------------

export type Me = {
  user: {
    id: string;
    email: string | null;
    full_name: string | null;
    avatar_url: string | null;
    country: string | null;
    is_admin: boolean;
  };
  subscription: {
    plan: 'monthly' | 'yearly';
    status: string;
    current_period_end: string;
    cancel_at_period_end: boolean;
  } | null;
  access: {
    has_subscription: boolean;
    unlocks_yearly_only: boolean;
    can_post_community: boolean;
  };
  xp: {
    total: number;
    level: number;
    percent_to_next: number;
    xp_to_next: number;
    current_streak: number;
    longest_streak: number;
  };
  stats: { completed_lessons: number; certificates: number };
};

export type CourseListItem = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  level: string;
  total_lessons: number;
  total_duration_sec: number;
  rating_avg: number;
  rating_count: number;
  instructor: string | null;
  is_free: boolean;
  yearly_only: boolean;
  unlocked: boolean;
  lock_reason: 'needs_yearly' | 'needs_subscription' | null;
};

export type CourseDetail = {
  course: {
    id: string;
    slug: string;
    title: string;
    description: string | null;
    short_description: string | null;
    thumbnail_url: string | null;
    level: string;
    total_lessons: number;
    total_duration_sec: number;
    what_you_learn: string[];
    requirements: string[];
    rating_avg: number;
    rating_count: number;
    is_free: boolean;
    yearly_only: boolean;
    /** Public marketing video — no access check, unlike lesson playback. */
    trailer: { kind: 'iframe' | 'native'; url: string } | null;
    instructor: { name: string; bio: string | null; avatar_url: string | null } | null;
  };
  access: {
    unlocked: boolean;
    free: boolean;
    requires_yearly: boolean;
    lock_reason: 'needs_yearly' | 'needs_subscription' | null;
  };
  progress: { completed_lessons: number; total_lessons: number; percent: number };
  chapters: Array<{
    id: string;
    title: string;
    lessons: Array<{
      id: string;
      title: string;
      duration_sec: number;
      is_free_preview: boolean;
      playable: boolean;
      is_completed: boolean;
      watched_sec: number;
    }>;
  }>;
};

export type LessonPayload = {
  lesson: {
    id: string;
    title: string;
    description: string | null;
    duration_sec: number;
    captions_url: string | null;
    course: { id: string; slug: string; title: string };
  };
  playback: { kind: 'iframe' | 'native'; url: string; expires_in_sec: number } | null;
  progress: { watched_sec: number; is_completed: boolean };
  nav: {
    index: number | null;
    total: number;
    previous: { id: string; title: string; playable: boolean } | null;
    next: { id: string; title: string; playable: boolean } | null;
  };
  attachments: Array<{
    id: string;
    title: string;
    url: string;
    size_kb: number | null;
    file_type: string | null;
  }>;
};

export type XpPayload = {
  xp: {
    total: number;
    level: number;
    xp_into_level: number;
    xp_for_level: number;
    xp_to_next: number;
    percent_to_next: number;
    current_streak: number;
    longest_streak: number;
    rank: number;
  };
  history: Array<{
    id: string;
    kind: string;
    label: string;
    points: number;
    created_at: string;
  }>;
  leaderboard: Array<{
    rank: number;
    user_id: string;
    name: string;
    avatar_url: string | null;
    total_xp: number;
    level: number;
    streak: number;
    is_me: boolean;
  }>;
  rules: Record<string, number>;
};

export type ProgressResult = {
  ok: boolean;
  is_completed: boolean;
  xp_awarded: number;
  xp: { total: number; level: number; percent_to_next: number; current_streak: number };
};

// ---------------- calls ----------------

export const api = {
  me: () => request<Me>('/api/mobile/me'),

  courses: (opts: { free?: boolean } = {}) =>
    request<{ courses: CourseListItem[]; count: number }>(
      `/api/mobile/courses${opts.free ? '?free=1' : ''}`
    ),

  course: (slug: string) => request<CourseDetail>(`/api/mobile/course/${slug}`),

  lesson: (id: string) => request<LessonPayload>(`/api/mobile/lesson/${id}`),

  /**
   * Watch heartbeat. Called every ~20s while playing and once on the
   * explicit "خلصت الدرس" tap.
   */
  saveProgress: (lessonId: string, watchedSec: number, completed?: boolean) =>
    request<ProgressResult>('/api/mobile/progress', {
      method: 'POST',
      body: JSON.stringify({
        lesson_id: lessonId,
        watched_sec: Math.floor(watchedSec),
        completed: completed ?? false,
      }),
    }),

  xp: () => request<XpPayload>('/api/mobile/xp'),

  /** The warnings shown on the delete-account confirmation sheet. */
  deletionWarnings: () => request<{ warnings: string[] }>('/api/mobile/account'),

  /**
   * Delete the signed-in account. Required in-app by App Store guideline
   * 5.1.1(v). The server takes the user id from the bearer token, never
   * from the body, so this cannot be aimed at anyone else.
   */
  deleteAccount: () =>
    request<{ ok: boolean }>('/api/mobile/account', {
      method: 'DELETE',
      body: JSON.stringify({ confirm: 'DELETE' }),
    }),
};
