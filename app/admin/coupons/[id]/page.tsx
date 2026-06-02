import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createServiceClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/admin-guard';
import { Button } from '@/components/ui/button';
import { ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react';
import { updateCoupon, toggleCouponActive } from '../actions';
import { CouponForm } from '../coupon-form';

export const metadata = { title: 'تعديل كوبون — إدارة فاهم!' };

export default async function CouponEditPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { success?: string; error?: string };
}) {
  await requireAdmin();
  const service = createServiceClient();

  const { data: coupon } = await service
    .from('coupons')
    .select('*')
    .eq('id', params.id)
    .maybeSingle();

  if (!coupon) notFound();

  // Recent redemptions for context (top 20).
  const { data: redemptions } = await service
    .from('coupon_redemptions')
    .select('id, user_id, payment_id, redeemed_at')
    .eq('coupon_id', params.id)
    .order('redeemed_at', { ascending: false })
    .limit(20);

  return (
    <div className="p-6 lg:p-8 max-w-3xl">
      <Link
        href="/admin/coupons"
        className="text-sm text-brand-600 hover:text-brand-700 inline-flex items-center gap-1 mb-3"
      >
        <ArrowRight className="w-4 h-4" />
        العودة للكوبونات
      </Link>

      <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
        <h1 className="font-display text-3xl font-bold">
          تعديل <code dir="ltr" className="font-mono">{coupon.code}</code>
        </h1>
        <form action={toggleCouponActive}>
          <input type="hidden" name="id" value={coupon.id} />
          <input type="hidden" name="is_active" value={String(coupon.is_active)} />
          <Button type="submit" variant="outline">
            {coupon.is_active ? 'تعطيل الكوبون' : 'تفعيل الكوبون'}
          </Button>
        </form>
      </div>

      {searchParams.error && (
        <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {decodeURIComponent(searchParams.error)}
        </div>
      )}
      {searchParams.success && (
        <div className="mb-4 p-3 rounded-lg bg-brand-500/10 border border-brand-500/30 text-brand-700 text-sm flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          {searchParams.success === 'created' ? 'تم إنشاء الكوبون.' : 'تم الحفظ.'}
        </div>
      )}

      <CouponForm action={updateCoupon} defaults={coupon} submitLabel="حفظ التغييرات" />

      <section className="mt-8">
        <h2 className="font-bold mb-3">آخر الاستخدامات</h2>
        <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
          {(redemptions || []).length === 0 ? (
            <p className="text-sm text-gray-500 p-4">لسه ما فيش استخدامات.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {(redemptions || []).map((r: any) => (
                <li key={r.id} className="px-4 py-2 text-sm flex items-center justify-between">
                  <span dir="ltr" className="text-xs font-mono text-gray-500">
                    user {r.user_id.slice(0, 8)}
                  </span>
                  <span dir="ltr" className="text-xs text-gray-500">
                    {new Date(r.redeemed_at).toLocaleDateString('ar-EG')}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
