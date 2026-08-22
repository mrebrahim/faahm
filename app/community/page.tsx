import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { APP_NAME } from '@/lib/constants';
import {
  POST_KINDS,
  POST_KIND_EMOJI,
  POST_KIND_LABELS,
  canAccessCommunity,
  canPostToCommunity,
  getFeed,
  getGroupsFor,
  type PostKind,
} from '@/lib/community';
import { getLeaderboard, getUserXp, levelProgress } from '@/lib/xp';
import { PostCard } from './post-card';
import { createPostAction } from './actions';
import { AlertCircle, Flame, Trophy, Users } from 'lucide-react';

export const metadata = {
  title: `الكوميونيتي — ${APP_NAME}`,
  description:
    'اسأل، شارك إنجازك، واتعلّم من باقي الطلبة في مجتمع فاهم للذكاء الاصطناعي.',
};

export const dynamic = 'force-dynamic';

export default async function CommunityPage({
  searchParams,
}: {
  searchParams: { kind?: string; group?: string; error?: string; notice?: string };
}) {
  const {
    data: { user },
  } = await createClient().auth.getUser();

  if (!user) redirect('/login?redirect=/community');

  // The community is a yearly-plan benefit. Show the reason rather than
  // an empty room — a monthly subscriber staring at nothing assumes the
  // feature is broken.
  if (!(await canAccessCommunity(user.id))) {
    return <CommunityLocked />;
  }

  const kind = (POST_KINDS as readonly string[]).includes(searchParams.kind || '')
    ? (searchParams.kind as PostKind)
    : null;

  const groups = await getGroupsFor(user.id);
  // Default to the first room the viewer can see. Landing on an
  // undifferentiated global feed makes the group structure invisible.
  const activeGroup = searchParams.group
    ? groups.find((g) => g.id === searchParams.group) ?? null
    : groups[0] ?? null;

  const [posts, canPost, xp, leaders] = await Promise.all([
    getFeed({ viewerId: user.id, kind, groupId: activeGroup?.id ?? null, limit: 20 }),
    canPostToCommunity(user.id),
    getUserXp(user.id),
    getLeaderboard(10),
  ]);

  const canPostHere = canPost && (activeGroup?.allow_posts ?? false);

  const prog = levelProgress(xp.total_xp);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-6 sm:py-10 max-w-5xl">
        <header className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-6 h-6 text-brand-600" />
            <h1 className="font-display text-2xl sm:text-3xl font-extrabold">
              كوميونيتي فاهم
            </h1>
          </div>
          <p className="text-sm text-gray-600 leading-relaxed">
            اسأل سؤالك، شارك اللي وصلتله، واتعلّم من ناس بتذاكر نفس الحاجة.
          </p>
        </header>

        {searchParams.notice && (
          <div className="mb-5 p-3 rounded-xl bg-brand-500/10 border border-brand-500/30 text-brand-700 text-sm leading-relaxed">
            {searchParams.notice}
          </div>
        )}

        {searchParams.error && (
          <div className="mb-5 p-3 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-sm flex items-start gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <div className="leading-relaxed">{searchParams.error}</div>
          </div>
        )}

        {/* Single column on phones; the sidebar drops underneath. */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4 min-w-0">
            {/* Group switcher. Rooms are created by admins; a student
                only ever picks between the ones they're admitted to. */}
            {groups.length > 0 ? (
              <div className="-mx-4 px-4 overflow-x-auto md:mx-0 md:px-0">
                <div className="flex gap-2 w-max md:w-auto md:flex-wrap">
                  {groups.map((g) => (
                    <FilterChip
                      key={g.id}
                      label={`${g.name}${g.post_count ? ` (${g.post_count})` : ''}`}
                      href={`/community?group=${g.id}`}
                      active={activeGroup?.id === g.id}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center">
                <p className="font-bold mb-1">لسه مفيش جروبات ليك</p>
                <p className="text-sm text-gray-500 leading-relaxed">
                  فريق فاهم بيجهّز الجروبات. تعالى بصّ تاني قريب.
                </p>
              </div>
            )}

            {activeGroup?.description ? (
              <p className="text-sm text-gray-600 leading-relaxed">{activeGroup.description}</p>
            ) : null}

            {canPostHere ? (
              <form
                action={createPostAction}
                className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5 space-y-3"
              >
                <input type="hidden" name="group_id" value={activeGroup?.id ?? ''} />
                <Input
                  name="title"
                  placeholder="عنوان (اختياري)"
                  maxLength={140}
                  className="text-sm"
                />
                <textarea
                  name="body"
                  required
                  rows={3}
                  maxLength={8000}
                  placeholder="اكتب سؤالك أو شارك حاجة اتعلمتها النهارده…"
                  className="w-full rounded-xl border border-gray-200 p-3 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-brand-500/40 resize-y"
                />
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="-mx-4 px-4 overflow-x-auto sm:mx-0 sm:px-0">
                    <div className="flex gap-2 w-max sm:w-auto">
                      {POST_KINDS.map((k, i) => (
                        <label
                          key={k}
                          className="flex-shrink-0 whitespace-nowrap text-xs px-3 py-1.5 rounded-full border border-gray-200 cursor-pointer has-[:checked]:bg-brand-500 has-[:checked]:text-white has-[:checked]:border-brand-500"
                        >
                          <input
                            type="radio"
                            name="kind"
                            value={k}
                            defaultChecked={i === 0}
                            className="sr-only"
                          />
                          {POST_KIND_EMOJI[k]} {POST_KIND_LABELS[k]}
                        </label>
                      ))}
                    </div>
                  </div>
                  <Button type="submit" className="w-full sm:w-auto sm:ms-auto">
                    ابعت للمراجعة
                  </Button>
                </div>
                <p className="text-xs text-gray-500">
                  البوستات بتتراجع من فريق فاهم قبل ما تظهر للناس.
                </p>
              </form>
            ) : activeGroup && !activeGroup.allow_posts ? (
              <div className="rounded-2xl border border-gray-200 bg-white p-4 text-sm text-gray-600">
                الجروب ده للإعلانات بس — مفيش كتابة فيه.
              </div>
            ) : groups.length === 0 ? null : (
              <div className="rounded-2xl border border-brand-500/30 bg-brand-500/5 p-4 sm:p-5">
                <p className="text-sm leading-relaxed mb-3">
                  الكتابة في الكوميونيتي لطلبة فاهم. ابدأ بكورس مجاني أو اشترك
                  وهتقدر تسأل وتشارك على طول.
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button asChild className="w-full sm:w-auto">
                    <Link href="/courses?free=1">الكورسات المجانية</Link>
                  </Button>
                  <Button asChild variant="outline" className="w-full sm:w-auto">
                    <Link href="/pricing">شوف الباقات</Link>
                  </Button>
                </div>
              </div>
            )}

            {/* Filter chips scroll sideways on a phone instead of wrapping. */}
            <div className="-mx-4 px-4 overflow-x-auto md:mx-0 md:px-0">
              <div className="flex gap-2 w-max md:w-auto md:flex-wrap">
                <FilterChip label="الكل" href="/community" active={!kind} />
                {POST_KINDS.map((k) => (
                  <FilterChip
                    key={k}
                    label={`${POST_KIND_EMOJI[k]} ${POST_KIND_LABELS[k]}`}
                    href={`/community?kind=${k}`}
                    active={kind === k}
                  />
                ))}
              </div>
            </div>

            {posts.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center">
                <p className="text-gray-500 text-sm">
                  لسه مفيش بوستات هنا. كن أول واحد يكسر السكوت 👋
                </p>
              </div>
            ) : (
              posts.map((p) => <PostCard key={p.id} post={p} />)
            )}
          </div>

          {/* Sidebar */}
          <aside className="space-y-4 min-w-0">
            <div className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-sm">نقاطك</span>
                <span className="inline-flex items-center gap-1 text-xs text-orange-600 font-bold">
                  <Flame className="w-4 h-4" />
                  {xp.current_streak} يوم
                </span>
              </div>
              <div className="flex items-baseline gap-2 mb-2">
                <span className="font-display text-3xl sm:text-4xl font-extrabold text-brand-600">
                  {xp.total_xp}
                </span>
                <span className="text-xs text-gray-500">XP • مستوى {prog.level}</span>
              </div>
              <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                <div
                  className="h-full bg-brand-500 rounded-full"
                  style={{ width: `${prog.percent}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                فاضل {prog.toNext} نقطة للمستوى {prog.level + 1}
              </p>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5">
              <div className="flex items-center gap-2 mb-3">
                <Trophy className="w-4 h-4 text-amber-500" />
                <span className="font-bold text-sm">المتصدرين</span>
              </div>
              {leaders.length === 0 ? (
                <p className="text-xs text-gray-500">لسه بدري — ذاكر واطلع فوق 🚀</p>
              ) : (
                <ol className="space-y-2">
                  {leaders.map((row) => (
                    <li
                      key={row.user_id}
                      className={`flex items-center gap-2 text-sm min-w-0 ${
                        row.user_id === user.id ? 'font-bold text-brand-700' : ''
                      }`}
                    >
                      <span className="w-5 text-xs text-gray-400 flex-shrink-0">
                        {row.rank}
                      </span>
                      <span className="truncate min-w-0 flex-1">{row.full_name}</span>
                      <span className="text-xs text-gray-500 flex-shrink-0">
                        {row.total_xp}
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function CommunityLocked() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-12 sm:py-20 max-w-lg">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 sm:p-8 text-center">
          <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-amber-50 flex items-center justify-center text-3xl">
            👑
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold mb-3">
            الكوميونيتي للباقة السنوية
          </h1>
          <p className="text-gray-600 leading-relaxed mb-6">
            كوميونيتي فاهم متاح لمشتركي الباقة السنوية. تقدر تسأل، تشارك
            نقاش، تحط مصدر مفيد، وتدخل جروبات الكورسات اللي معاك.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild className="w-full sm:w-auto">
              <Link href="/checkout?plan=yearly">اشترك سنوي</Link>
            </Button>
            <Button asChild variant="outline" className="w-full sm:w-auto">
              <Link href="/pricing">شوف الباقات</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function FilterChip({
  label,
  href,
  active,
}: {
  label: string;
  href: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex-shrink-0 whitespace-nowrap text-xs px-3 py-1.5 rounded-full border transition-colors ${
        active
          ? 'bg-brand-500 text-white border-brand-500'
          : 'bg-white text-gray-600 border-gray-200 hover:border-brand-500/40'
      }`}
    >
      {label}
    </Link>
  );
}
