import Link from 'next/link';
import { requireAdmin } from '@/lib/admin-guard';
import { createServiceClient } from '@/lib/supabase/server';
import { ArrowRight, AlertCircle } from 'lucide-react';
import { createCoupon } from '../actions';
import { CouponForm } from '../coupon-form';

export const metadata = { title: 'كوبون جديد — إدارة فاهم!' };

export default async function NewCouponPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  await requireAdmin();
  const service = createServiceClient();
  const { data: courses } = await service
    .from('courses')
    .select('id, title_ar, slug')
    .order('title_ar');

  return (
    <div className="p-6 lg:p-8 max-w-2xl">
      <Link
        href="/admin/coupons"
        className="text-sm text-brand-600 hover:text-brand-700 inline-flex items-center gap-1 mb-3"
      >
        <ArrowRight className="w-4 h-4" />
        العودة للكوبونات
      </Link>
      <h1 className="font-display text-3xl font-bold mb-6">كوبون جديد</h1>

      {searchParams.error && (
        <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {decodeURIComponent(searchParams.error)}
        </div>
      )}

      <CouponForm
        action={createCoupon}
        submitLabel="إنشاء الكوبون"
        courses={courses || []}
      />
    </div>
  );
}
