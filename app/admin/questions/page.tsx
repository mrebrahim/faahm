import Link from 'next/link';
import { createServiceClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { timeAgoAr } from '@/lib/community';
import { HelpCircle, ShieldCheck } from 'lucide-react';
import { answerQuestion, rejectQuestion } from './actions';

export const metadata = { title: 'أسئلة الطلبة' };
export const dynamic = 'force-dynamic';

/**
 * The answering queue.
 *
 * Oldest first, deliberately: a question that has waited three days is
 * more urgent than one asked five minutes ago, and newest-first queues
 * quietly starve the bottom.
 */
export default async function AdminQuestionsPage({
  searchParams,
}: {
  searchParams: { tab?: string };
}) {
  const service = createServiceClient();
  const tab = searchParams.tab === 'answered' ? 'answered' : 'pending';

  const [{ data: rows }, { count: pendingCount }] = await Promise.all([
    service
      .from('lesson_questions')
      .select(
        `id, question, answer, status, timestamp_sec, created_at, answered_at, user_id,
         lesson:lessons(id, title_ar),
         course:courses(slug, title_ar)`
      )
      .eq('status', tab === 'pending' ? 'pending' : 'answered')
      .order('created_at', { ascending: tab === 'pending' })
      .limit(50),
    service
      .from('lesson_questions')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending'),
  ]);

  const askerIds = Array.from(new Set((rows ?? []).map((r: any) => r.user_id)));
  const { data: profiles } = askerIds.length
    ? await service.from('profiles').select('id, full_name, email').in('id', askerIds)
    : { data: [] as any[] };
  const nameOf = new Map((profiles ?? []).map((p: any) => [p.id, p.full_name || p.email || '—']));

  return (
    <div className="p-4 sm:p-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="font-display text-2xl sm:text-3xl font-bold mb-1">أسئلة الطلبة</h1>
        <p className="text-sm text-gray-500 leading-relaxed">
          أسئلة متسألة من جوه الدروس. الرد بيوصل للطالب على الإيميل، وبيظهر
          تحت الدرس لباقي الطلبة.
        </p>
      </div>

      <div className="-mx-4 px-4 overflow-x-auto md:mx-0 md:px-0 mb-6">
        <div className="flex gap-2 w-max md:w-auto">
          <Tab
            href="/admin/questions"
            label={`مستنية رد${pendingCount ? ` (${pendingCount})` : ''}`}
            active={tab === 'pending'}
          />
          <Tab href="/admin/questions?tab=answered" label="اتجاوب عليها" active={tab === 'answered'} />
        </div>
      </div>

      {(rows ?? []).length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-10 text-center">
          <ShieldCheck className="w-10 h-10 mx-auto mb-3 text-emerald-500" />
          <p className="font-bold mb-1">
            {tab === 'pending' ? 'مفيش أسئلة مستنية' : 'مفيش أسئلة متجاوب عليها لسه'}
          </p>
          <p className="text-sm text-gray-500">
            {tab === 'pending' ? 'كل حاجة اتردّ عليها 👏' : ''}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {(rows ?? []).map((q: any) => {
            const lesson = Array.isArray(q.lesson) ? q.lesson[0] : q.lesson;
            const course = Array.isArray(q.course) ? q.course[0] : q.course;
            return (
              <div key={q.id} className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
                <div className="flex items-center gap-2 flex-wrap text-xs text-gray-500">
                  <HelpCircle className="w-4 h-4 text-brand-600 flex-shrink-0" />
                  <span className="font-bold text-gray-900">{nameOf.get(q.user_id) ?? '—'}</span>
                  <span>• {timeAgoAr(q.created_at)}</span>
                  {q.timestamp_sec ? (
                    <span className="px-2 py-0.5 rounded-full bg-gray-100">
                      عند {Math.floor(q.timestamp_sec / 60)}:
                      {String(Math.floor(q.timestamp_sec % 60)).padStart(2, '0')}
                    </span>
                  ) : null}
                </div>

                <div className="text-xs text-gray-500 min-w-0">
                  <span className="font-medium">{course?.title_ar ?? '—'}</span>
                  <span className="mx-1">›</span>
                  <span>{lesson?.title_ar ?? '—'}</span>
                  {lesson?.id ? (
                    <Link
                      href={`/lesson/${lesson.id}`}
                      target="_blank"
                      className="text-brand-600 hover:underline ms-2"
                    >
                      افتح الدرس ↗
                    </Link>
                  ) : null}
                </div>

                <div className="p-3 rounded-lg bg-gray-50 border-e-4 border-brand-500 text-sm whitespace-pre-wrap break-words">
                  {q.question}
                </div>

                {q.status === 'answered' ? (
                  <div className="p-3 rounded-lg bg-brand-500/5 border border-brand-500/20 text-sm whitespace-pre-wrap break-words">
                    <span className="font-bold text-brand-700 block mb-1">الرد:</span>
                    {q.answer}
                  </div>
                ) : (
                  <form action={answerQuestion} className="space-y-3">
                    <input type="hidden" name="id" value={q.id} />
                    <textarea
                      name="answer"
                      required
                      rows={4}
                      placeholder="اكتب الرد…"
                      className="w-full rounded-lg border border-gray-200 p-3 text-sm leading-relaxed"
                    />
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="checkbox" name="is_public" defaultChecked />
                      اعرض السؤال والرد لباقي الطلبة تحت الدرس
                    </label>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Button type="submit" size="sm" className="w-full sm:w-auto">
                        ابعت الرد
                      </Button>
                    </div>
                  </form>
                )}

                {q.status === 'pending' ? (
                  <form action={rejectQuestion}>
                    <input type="hidden" name="id" value={q.id} />
                    <Button type="submit" size="sm" variant="ghost" className="text-gray-400">
                      تجاهل السؤال
                    </Button>
                  </form>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Tab({ href, label, active }: { href: string; label: string; active: boolean }) {
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
