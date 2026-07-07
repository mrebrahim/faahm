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
 * Super-admin allow-list — hardcoded emails plus an optional comma-separated
 * SUPER_ADMIN_EMAILS env var for adding without a code push. Super admins get
 * DESTRUCTIVE actions the normal 'admin' role is deliberately locked out of
 * (e.g. hard-deleting a mistakenly-recorded payment row). Keep this list
 * SHORT — one or two people who own the money surface.
 */
const HARDCODED_SUPER_ADMIN_EMAILS = ['ibrahim@digitalsolutionegy.com'];

function loadSuperAdminEmails(): Set<string> {
  const fromEnv = (process.env.SUPER_ADMIN_EMAILS || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return new Set([
    ...HARDCODED_SUPER_ADMIN_EMAILS.map((e) => e.toLowerCase()),
    ...fromEnv,
  ]);
}

export function isSuperAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  return loadSuperAdminEmails().has(email.toLowerCase());
}

/**
 * /admin sub-paths that show aggregated revenue / profit dashboards.
 * Moderators are blocked from these but keep access to operational
 * money-adjacent pages (payments list, subscriptions, coupons).
 */
export const FINANCE_PATH_PREFIXES = ['/admin/revenue'];

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

/**
 * Same as requireAdmin but also rejects any admin who isn't in the super-admin
 * allow-list. Use on destructive operations (delete a payment, wipe a row)
 * that a normal 'admin' role must NOT be able to run.
 */
export async function requireSuperAdmin(): Promise<AuditContext> {
  const ctx = await requireAdmin();
  if (!isSuperAdmin(ctx.userEmail)) {
    void auditLog(ctx, {
      action: 'admin.access_denied',
      result: 'failure',
      metadata: { reason: 'not_super_admin' },
    });
    redirect('/admin');
  }
  return ctx;
}
