import { createServiceClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { POST_KINDS, POST_KIND_EMOJI, POST_KIND_LABELS, timeAgoAr } from '@/lib/community';
import { Megaphone, Trash2, Users } from 'lucide-react';
import {
  createAdminPost,
  createGroup,
  deleteGroup,
  toggleGroupActive,
} from './group-actions';

const AUDIENCE_LABELS: Record<string, string> = {
  everyone: '🌍 الكل',
  subscribers: '👑 المشتركين بس',
  non_subscribers: '🎯 غير المشتركين بس',
};

const SCOPE_LABELS: Record<string, string> = {
  general: 'عام',
  course: 'مرتبط بكورسات',
};

/**
 * Group management. Only admins create groups — students can open a
 * thread inside one, but it waits for approval.
 *
 * The create form asks the two questions that decide who ever sees the
 * room: which courses (or general), and subscribers vs non-subscribers.
 */
export async function GroupsTab() {
  const service = createServiceClient();

  const [{ data: groups }, { data: courses }] = await Promise.all([
    service
      .from('community_groups')
      .select(
        'id, name, description, scope, audience, allow_posts, is_active, created_at, community_group_courses(course_id)'
      )
      .order('sort_order')
      .order('created_at', { ascending: false }),
    service
      .from('courses')
      .select('id, title_ar, is_free, yearly_only')
      .eq('is_published', true)
      .order('sort_order'),
  ]);

  return (
    <div className="space-y-6">
      {/* Create */}
      <details className="rounded-xl border border-brand-500/30 bg-brand-500/5 p-4 sm:p-5">
        <summary className="cursor-pointer list-none font-bold flex items-center gap-2">
          <Users className="w-4 h-4 text-brand-600" />
          ➕ اعمل جروب جديد
        </summary>

        <form action={createGroup} className="mt-5 space-y-5">
          <div>
            <Label htmlFor="g-name">اسم الجروب</Label>
            <Input id="g-name" name="name" required maxLength={120} placeholder="مثلاً: نقاشات n8n" className="mt-1" />
          </div>

          <div>
            <Label htmlFor="g-desc">وصف مختصر (اختياري)</Label>
            <Input id="g-desc" name="description" maxLength={300} className="mt-1" />
          </div>

          {/* Question 1 — which courses, or general */}
          <fieldset className="rounded-xl border border-gray-200 bg-white p-4">
            <legend className="px-2 text-sm font-bold">الجروب ده لمين؟</legend>
            <div className="space-y-2">
              <label className="flex items-start gap-2 cursor-pointer">
                <input type="radio" name="scope" value="general" defaultChecked className="mt-1" />
                <span className="text-sm leading-relaxed">
                  <span className="font-bold">جروب عام</span>
                  <br />
                  <span className="text-gray-500 text-xs">
                    مش مربوط بكورس معيّن — بيظهر لأي حد الجمهور تحت بيسمحله.
                  </span>
                </span>
              </label>
              <label className="flex items-start gap-2 cursor-pointer">
                <input type="radio" name="scope" value="course" className="mt-1" />
                <span className="text-sm leading-relaxed">
                  <span className="font-bold">للمشتركين في كورسات معيّنة</span>
                  <br />
                  <span className="text-gray-500 text-xs">
                    بيظهر بس للي عنده وصول لواحد من الكورسات اللي هتختارها.
                  </span>
                </span>
              </label>
            </div>

            <div className="mt-4">
              <Label className="text-sm">اختار الكورسات</Label>
              <p className="text-xs text-gray-500 mb-2">
                تُستخدم لما تختار "للمشتركين في كورسات معيّنة".
              </p>
              {/* Long list, capped and scrollable so the form stays usable
                  on a phone with 30 courses in the catalog. */}
              <div className="max-h-56 overflow-y-auto rounded-lg border border-gray-200 p-2 space-y-1">
                {(courses ?? []).map((c: any) => (
                  <label key={c.id} className="flex items-center gap-2 text-sm p-1.5 rounded hover:bg-gray-50 cursor-pointer">
                    <input type="checkbox" name="course_ids" value={c.id} className="flex-shrink-0" />
                    <span className="truncate min-w-0">{c.title_ar}</span>
                    {c.is_free ? <span className="text-[11px] text-emerald-600 flex-shrink-0">مجاني</span> : null}
                    {c.yearly_only ? <span className="text-[11px] text-amber-600 flex-shrink-0">سنوي</span> : null}
                  </label>
                ))}
              </div>
            </div>
          </fieldset>

          {/* Question 2 — subscribers or not */}
          <fieldset className="rounded-xl border border-gray-200 bg-white p-4">
            <legend className="px-2 text-sm font-bold">مشتركين ولا غير مشتركين؟</legend>
            <div className="space-y-2">
              {(
                [
                  ['everyone', 'الكل', 'مشتركين وغير مشتركين.'],
                  ['subscribers', 'المشتركين بس', 'الكوميونيتي المدفوع.'],
                  [
                    'non_subscribers',
                    'غير المشتركين بس',
                    'جروب تربية ليدز — للناس اللي لسه ما اشتركتش.',
                  ],
                ] as const
              ).map(([value, label, hint], i) => (
                <label key={value} className="flex items-start gap-2 cursor-pointer">
                  <input type="radio" name="audience" value={value} defaultChecked={i === 0} className="mt-1" />
                  <span className="text-sm leading-relaxed">
                    <span className="font-bold">{label}</span>
                    <br />
                    <span className="text-gray-500 text-xs">{hint}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" name="allow_posts" defaultChecked />
            الطلبة يقدروا يفتحوا مواضيع هنا (بعد موافقتك)
          </label>

          <Button type="submit" className="w-full sm:w-auto">
            اعمل الجروب
          </Button>
        </form>
      </details>

      {/* Admin announcement */}
      {(groups ?? []).length > 0 && (
        <details className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5">
          <summary className="cursor-pointer list-none font-bold flex items-center gap-2">
            <Megaphone className="w-4 h-4 text-brand-600" />
            📣 انشر بوست باسم فاهم
          </summary>
          <form action={createAdminPost} className="mt-5 space-y-4">
            <div>
              <Label htmlFor="p-group">الجروب</Label>
              <select
                id="p-group"
                name="group_id"
                className="mt-1 w-full rounded-lg border border-gray-200 p-2.5 text-sm bg-white"
              >
                <option value="">الفيد العام (من غير جروب)</option>
                {(groups ?? []).map((g: any) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label htmlFor="p-kind">النوع</Label>
              <select
                id="p-kind"
                name="kind"
                className="mt-1 w-full rounded-lg border border-gray-200 p-2.5 text-sm bg-white"
              >
                {POST_KINDS.map((k) => (
                  <option key={k} value={k}>
                    {POST_KIND_EMOJI[k]} {POST_KIND_LABELS[k]}
                  </option>
                ))}
              </select>
            </div>

            <Input name="title" placeholder="عنوان (اختياري)" maxLength={140} />
            <textarea
              name="body"
              required
              rows={4}
              maxLength={8000}
              placeholder="اكتب البوست…"
              className="w-full rounded-xl border border-gray-200 p-3 text-sm leading-relaxed"
            />
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" name="pin" />
              ثبّته في أول الجروب
            </label>
            <Button type="submit" className="w-full sm:w-auto">
              انشر
            </Button>
          </form>
        </details>
      )}

      {/* Existing groups */}
      {(groups ?? []).length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center">
          <Users className="w-10 h-10 mx-auto mb-3 text-gray-400" />
          <p className="font-bold mb-1">لسه مفيش جروبات</p>
          <p className="text-sm text-gray-500">
            الطلبة مش هيشوفوا الكوميونيتي غير لما تعمل جروب واحد على الأقل.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {(groups ?? []).map((g: any) => (
            <div
              key={g.id}
              className={`rounded-xl border p-4 ${
                g.is_active ? 'border-gray-200 bg-white' : 'border-gray-200 bg-gray-50 opacity-70'
              }`}
            >
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0 flex-1">
                  <p className="font-bold break-words">{g.name}</p>
                  {g.description ? (
                    <p className="text-sm text-gray-600 mt-0.5 break-words">{g.description}</p>
                  ) : null}
                  <div className="flex items-center gap-2 flex-wrap mt-2 text-xs">
                    <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                      {SCOPE_LABELS[g.scope]}
                      {g.scope === 'course'
                        ? ` (${g.community_group_courses?.length ?? 0} كورس)`
                        : ''}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-700">
                      {AUDIENCE_LABELS[g.audience]}
                    </span>
                    {!g.allow_posts ? (
                      <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">
                        إعلانات بس
                      </span>
                    ) : null}
                    {!g.is_active ? (
                      <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                        متوقّف
                      </span>
                    ) : null}
                    <span className="text-gray-400">{timeAgoAr(g.created_at)}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 mt-3">
                <form action={toggleGroupActive} className="w-full sm:w-auto">
                  <input type="hidden" name="id" value={g.id} />
                  <input type="hidden" name="active" value={(!g.is_active).toString()} />
                  <Button type="submit" size="sm" variant="outline" className="w-full sm:w-auto">
                    {g.is_active ? 'إيقاف' : 'تفعيل'}
                  </Button>
                </form>
                <form action={deleteGroup} className="w-full sm:w-auto">
                  <input type="hidden" name="id" value={g.id} />
                  <Button type="submit" size="sm" variant="ghost" className="w-full sm:w-auto text-destructive">
                    <Trash2 className="w-4 h-4" /> حذف
                  </Button>
                </form>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
