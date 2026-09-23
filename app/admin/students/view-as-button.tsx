'use client';

import { useState } from 'react';
import { Eye } from 'lucide-react';
import { viewAsStudent } from './impersonate-actions';

/**
 * The eye button: open this student's account as if you were them.
 *
 * Confirms first. The click signs your browser out of the admin account
 * and into theirs, which is a surprising thing to have happen by
 * accident from a table row — and the amber banner that follows is a
 * lot less alarming when you meant to do it.
 */
export function ViewAsButton({ id, email }: { id: string; email: string }) {
  const [busy, setBusy] = useState(false);

  return (
    <form
      action={viewAsStudent}
      className="inline"
      onSubmit={(e) => {
        const ok = window.confirm(
          `هتدخل على حساب ${email} كأنك هو.\n\n` +
            'هتخرج من حساب الأدمن مؤقتاً، وهيظهرلك شريط أصفر فوق ترجع بيه.\n\n' +
            'تكمّل؟'
        );
        if (!ok) {
          e.preventDefault();
          return;
        }
        setBusy(true);
      }}
    >
      <input type="hidden" name="user_id" value={id} />
      <button
        type="submit"
        disabled={busy}
        title={`ادخل على حساب ${email}`}
        aria-label={`ادخل على حساب ${email}`}
        className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium text-amber-800 bg-amber-500/15 hover:bg-amber-500/25 disabled:opacity-50 transition-colors me-2"
      >
        <Eye className="w-3.5 h-3.5" />
        {busy ? '...' : 'دخول'}
      </button>
    </form>
  );
}
