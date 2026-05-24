import { redirect } from 'next/navigation';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { auditLog, type AuditContext } from '@/lib/admin-audit';

const ADMIN_ROLES = new Set(['admin', 'super_admin', 'content_admin', 'billing_admin']);

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
