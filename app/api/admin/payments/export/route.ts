import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/admin-guard';
import { auditLog } from '@/lib/admin-audit';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MAX_ROWS = 10000;

/**
 * CSV export of payments. Reads filters from the same query params the
 * admin page uses, caps at 10k rows to keep the response bounded. The
 * stream is built up in memory which is fine at this scale; if we ever
 * need 100k+ rows we'll switch to a streamed response.
 */
export async function GET(req: Request) {
  const ctx = await requireAdmin();
  const url = new URL(req.url);
  const q = (url.searchParams.get('q') || '').trim().replace(/[%_,]/g, '');
  const status = url.searchParams.get('status');
  const gateway = url.searchParams.get('gateway');

  const service = createServiceClient();
  let query = service
    .from('v_payments_admin')
    .select(
      'id, created_at, user_id, user_email, user_name, user_country, amount_cents, currency, gateway, status, gateway_payment_id, gateway_order_id, subscription_id, subscription_plan, coupon_code, discount_cents'
    )
    .order('created_at', { ascending: false })
    .limit(MAX_ROWS);

  if (status && status !== 'all') query = query.eq('status', status);
  if (gateway && gateway !== 'all') query = query.eq('gateway', gateway);
  if (q.length >= 3) {
    const isFullUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(q);
    if (isFullUuid) {
      query = query.or(`id.eq.${q},gateway_payment_id.ilike.%${q}%,gateway_order_id.ilike.%${q}%`);
    } else if (/^[a-z0-9_-]{4,}$/i.test(q)) {
      query = query.or(`gateway_payment_id.ilike.%${q}%,gateway_order_id.ilike.%${q}%`);
    } else {
      query = query.or(`user_email.ilike.%${q}%,user_name.ilike.%${q}%`);
    }
  }

  const { data: rows, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const headers = [
    'payment_id',
    'created_at_iso',
    'user_id',
    'user_email',
    'user_name',
    'user_country',
    'amount_cents',
    'currency',
    'gateway',
    'status',
    'gateway_payment_id',
    'gateway_order_id',
    'subscription_id',
    'subscription_plan',
    'coupon_code',
    'discount_cents',
  ];

  const escape = (v: any) => {
    if (v == null) return '';
    const s = String(v);
    if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };

  const lines = [headers.join(',')];
  for (const r of rows || []) {
    lines.push(headers.map((h) => escape((r as any)[h])).join(','));
  }
  // UTF-8 BOM so Excel opens Arabic correctly.
  const body = '﻿' + lines.join('\n');

  void auditLog(ctx, {
    action: 'payments.csv_exported',
    metadata: { rows: rows?.length || 0, filters: { q, status, gateway } },
  });

  const stamp = new Date().toISOString().replace(/[:T]/g, '-').slice(0, 16);
  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="faahm-payments-${stamp}.csv"`,
      'Cache-Control': 'no-store',
    },
  });
}
