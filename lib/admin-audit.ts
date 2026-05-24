import { headers } from 'next/headers';
import { createServiceClient } from '@/lib/supabase/server';

export type AuditContext = {
  userId: string | null;
  userEmail: string | null;
  userRole: string | null;
};

type AuditEntry = {
  action: string;
  resourceType?: string | null;
  resourceId?: string | null;
  path?: string | null;
  result?: 'success' | 'failure';
  errorMessage?: string | null;
  metadata?: Record<string, unknown>;
};

/**
 * Pull client metadata from the inbound request headers. We trust Cloudflare's
 * CF-Connecting-IP / CF-IPCountry when present; otherwise fall back to the
 * Vercel x-forwarded-for header. Both are server-controlled, never user-set.
 */
function readRequestContext() {
  const h = headers();
  const ip =
    h.get('cf-connecting-ip') ||
    h.get('x-real-ip') ||
    h.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    null;
  return {
    ip,
    country: h.get('cf-ipcountry') || null,
    userAgent: h.get('user-agent') || null,
    requestId: h.get('x-vercel-id') || h.get('x-request-id') || null,
    path: h.get('x-invoke-path') || h.get('referer') || null,
  };
}

/**
 * Write a single immutable row to admin_audit_log via the service role.
 * Never throws — audit failures must never block the actual action.
 */
export async function auditLog(ctx: AuditContext, entry: AuditEntry): Promise<void> {
  try {
    const service = createServiceClient();
    const req = readRequestContext();
    await service.from('admin_audit_log').insert({
      user_id: ctx.userId,
      user_email: ctx.userEmail,
      user_role: ctx.userRole,
      action: entry.action,
      resource_type: entry.resourceType ?? null,
      resource_id: entry.resourceId ?? null,
      path: entry.path ?? req.path,
      result: entry.result ?? 'success',
      error_message: entry.errorMessage ?? null,
      metadata: (entry.metadata ?? {}) as any,
      ip: req.ip,
      country: req.country,
      user_agent: req.userAgent,
      request_id: req.requestId,
    });
  } catch (err) {
    // Surface in server logs but never propagate — audit failure shouldn't
    // surface as a user-facing error or block the underlying action.
    console.error('[audit] failed to record event', entry.action, err);
  }
}

/**
 * Wrap a mutation in audit logging. Logs success when fn() resolves and
 * failure when it throws, then re-throws so the caller sees the original
 * error. Captures the action label, resource pointers, and a sanitized
 * payload snapshot. Use this for every admin write operation.
 */
export async function loggedAction<T>(
  ctx: AuditContext,
  entry: Omit<AuditEntry, 'result' | 'errorMessage'>,
  fn: () => Promise<T>
): Promise<T> {
  try {
    const out = await fn();
    void auditLog(ctx, { ...entry, result: 'success' });
    return out;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    void auditLog(ctx, { ...entry, result: 'failure', errorMessage: message });
    throw err;
  }
}

/**
 * Convert a FormData into a plain object suitable for logging. Strips
 * fields that obviously contain secrets (password, token, secret, etc.)
 * so we never leak them into the audit table. Very long values are
 * truncated to keep row size sane.
 */
export function formDataForLog(formData: FormData): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of formData.entries()) {
    if (/password|token|secret|api_key|stripe/i.test(key)) continue;
    if (typeof value === 'string') {
      out[key] = value.length > 500 ? value.slice(0, 500) + '…' : value;
    } else {
      out[key] = `[File ${(value as File).name}]`;
    }
  }
  return out;
}
