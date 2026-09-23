import { readImpersonation } from '@/lib/impersonation';
import { stopViewingAsStudent } from '@/app/admin/students/impersonate-actions';
import { Eye, LogOut } from 'lucide-react';

/**
 * Sits on every page while an admin is viewing a student's account.
 *
 * Loud on purpose. The failure this exists to prevent is an admin who
 * forgot they were impersonating and then changed or deleted something
 * while wearing somebody else's face. A subtle indicator would not stop
 * that; an amber bar across the top does.
 *
 * Renders nothing — and costs nothing but a cookie read — when no
 * impersonation is active.
 */
export function ImpersonationBanner() {
  const { active, targetEmail } = readImpersonation();
  if (!active) return null;

  return (
    <div className="sticky top-0 z-[70] bg-amber-500 text-amber-950">
      <div className="container mx-auto px-3 py-2 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[11px] sm:text-sm font-bold">
        <span className="inline-flex items-center gap-1.5 min-w-0">
          <Eye className="w-4 h-4 flex-shrink-0" aria-hidden />
          <span className="truncate">
            بتشوف حساب{' '}
            <span dir="ltr" className="font-mono">
              {targetEmail ?? 'طالب'}
            </span>
          </span>
        </span>
        <form action={stopViewingAsStudent}>
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-950 text-amber-50 hover:bg-amber-900 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            ارجع لحسابك
          </button>
        </form>
      </div>
    </div>
  );
}
