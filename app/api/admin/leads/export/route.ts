import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/admin-guard';
import { auditLog } from '@/lib/admin-audit';
import { describeLeadResult, describeLeadSource } from '@/lib/leads-labels';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_EXPORT_ROWS = 5_000;

const VALID_TYPES = new Set([
  'career',
  'personality',
  'ai_readiness',
  'self_discovery',
  'ai_skills',
  'productivity',
  'entrepreneurship',
  'eq',
  'newsletter',
]);

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return '';
  const s = typeof value === 'string' ? value : String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/**
 * CSV export of the unified leads table. Mirrors the ?type= filter on
 * /admin/leads so 'تصدير CSV' hands back exactly the rows on screen.
 *
 * The quiz `result_code` is decoded into its Arabic label via the shared
 * lib/leads-labels helper — a marketer opening the sheet sees 'المُنفّذ'
 * rather than 'executor', and the same string the dashboard showed.
 */
export async function GET(request: NextRequest) {
  const ctx = await requireAdmin();
  const url = new URL(request.url);
  const type = url.searchParams.get('type');

  const service = createServiceClient();
  let query = service
    .from('admin_leads_unified')
    .select(
      'id, test_type, detail_source, name, whatsapp, email, result_code, primary_course_slug, utm_source, utm_campaign, contacted_at, created_at'
    )
    .order('created_at', { ascending: false })
    .limit(MAX_EXPORT_ROWS);

  if (type && VALID_TYPES.has(type)) {
    query = query.eq('test_type', type);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  void auditLog(ctx, {
    action: 'leads.exported_csv',
    metadata: { filters: { type }, row_count: data?.length || 0 },
  });

  const header = [
    'id',
    'name',
    'email',
    'whatsapp',
    'source',
    'test_type',
    'result',
    'result_code',
    'recommended_course',
    'utm_source',
    'utm_campaign',
    'contacted_at',
    'created_at',
  ];

  const lines = [header.join(',')];
  for (const row of data || []) {
    const r = row as any;
    lines.push(
      [
        csvEscape(r.id),
        csvEscape(r.name),
        csvEscape(r.email),
        csvEscape(r.whatsapp),
        csvEscape(describeLeadSource(r.test_type, r.detail_source)),
        csvEscape(r.test_type),
        csvEscape(describeLeadResult(r.test_type, r.result_code).label),
        csvEscape(r.result_code),
        csvEscape(r.primary_course_slug),
        csvEscape(r.utm_source),
        csvEscape(r.utm_campaign),
        csvEscape(r.contacted_at),
        csvEscape(r.created_at),
      ].join(',')
    );
  }

  const filename = `faahm-leads-${type || 'all'}-${new Date()
    .toISOString()
    .slice(0, 10)}.csv`;

  // BOM so Excel opens the Arabic columns in UTF-8 instead of mojibake.
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
