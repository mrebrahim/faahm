import Link from 'next/link';
import { createServiceClient } from '@/lib/supabase/server';
import { requireFinanceAdmin } from '@/lib/admin-guard';
import { Button } from '@/components/ui/button';
import { Plus, CheckCircle2, XCircle } from 'lucide-react';
import { toggleCouponActive } from './actions';

export const metadata = { title: 'الكوبونات — إدارة فاهم!' };

export default async function CouponsPage() {
  await requireFinanceAdmin();
  const service = createServiceClient();

  const { data: coupons } = await service
    .from('coupons')
    .select(
      'id, code, discount_type, discount_value, applies_to, max_uses, used_count, expires_at, is_active, description, created_at'
    )
    .order('created_at', { ascending: false });

  return (
    <div className="p-6 lg:p-8 max-w-6xl">
      <div className="flex items-center justify-between gap-3 flex-wrap mb-6">
        <div>
          <h1 className="font-display text-3xl font-bold">الكوبونات</h1>
          <p className="text-sm text-gray-500 mt-1">
            أنشئ وتحكّم في أكواد الخصم اللي بتستخدمها للترويج.
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/coupons/new">
            <Plus className="w-4 h-4" />
            كوبون جديد
          </Link>
        </Button>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 text-xs">
              <tr>
                <Th>الكود</Th>
                <Th>النوع</Th>
                <Th>القيمة</Th>
                <Th>ينطبق على</Th>
                <Th>الاستخدام</Th>
                <Th>الانتهاء</Th>
                <Th>الحالة</Th>
                <Th>{''}</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(coupons || []).map((c: any) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <Td>
                    <code dir="ltr" className="text-sm font-mono bg-gray-100 px-2 py-0.5 rounded">
                      {c.code}
                    </code>
                  </Td>
                  <Td>{c.discount_type === 'percent' ? 'نسبة' : 'مبلغ ثابت'}</Td>
                  <Td>
                    <span dir="ltr" className="font-bold">
                      {c.discount_type === 'percent'
                        ? `${c.discount_value}%`
                        : `$${(c.discount_value / 100).toFixed(2)}`}
                    </span>
                  </Td>
                  <Td>
                    <span className="px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-700">
                      {c.applies_to}
                    </span>
                  </Td>
                  <Td>
                    <span dir="ltr">
                      {c.used_count || 0} / {c.max_uses ?? '∞'}
                    </span>
                  </Td>
                  <Td>
                    <span dir="ltr" className="text-xs text-gray-600">
                      {c.expires_at ? c.expires_at.slice(0, 10) : '—'}
                    </span>
                  </Td>
                  <Td>
                    {c.is_active ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-emerald-50 text-emerald-700">
                        <CheckCircle2 className="w-3 h-3" /> مفعّل
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-600">
                        <XCircle className="w-3 h-3" /> معطّل
                      </span>
                    )}
                  </Td>
                  <Td>
                    <div className="flex items-center gap-1">
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/admin/coupons/${c.id}`}>تعديل</Link>
                      </Button>
                      <form action={toggleCouponActive}>
                        <input type="hidden" name="id" value={c.id} />
                        <input type="hidden" name="is_active" value={String(c.is_active)} />
                        <Button type="submit" variant="ghost" size="sm">
                          {c.is_active ? 'تعطيل' : 'تفعيل'}
                        </Button>
                      </form>
                    </div>
                  </Td>
                </tr>
              ))}
              {(!coupons || coupons.length === 0) && (
                <tr>
                  <td colSpan={8} className="text-center py-16 text-sm text-gray-500">
                    لسه ما فيش كوبونات. أنشئ أول كوبون من الزر اللي فوق.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
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
