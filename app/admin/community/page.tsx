import Link from 'next/link';
import { createServiceClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import {
  POST_KIND_EMOJI,
  POST_KIND_LABELS,
  REPORT_REASON_LABELS,
  timeAgoAr,
  type PostKind,
  type ReportReason,
} from '@/lib/community';
import { AlertTriangle, Eye, EyeOff, Lock, Pin, ShieldCheck, Unlock } from 'lucide-react';
import { actionReport, hidePost, lockPost, pinPost, resolveReport } from './actions';
import { approvePost, rejectPost } from './group-actions';
import { GroupsTab } from './groups-tab';

export const metadata = { title: 'الكوميونيتي' };
export const dynamic = 'force-dynamic';

/**
 * Moderation console. App Store guideline 1.2 requires an app carrying
 * user-generated content to have a reporting mechanism AND the means to
 * act on reports — this is the second half of that.
 *
 * Reports come first because they're the queue with an SLA; the full
 * post list underneath is for proactive sweeps.
 */
export default async function AdminCommunityPage({
  searchParams,
}: {
  searchParams: { tab?: string; error?: string; success?: string };
}) {
  const service = createServiceClient();
  const tab = (['reports', 'pending', 'groups', 'posts'] as const).includes(
    searchParams.tab as any
  )
    ? (searchParams.tab as 'reports' | 'pending' | 'groups' | 'posts')
    : 'pending';

  const [{ data: reports }, { count: openCount }, { data: posts }, { data: pending }, { count: pendingCount }] =
    await Promise.all([
    service
      .from('community_reports')
      .select('id, target_type, target_id, reason, note, status, created_at, reporter_id')
      .eq('status', 'open')
      .order('created_at', { ascending: false })
      .limit(50),
    service
      .from('community_reports')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'open'),
    service
      .from('community_posts')
      .select(
        'id, user_id, kind, title, body, is_hidden, is_locked, is_pinned, like_count, comment_count, created_at'
      )
      .order('created_at', { ascending: false })
      .limit(50),
    service
      .from('community_posts')
      .select(
        'id, user_id, kind, title, body, created_at, group_id, community_groups(name)'
      )
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(50),
    service
      .from('community_posts')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending'),
  ]);

  // Resolve the reported content and the reporter in bulk — one query per
  // kind rather than one per row.
  const postIds = (reports ?? []).filter((r) => r.target_type === 'post').map((r) => r.target_id);
  const commentIds = (reports ?? [])
    .filter((r) => r.target_type === 'comment')
    .map((r) => r.target_id);
  const authorIds = Array.from(
    new Set([
      ...(posts ?? []).map((p) => p.user_id),
      ...(pending ?? []).map((p) => p.user_id),
      ...(reports ?? []).map((r) => r.reporter_id),
    ])
  );

  const [{ data: reportedPosts }, { data: reportedComments }, { data: profiles }] =
    await Promise.all([
      postIds.length
        ? service.from('community_posts').select('id, title, body, user_id, is_hidden').in('id', postIds)
        : Promise.resolve({ data: [] as any[] }),
      commentIds.length
        ? service.from('community_comments').select('id, body, post_id, user_id, is_hidden').in('id', commentIds)
        : Promise.resolve({ data: [] as any[] }),
      authorIds.length
        ? service.from('profiles').select('id, full_name, email').in('id', authorIds)
        : Promise.resolve({ data: [] as any[] }),
    ]);

  const nameOf = new Map((profiles ?? []).map((p: any) => [p.id, p.full_name || p.email || '—']));
  const postById = new Map((reportedPosts ?? []).map((p: any) => [p.id, p]));
  const commentById = new Map((reportedComments ?? []).map((c: any) => [c.id, c]));

  return (
    <div className="p-4 sm:p-8 max-w-5xl">
      <div className="mb-6">
        <h1 className="font-display text-2xl sm:text-3xl font-bold mb-1">الكوميونيتي</h1>
        <p className="text-sm text-gray-500">
          راجع البلاغات وأدِر البوستات. كل إجراء بيتسجّل في سجل المراجعة.
        </p>
      </div>

      {/* Tabs scroll rather than wrap on a phone. */}
      <div className="-mx-4 px-4 overflow-x-auto md:mx-0 md:px-0 mb-6">
        <div className="flex gap-2 w-max md:w-auto">
          <TabLink
            href="/admin/community?tab=pending"
            label={`تحت المراجعة${pendingCount ? ` (${pendingCount})` : ''}`}
            active={tab === 'pending'}
          />
          <TabLink href="/admin/community?tab=groups" label="الجروبات" active={tab === 'groups'} />
          <TabLink
            href="/admin/community?tab=reports"
            label={`البلاغات${openCount ? ` (${openCount})` : ''}`}
            active={tab === 'reports'}
          />
          <TabLink href="/admin/community?tab=posts" label="كل البوستات" active={tab === 'posts'} />
        </div>
      </div>

      {searchParams.error ? (
        <div className="mb-5 p-3 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-sm">
          {searchParams.error}
        </div>
      ) : null}
      {searchParams.success ? (
        <div className="mb-5 p-3 rounded-xl bg-brand-500/10 border border-brand-500/30 text-brand-700 text-sm">
          تم الحفظ.
        </div>
      ) : null}

      {tab === 'groups' ? (
        <GroupsTab />
      ) : tab === 'pending' ? (
        <div className="space-y-3">
          {(pending ?? []).length === 0 ? (
            <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
              <ShieldCheck className="w-10 h-10 mx-auto mb-3 text-emerald-500" />
              <p className="font-bold mb-1">مفيش بوستات مستنية</p>
              <p className="text-sm text-gray-500">كل حاجة اتراجعت.</p>
            </div>
          ) : (
            (pending ?? []).map((p: any) => {
              const grp = Array.isArray(p.community_groups)
                ? p.community_groups[0]
                : p.community_groups;
              return (
                <div key={p.id} className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
                  <div className="flex items-center gap-2 flex-wrap text-xs text-gray-500">
                    <span className="font-bold text-gray-900">{nameOf.get(p.user_id) ?? '—'}</span>
                    <span>• {timeAgoAr(p.created_at)}</span>
                    <span className="px-2 py-0.5 rounded-full bg-gray-100">
                      {POST_KIND_EMOJI[p.kind as PostKind]} {POST_KIND_LABELS[p.kind as PostKind]}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-700">
                      {grp?.name ?? 'الفيد العام'}
                    </span>
                  </div>

                  <div className="min-w-0">
                    {p.title ? <p className="font-bold break-words">{p.title}</p> : null}
                    <p className="text-sm text-gray-700 whitespace-pre-wrap break-words">{p.body}</p>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2">
                    <form action={approvePost} className="w-full sm:w-auto">
                      <input type="hidden" name="id" value={p.id} />
                      <Button type="submit" size="sm" className="w-full sm:w-auto">
                        ✅ وافق وانشر
                      </Button>
                    </form>
                    <form action={rejectPost} className="flex-1 flex flex-col sm:flex-row gap-2">
                      <input type="hidden" name="id" value={p.id} />
                      <input
                        name="reason"
                        placeholder="سبب الرفض (اختياري)"
                        className="flex-1 min-w-0 rounded-lg border border-gray-200 px-3 text-sm h-9"
                      />
                      <Button type="submit" size="sm" variant="outline" className="w-full sm:w-auto">
                        ارفض
                      </Button>
                    </form>
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : tab === 'reports' ? (
        <div className="space-y-3">
          {(reports ?? []).length === 0 ? (
            <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
              <ShieldCheck className="w-10 h-10 mx-auto mb-3 text-emerald-500" />
              <p className="font-bold mb-1">مفيش بلاغات مفتوحة</p>
              <p className="text-sm text-gray-500">كله تمام دلوقتي.</p>
            </div>
          ) : (
            (reports ?? []).map((r: any) => {
              const target =
                r.target_type === 'post' ? postById.get(r.target_id) : commentById.get(r.target_id);
              return (
                <div
                  key={r.id}
                  className="rounded-xl border border-amber-300 bg-amber-50/50 p-4 space-y-3"
                >
                  <div className="flex items-start gap-2 flex-wrap">
                    <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                    <span className="font-bold text-sm">
                      {REPORT_REASON_LABELS[r.reason as ReportReason] ?? r.reason}
                    </span>
                    <span className="text-xs text-gray-500">
                      • {r.target_type === 'post' ? 'بوست' : 'تعليق'} • بلاغ من{' '}
                      {nameOf.get(r.reporter_id) ?? '—'} • {timeAgoAr(r.created_at)}
                    </span>
                  </div>

                  {r.note ? (
                    <p className="text-xs text-gray-600 bg-white rounded-lg p-2 border border-amber-200">
                      "{r.note}"
                    </p>
                  ) : null}

                  <div className="rounded-lg bg-white border border-gray-200 p-3 min-w-0">
                    {!target ? (
                      <p className="text-xs text-gray-400">المحتوى اتشال خلاص.</p>
                    ) : (
                      <>
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-xs text-gray-500">
                            {nameOf.get(target.user_id) ?? '—'}
                          </span>
                          {target.is_hidden ? (
                            <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500">
                              مخفي بالفعل
                            </span>
                          ) : null}
                        </div>
                        {target.title ? (
                          <p className="font-bold text-sm break-words">{target.title}</p>
                        ) : null}
                        <p className="text-sm text-gray-700 whitespace-pre-wrap break-words line-clamp-6">
                          {target.body}
                        </p>
                      </>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2">
                    <form action={actionReport} className="w-full sm:w-auto">
                      <input type="hidden" name="report_id" value={r.id} />
                      <input type="hidden" name="target_type" value={r.target_type} />
                      <input type="hidden" name="target_id" value={r.target_id} />
                      <Button type="submit" size="sm" variant="destructive" className="w-full sm:w-auto">
                        <EyeOff className="w-4 h-4" /> إخفاء المحتوى وإغلاق البلاغ
                      </Button>
                    </form>
                    <form action={resolveReport} className="w-full sm:w-auto">
                      <input type="hidden" name="id" value={r.id} />
                      <input type="hidden" name="status" value="dismissed" />
                      <Button type="submit" size="sm" variant="outline" className="w-full sm:w-auto">
                        البلاغ مش في محله — اقفله
                      </Button>
                    </form>
                    {r.target_type === 'post' ? (
                      <Button asChild size="sm" variant="ghost" className="w-full sm:w-auto">
                        <Link href={`/community/${r.target_id}`} target="_blank">
                          افتح البوست
                        </Link>
                      </Button>
                    ) : null}
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {(posts ?? []).length === 0 ? (
            <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
              لسه مفيش بوستات في الكوميونيتي.
            </div>
          ) : (
            (posts ?? []).map((p: any) => (
              <div
                key={p.id}
                className={`rounded-xl border p-4 space-y-3 ${
                  p.is_hidden ? 'border-gray-200 bg-gray-50 opacity-70' : 'border-gray-200 bg-white'
                }`}
              >
                <div className="flex items-center gap-2 flex-wrap text-xs text-gray-500">
                  <span className="font-bold text-gray-900">{nameOf.get(p.user_id) ?? '—'}</span>
                  <span>• {timeAgoAr(p.created_at)}</span>
                  <span>• ❤️ {p.like_count}</span>
                  <span>• 💬 {p.comment_count}</span>
                  {p.is_pinned ? <span className="text-brand-600">• 📌 مثبّت</span> : null}
                  {p.is_locked ? <span className="text-amber-600">• 🔒 مقفول</span> : null}
                  {p.is_hidden ? <span className="text-destructive">• مخفي</span> : null}
                </div>

                <div className="min-w-0">
                  {p.title ? <p className="font-bold text-sm break-words">{p.title}</p> : null}
                  <p className="text-sm text-gray-700 whitespace-pre-wrap break-words line-clamp-4">
                    {p.body}
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 flex-wrap">
                  <ToggleForm
                    action={hidePost}
                    id={p.id}
                    name="hide"
                    value={(!p.is_hidden).toString()}
                    label={p.is_hidden ? 'إظهار' : 'إخفاء'}
                    icon={p.is_hidden ? 'show' : 'hide'}
                  />
                  <ToggleForm
                    action={lockPost}
                    id={p.id}
                    name="lock"
                    value={(!p.is_locked).toString()}
                    label={p.is_locked ? 'فتح التعليقات' : 'قفل التعليقات'}
                    icon={p.is_locked ? 'unlock' : 'lock'}
                  />
                  <ToggleForm
                    action={pinPost}
                    id={p.id}
                    name="pin"
                    value={(!p.is_pinned).toString()}
                    label={p.is_pinned ? 'إلغاء التثبيت' : 'تثبيت'}
                    icon="pin"
                  />
                  <Button asChild size="sm" variant="ghost" className="w-full sm:w-auto">
                    <Link href={`/community/${p.id}`} target="_blank">
                      افتح
                    </Link>
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function ToggleForm({
  action,
  id,
  name,
  value,
  label,
  icon,
}: {
  action: (formData: FormData) => Promise<void>;
  id: string;
  name: string;
  value: string;
  label: string;
  icon: 'hide' | 'show' | 'lock' | 'unlock' | 'pin';
}) {
  const Icon =
    icon === 'hide' ? EyeOff : icon === 'show' ? Eye : icon === 'lock' ? Lock : icon === 'unlock' ? Unlock : Pin;
  return (
    <form action={action} className="w-full sm:w-auto">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name={name} value={value} />
      <Button type="submit" size="sm" variant="outline" className="w-full sm:w-auto">
        <Icon className="w-4 h-4" /> {label}
      </Button>
    </form>
  );
}

function TabLink({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={`flex-shrink-0 whitespace-nowrap text-sm px-4 py-2 rounded-full border transition-colors ${
        active
          ? 'bg-brand-500 text-white border-brand-500'
          : 'bg-white text-gray-600 border-gray-200 hover:border-brand-500/40'
      }`}
    >
      {label}
    </Link>
  );
}
