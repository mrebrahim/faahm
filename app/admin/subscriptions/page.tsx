import Link from 'next/link';
import { createServiceClient } from '@/lib/supabase/server';
import { requireFinanceAdmin } from '@/lib/admin-guard';
import { auditLog } from '@/lib/admin-audit';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  CalendarPlus,
} from 'lucide-react';
import { cancelSubscription, extendSubscription } from './actions';

export const metadata = { title: 'الاشتراكات — إدارة فاهم!' };

const STATUS_LABELS: Record<string, string> = {
  active: 'نشط',
  trialing: 'تجريبي',
  cancelled: 'ملغى',
  expired: 'منتهي',
  paused: 'موقّف',
};

type SearchParams = {
  q?: string;
  status?: string;
  page?: string;
  success?: string;
  error?: string;
};

const PAGE_SIZE = 50;

export default async function SubscriptionsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const ctx = await requireFinanceAdmin();
  void auditLog(ctx, {
    action: 'subscriptions.list_viewed',
    metadata: { filters: searchParams },
  });
  const service = createServiceClient();

  const page = Math.max(1, parseInt(searchParams.page || '1', 10) || 1);
  const offset = (page - 1) * PAGE_SIZE;

  let query = service
    .from('v_subscriptions_admin')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1);

  if (searchParams.status && searchParams.status !== 'all') {
    query = query.eq('status', searchParams.status);
  }
  const q = (searchParams.q || '').trim().replace(/[%_,]/g, '');
  if (q.length >= 3) {
    const isFullUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(q);
    if (isFullUuid) {
      query = query.or(`id.eq.${q},stripe_subscription_id.ilike.%${q}%`);
    } else if (/^[a-z0-9_-]{4,}$/i.test(q)) {
      query = query.or(`stripe_subscription_id.ilike.%${q}%`);
    } else {
      query = query.or(`user_email.ilike.%${q}%,user_name.ilike.%${q}%`);
    }
  }

  const { data: subscriptions, count } = await query;

  // KPI counts
  const { data: counts } = await service
    .from('subscriptions')
    .select('status')
    .in('status', ['active', 'trialing', 'cancelled', 'expired', 'paused']);

  const buckets = (counts || []).reduce<Record<string, number>>((acc, r: any) => {
    acc[r.status] = (acc[r.status] || 0) + 1;
    return acc;
  }, {});

  const totalPages = Math.max(1, Math.ceil((count || 0) / PAGE_SIZE));
  const buildHref = (patch: Partial<SearchParams>) => {
    const next = { ...searchParams, ...patch };
    const params = new URLSearchParams();
    Object.entries(next).forEach(([k, v]) => {
      if (v && k !== 'success' && k !== 'error') params.set(k, String(v));
    });
    const qs = params.toString();
    return qs ? `/admin/subscriptions?${qs}` : '/admin/subscriptions';
  };

  return (
    <div className="p-6 lg:p-8 max-w-7xl">
      <div className="flex items-center justify-between gap-3 flex-wrap mb-6">
        <div>
          <h1 className="font-display text-3xl font-bold">الاشتراكات</h1>
          <p className="text-sm text-gray-500 mt-1">
            عرض وإدارة كل الاشتراكات النشطة وغير النشطة.
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/subscriptions/new">
            <Plus className="w-4 h-4" />
            منح اشتراك يدوي
          </Link>
        </Button>
      </div>

      {searchParams.success && (
        <div className="mb-4 p-3 rounded-lg bg-brand-500/10 border border-brand-500/30 text-brand-700 text-sm">
          {searchParams.success === 'cancelled'
            ? 'تم إلغاء الاشتراك.'
            : searchParams.success === 'extended'
              ? 'تم تمديد الاشتراك.'
              : searchParams.success === 'granted'
                ? 'تم منح الاشتراك.'
                : 'تم.'}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        {(['active', 'trialing', 'cancelled', 'expired', 'paused'] as const).map((s) => (
          <div key={s} className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="text-xs text-gray-500 mb-1">{STATUS_LABELS[s]}</div>
            <div dir="ltr" className="font-display text-2xl font-bold">
              {buckets[s] || 0}
            </div>
          </div>
        ))}
      </div>

      <form className="mb-3">
        {searchParams.status && (
          <input type="hidden" name="status" value={searchParams.status} />
        )}
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            name="q"
            defaultValue={searchParams.q || ''}
            placeholder="بحث: email أو اسم أو subscription id..."
            className="pr-10"
          />
        </div>
      </form>

      <div className="flex items-center flex-wrap gap-2 mb-4">
        {(['all', 'active', 'trialing', 'cancelled', 'expired', 'paused'] as const).map((s) => (
          <Link
            key={s}
            href={buildHref({ status: s === 'all' ? undefined : s, page: undefined })}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              (searchParams.status || 'all') === s
                ? 'bg-brand-500 text-white border-brand-500'
                : 'bg-white text-gray-700 border-gray-200 hover:border-brand-500/40'
            }`}
          >
            {s === 'all' ? 'الكل' : STATUS_LABELS[s]}
          </Link>
        ))}
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 text-xs">
              <tr>
                <Th>المستخدم</Th>
                <Th>الخطة</Th>
                <Th>البوابة</Th>
                <Th>يبدأ</Th>
                <Th>ينتهي</Th>
                <Th>الحالة</Th>
                <Th>إجراءات</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(subscriptions || []).map((s: any) => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <Td>
                    <div className="font-medium truncate max-w-[200px]">
                      {s.user_name || s.user_email || '—'}
                    </div>
                    {s.user_email && (
                      <div className="text-xs text-gray-500 truncate max-w-[200px]" dir="ltr">
                        {s.user_email}
                      </div>
                    )}
                  </Td>
                  <Td>{s.plan}</Td>
                  <Td>
                    <span className="px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-700">
                      {s.gateway}
                    </span>
                  </Td>
                  <Td>
                    <span dir="ltr" className="text-xs text-gray-700">
                      {s.current_period_start?.slice(0, 10) || '—'}
                    </span>
                  </Td>
                  <Td>
                    <span dir="ltr" className="text-xs text-gray-700">
                      {s.current_period_end?.slice(0, 10) || '—'}
                    </span>
                  </Td>
                  <Td>
                    <StatusBadge status={s.status} />
                  </Td>
                  <Td>
                    <div className="flex items-center gap-1 flex-wrap">
                      <form action={extendSubscription} className="flex items-center gap-1">
                        <input type="hidden" name="id" value={s.id} />
                        <input
                          name="days"
                          type="number"
                          min="1"
                          defaultValue={30}
                          dir="ltr"
                          className="w-16 h-8 text-xs px-2 rounded border border-gray-200"
                          title="عدد الأيام"
                        />
                        <Button type="submit" variant="ghost" size="sm" title="تمديد">
                          <CalendarPlus className="w-3.5 h-3.5" />
                        </Button>
                      </form>
                      {s.status === 'active' && (
                        <form action={cancelSubscription}>
                          <input type="hidden" name="id" value={s.id} />
                          <input type="hidden" name="mode" value="immediate" />
                          <Button
                            type="submit"
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:bg-destructive/10"
                            title="إلغاء فوري"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                          </Button>
                        </form>
                      )}
                    </div>
                  </Td>
                </tr>
              ))}
              {(!subscriptions || subscriptions.length === 0) && (
                <tr>
                  <td colSpan={7} className="text-center py-16 text-sm text-gray-500">
                    مفيش اشتراكات بالفلاتر دي.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="text-gray-500">
            صفحة <span dir="ltr">{page} / {totalPages}</span> ·{' '}
            <span dir="ltr">{count || 0}</span> اشتراك
          </span>
          <div className="flex items-center gap-2">
            {page > 1 && (
              <Button asChild variant="outline" size="sm">
                <Link href={buildHref({ page: String(page - 1) })}>السابق</Link>
              </Button>
            )}
            {page < totalPages && (
              <Button asChild variant="outline" size="sm">
                <Link href={buildHref({ page: String(page + 1) })}>التالي</Link>
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th scope="col" className="text-right font-semibold px-4 py-3 whitespace-nowrap">
      {children}
    </th>
  );
}

function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-4 py-3 align-middle">{children}</td>;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { cls: string; icon: any }> = {
    active: { cls: 'bg-emerald-50 text-emerald-700', icon: CheckCircle2 },
    trialing: { cls: 'bg-blue-50 text-blue-700', icon: CheckCircle2 },
    cancelled: { cls: 'bg-gray-100 text-gray-600', icon: XCircle },
    expired: { cls: 'bg-rose-50 text-rose-700', icon: XCircle },
    paused: { cls: 'bg-amber-50 text-amber-700', icon: XCircle },
  };
  const m = map[status] || map.cancelled;
  const Icon = m.icon;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${m.cls}`}
    >
      <Icon className="w-3 h-3" />
      {STATUS_LABELS[status] || status}
    </span>
  );
}
