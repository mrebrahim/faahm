'use client';

import { useEffect, useRef, useState } from 'react';
import { Bot, Send, X } from 'lucide-react';

/**
 * Floating per-course AI chat. Streams plain-text tokens from
 * /api/chat which is yearly-subscription-gated server-side. This
 * component decides only what's visible to whom:
 *
 *   gate='none'      Visitor isn't signed in. Render nothing.
 *   gate='monthly'   Signed in, active monthly. Show an upgrade-to-
 *                    yearly card (no chat input).
 *   gate='yearly'    Active yearly. Full chat panel.
 *
 * Server props come from the page that mounts us. We never decide
 * gating from window state — the page already knows from Supabase.
 */
type Gate = 'none' | 'monthly' | 'yearly';
type Msg = { role: 'user' | 'assistant'; content: string };

export function CourseAiChat({
  gate,
  courseId,
  courseTitle,
  hasKnowledge = true,
  suggestions = [],
}: {
  gate: Gate;
  courseId: string;
  courseTitle: string;
  /** When false, the admin hasn't populated the course AI knowledge
   *  yet. Hide the launcher entirely — a chat with no knowledge would
   *  always return the off-topic apology and tease a feature that
   *  isn't ready. Defaults to true so existing call-sites keep working. */
  hasKnowledge?: boolean;
  /** Optional starter prompts shown as chips inside the panel. */
  suggestions?: string[];
}) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll to the bottom of the conversation as tokens arrive.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 1e9, behavior: 'smooth' });
  }, [messages, streaming]);

  // Esc closes the panel.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  // Strict yearly-only visibility per merchant request. Three layers
  // of gating, all decided server-side from Supabase before this
  // component renders:
  //
  //   gate='none'      Guest / not signed in     → nothing rendered.
  //   gate='monthly'   Active monthly subscriber → nothing rendered.
  //   gate='yearly'    Active yearly subscriber  → full chat.
  //
  // The /api/chat endpoint re-checks the gate on every request too,
  // so even a monthly user who guessed the URL would get a 402.
  // Belt + braces.
  if (gate !== 'yearly') return null;

  // Don't render anything for ANY visitor if the course doesn't have
  // a knowledge base yet — the assistant would have nothing to
  // answer from, so the launcher would just lie.
  if (!hasKnowledge) return null;

  const launcher = (
    <button
      type="button"
      onClick={() => setOpen(true)}
      aria-label="اسأل فاهم"
      className="fixed bottom-5 left-5 z-40 inline-flex items-center gap-2 ps-2.5 pe-4 py-2 rounded-full bg-brand-500 hover:bg-brand-600 text-white font-bold text-sm shadow-xl shadow-brand-500/30 transition-colors sm:bottom-6 sm:left-6"
    >
      <span className="w-9 h-9 rounded-full bg-white text-brand-600 inline-flex items-center justify-center shadow-inner">
        <Bot className="w-5 h-5" strokeWidth={2.25} />
      </span>
      <span>اسأل فاهم</span>
    </button>
  );

  if (!open) return launcher;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="المساعد الذكي للكورس"
      className="fixed inset-0 z-50 sm:inset-auto sm:bottom-6 sm:left-6 sm:w-[26rem] sm:h-[36rem] flex flex-col bg-white sm:rounded-2xl sm:shadow-2xl border border-gray-200"
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-3 p-3 border-b border-gray-200 bg-gray-50 sm:rounded-t-2xl">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-9 h-9 rounded-full bg-brand-500 text-white flex items-center justify-center flex-shrink-0 shadow-sm">
            <Bot className="w-5 h-5" strokeWidth={2.25} />
          </div>
          <div className="min-w-0">
            <div className="font-bold text-sm text-foreground truncate">
              اسأل فاهم
            </div>
            <div className="text-[11px] text-gray-500 truncate">
              {courseTitle}
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="إغلاق"
          className="w-9 h-9 rounded-full inline-flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Body */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50"
      >
        {messages.length === 0 && (
          <div className="text-center py-6">
            <div className="w-16 h-16 mx-auto rounded-full bg-brand-500/15 text-brand-600 flex items-center justify-center mb-3">
              <Bot className="w-8 h-8" strokeWidth={2.25} />
            </div>
            <h3 className="font-bold text-base mb-1">أهلاً! اسألني عن أي حاجة في الكورس</h3>
            <p className="text-xs text-gray-500 leading-relaxed">
              برد بناءً على محتوى الكورس فقط — لو السؤال خارج المنهج هقولك.
            </p>
            {suggestions.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2 justify-center">
                {suggestions.slice(0, 4).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => send(s)}
                    className="text-[11px] sm:text-xs text-start px-3 py-1.5 rounded-full border border-brand-500/30 bg-white hover:bg-brand-500/5 text-brand-700 transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {messages.map((m, i) => (
          <Bubble key={i} role={m.role}>
            {m.content || (streaming && i === messages.length - 1 ? '…' : '')}
          </Bubble>
        ))}
      </div>

      {/* Composer */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="flex items-center gap-2 p-2.5 border-t border-gray-200 bg-white sm:rounded-b-2xl"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="اكتب سؤالك…"
          disabled={streaming}
          className="flex-1 min-w-0 h-11 px-3 rounded-xl border border-gray-200 bg-white text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={!input.trim() || streaming}
          className="w-11 h-11 rounded-xl bg-brand-500 hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed text-white inline-flex items-center justify-center transition-colors"
          aria-label="ابعت"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );

  function send(raw: string) {
    const text = raw.trim();
    if (!text || streaming) return;

    const history = messages.slice(-6);
    const next: Msg[] = [
      ...messages,
      { role: 'user', content: text },
      { role: 'assistant', content: '' },
    ];
    setMessages(next);
    setInput('');
    setStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;
    // Safety net: even if the upstream stream never closes, force
    // the composer back to an enabled state after a generous
    // timeout. Without this the user is stuck unable to type
    // anything until a hard refresh.
    const watchdog = setTimeout(() => {
      if (!controller.signal.aborted) controller.abort();
      setStreaming(false);
    }, 45_000);

    fetch('/api/chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        courseId,
        question: text,
        history,
      }),
      signal: controller.signal,
    })
      .then(async (resp) => {
        if (!resp.ok) {
          // Try to read a structured {ok:false, detail:'…'} body so
          // the admin can see the real reason inline instead of just
          // a status code. Falls back to raw text for non-JSON
          // responses.
          let detail = '';
          try {
            const raw = await resp.text();
            try {
              const parsed = JSON.parse(raw) as { detail?: string; error?: string };
              detail = parsed.detail || parsed.error || raw;
            } catch {
              detail = raw;
            }
          } catch {
            /* nothing readable */
          }

          const apology =
            resp.status === 402
              ? 'الميزة دي للمشتركين السنويين فقط — رقّي اشتراكك للسنوي.'
              : resp.status === 401
                ? 'محتاج تسجّل دخول الأول.'
                : resp.status === 502
                  ? `مشكلة في الاتصال بالـ AI. ${detail || 'تأكد إن OPENAI_API_KEY متضاف في Coolify.'}`
                  : `مشكلة مؤقتة (${resp.status}).${detail ? ' ' + detail : ''}`;
          setMessages((m) => {
            const cp = m.slice();
            cp[cp.length - 1] = { role: 'assistant', content: apology };
            return cp;
          });
          clearTimeout(watchdog);
          setStreaming(false);
          return;
        }
        const reader = resp.body?.getReader();
        if (!reader) {
          clearTimeout(watchdog);
          setStreaming(false);
          return;
        }
        const decoder = new TextDecoder('utf-8');
        let buf = '';
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          setMessages((m) => {
            const cp = m.slice();
            cp[cp.length - 1] = { role: 'assistant', content: buf };
            return cp;
          });
        }
        clearTimeout(watchdog);
        setStreaming(false);
      })
      .catch((err) => {
        clearTimeout(watchdog);
        // AbortError from the watchdog or the user's reset — leave
        // any partial answer in place and just re-enable the input.
        if ((err as Error).name === 'AbortError') {
          setStreaming(false);
          return;
        }
        setMessages((m) => {
          const cp = m.slice();
          cp[cp.length - 1] = {
            role: 'assistant',
            content: 'مشكلة في الاتصال. حاول تاني.',
          };
          return cp;
        });
        setStreaming(false);
      });
  }
}

function Bubble({ role, children }: { role: 'user' | 'assistant'; children: React.ReactNode }) {
  if (role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-brand-500 text-white text-sm px-4 py-2.5 leading-relaxed whitespace-pre-wrap">
          {children}
        </div>
      </div>
    );
  }
  return (
    <div className="flex justify-start">
      <div className="max-w-[90%] rounded-2xl rounded-tl-sm bg-white border border-gray-200 text-sm px-4 py-2.5 leading-relaxed text-gray-800 whitespace-pre-wrap">
        {children}
      </div>
    </div>
  );
}

