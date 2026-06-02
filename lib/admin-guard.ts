import { redirect } from 'next/navigation';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { auditLog, type AuditContext } from '@/lib/admin-audit';

export const ADMIN_ROLES = new Set([
  'admin',
  'super_admin',
  'content_admin',
  'billing_admin',
  'moderator',
]);

/**
 * Roles allowed to see revenue, payments, subscriptions, coupons and any
 * other money-facing surface. `moderator` and `content_admin` are kept
 * blind to financials by design.
 */
export const FINANCE_ROLES = new Set(['admin', 'super_admin', 'billing_admin']);

/**
 * /admin sub-paths that expose money — keep in sync with FINANCE_ROLES.
 * Middleware blocks non-finance roles from these; the admin nav hides
 * them; the admin home swaps out the revenue widgets.
 */
export const FINANCE_PATH_PREFIXES = [
  '/admin/revenue',
  '/admin/payments',
  '/admin/subscriptions',
  '/admin/coupons',
];

export function canViewFinance(role: string | null | undefined): boolean {
  return !!role && FINANCE_ROLES.has(role);
}

export function isFinancePath(pathname: string): boolean {
  return FINANCE_PATH_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + '/'));
}

/**
 * Verify the caller is authenticated and has an admin-level role. Logs
 * unauthorized attempts to the audit log before redirecting. Always returns
 * a fresh AuditContext so callers can pipe it into loggedAction().
 */
export async function requireAdmin(): Promise<AuditContext> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login?redirect=/admin');
  }

  // Use service client to bypass any RLS shenanigans on the profile read.
  // We've already verified the user via auth.getUser() so this is safe.
  const service = createServiceClient();
  const { data: profile } = await service
    .from('profiles')
    .select('role, is_blocked, full_name')
    .eq('id', user.id)
    .single();

  if (profile?.is_blocked) {
    void auditLog(
      { userId: user.id, userEmail: user.email ?? null, userRole: profile.role ?? null },
      { action: 'auth.blocked_user_attempt', result: 'failure' }
    );
    redirect('/login?error=blocked');
  }

  if (!profile?.role || !ADMIN_ROLES.has(profile.role)) {
    void auditLog(
      {
        userId: user.id,
        userEmail: user.email ?? null,
        userRole: profile?.role ?? null,
      },
      {
        action: 'admin.access_denied',
        result: 'failure',
        metadata: { reason: 'role_not_admin' },
      }
    );
    redirect('/dashboard');
  }

  return {
    userId: user.id,
    userEmail: user.email ?? null,
    userRole: profile.role,
  };
}

/**
 * Same as requireAdmin but also rejects roles that aren't allowed to see
 * money (revenue/payments/subscriptions/coupons). Use in finance pages
 * and any server action that touches payment data.
 */
export async function requireFinanceAdmin(): Promise<AuditContext> {
  const ctx = await requireAdmin();
  if (!canViewFinance(ctx.userRole)) {
    void auditLog(ctx, {
      action: 'admin.access_denied',
      result: 'failure',
      metadata: { reason: 'role_cannot_view_finance' },
    });
    redirect('/admin');
  }
  return ctx;
}
