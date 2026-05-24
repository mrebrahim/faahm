import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/admin-guard';
import { auditLog } from '@/lib/admin-audit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_EXPORT_ROWS = 10_000;

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return '';
  const s = typeof value === 'string' ? value : JSON.stringify(value);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export async function GET(request: NextRequest) {
  const ctx = await requireAdmin();
  const url = new URL(request.url);

  const service = createServiceClient();
  let query = service
    .from('admin_audit_log')
    .select(
      'created_at, user_email, user_role, action, resource_type, resource_id, result, error_message, ip, country, user_agent, path, metadata'
    )
    .order('created_at', { ascending: false })
    .limit(MAX_EXPORT_ROWS);

  const action = url.searchParams.get('action');
  const result = url.searchParams.get('result');
  const user = url.searchParams.get('user');
  const q = url.searchParams.get('q');

  if (action) query = query.eq('action', action);
  if (result === 'success' || result === 'failure') query = query.eq('result', result);
  if (user) query = query.ilike('user_email', `%${user.toLowerCase()}%`);
  if (q) {
    const clean = q.replace(/[%_]/g, '');
    query = query.or(
      `action.ilike.%${clean}%,user_email.ilike.%${clean}%,ip.ilike.%${clean}%,path.ilike.%${clean}%`
    );
  }

  const { data: rows, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  void auditLog(ctx, {
    action: 'audit_log.exported',
    metadata: {
      filters: { action, result, user, q },
      row_count: rows?.length || 0,
    },
  });

  const header = [
    'created_at',
    'user_email',
    'user_role',
    'action',
    'resource_type',
    'resource_id',
    'result',
    'error_message',
    'ip',
    'country',
    'user_agent',
    'path',
    'metadata',
  ];
  const lines = [header.join(',')];
  for (const row of rows || []) {
    lines.push(header.map((col) => csvEscape((row as any)[col])).join(','));
  }
  const csv = lines.join('\n');

  const filename = `faahm-audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
      'X-Robots-Tag': 'noindex',
    },
  });
}
