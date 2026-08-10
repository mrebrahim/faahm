import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/admin-guard';
import { auditLog } from '@/lib/admin-audit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_EXPORT_ROWS = 5_000;

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return '';
  const s = typeof value === 'string' ? value : String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function GET(request: NextRequest) {
  const ctx = await requireAdmin();
  const url = new URL(request.url);

  const service = createServiceClient();
  let query = service
    .from('admin_students_v')
    .select(
      'id, full_name, email, phone, country, role, is_blocked, joined_at, last_sign_in_at, subscription_status, subscription_plan, subscription_ends_at, lessons_completed, certificates_count, total_spent_cents'
    )
    .order('joined_at', { ascending: false })
    .limit(MAX_EXPORT_ROWS);

  const q = url.searchParams.get('q');
  const sub = url.searchParams.get('sub');
  const role = url.searchParams.get('role');
  const status = url.searchParams.get('status');
  const since = url.searchParams.get('since');

  if (q && q.trim().length >= 2) {
    const term = q.trim().replace(/[%_]/g, '');
    query = query.or(
      `full_name.ilike.%${term}%,email.ilike.%${term}%,phone.ilike.%${term}%`
    );
  }
  if (role && ['student', 'instructor', 'admin'].includes(role)) {
    query = query.eq('role', role);
  }
  if (status === 'banned') query = query.eq('is_blocked', true);
  else if (status === 'active') query = query.eq('is_blocked', false);
  if (sub) {
    if (sub === 'none') query = query.is('subscription_status', null);
    else query = query.eq('subscription_status', sub);
  }
  if (since) {
    const days = parseInt(since, 10);
    if (Number.isFinite(days) && days > 0) {
      const cutoff = new Date(Date.now() - days * 86_400_000).toISOString();
      query = query.gte('joined_at', cutoff);
    }
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  void auditLog(ctx, {
    action: 'student.exported_csv',
    metadata: {
      filters: { q, sub, role, status, since },
      row_count: data?.length || 0,
    },
  });

  const header = [
    'id',
    'full_name',
    'email',
    'phone',
    'country',
    'role',
    'is_blocked',
    'joined_at',
    'last_sign_in_at',
    'subscription_status',
    'subscription_plan',
    'subscription_ends_at',
    'lessons_completed',
    'certificates_count',
    'total_spent_usd',
  ];
  const lines = [header.join(',')];
  for (const row of data || []) {
    lines.push(
      [
        csvEscape((row as any).id),
        csvEscape((row as any).full_name),
        csvEscape((row as any).email),
        csvEscape((row as any).phone),
        csvEscape((row as any).country),
        csvEscape((row as any).role),
        csvEscape((row as any).is_blocked),
        csvEscape((row as any).joined_at),
        csvEscape((row as any).last_sign_in_at),
        csvEscape((row as any).subscription_status),
        csvEscape((row as any).subscription_plan),
        csvEscape((row as any).subscription_ends_at),
        csvEscape((row as any).lessons_completed),
        csvEscape((row as any).certificates_count),
        csvEscape(((row as any).total_spent_cents || 0) / 100),
      ].join(',')
    );
  }

  const filename = `faahm-students-${new Date().toISOString().slice(0, 10)}.csv`;
  // BOM so Excel opens the Arabic name column in UTF-8 instead of mojibake.
  return new NextResponse('﻿' + lines.join('\n'), {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
      'X-Robots-Tag': 'noindex',
    },
  });
}
