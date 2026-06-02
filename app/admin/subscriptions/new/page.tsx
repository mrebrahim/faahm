import Link from 'next/link';
import { createServiceClient } from '@/lib/supabase/server';
import { requireFinanceAdmin } from '@/lib/admin-guard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowRight, AlertCircle } from 'lucide-react';
import { grantManualSubscription } from '../actions';

export const metadata = { title: 'منح اشتراك يدوي — إدارة فاهم!' };

export default async function ManualGrantPage({
  searchParams,
}: {
  searchParams: { q?: string; error?: string };
}) {
  await requireFinanceAdmin();
  const service = createServiceClient();

  // Show a small picker of recent users — full search by email below.
  const q = (searchParams.q || '').trim();
  let users: any[] = [];
  if (q.length >= 3) {
    // Join via the v_subscriptions_admin view in reverse: just lookup
    // profiles + email. Use the existing admin_students_v if available
    // for consistency with the students page.
    const { data } = await service
      .from('admin_students_v')
      .select('id, email, full_name')
      .or(`email.ilike.%${q}%,full_name.ilike.%${q}%`)
      .limit(20);
    users = data || [];
  }

  return (
    <div className="p-6 lg:p-8 max-w-2xl">
      <Link
        href="/admin/subscriptions"
        className="text-sm text-brand-600 hover:text-brand-700 inline-flex items-center gap-1 mb-3"
      >
        <ArrowRight className="w-4 h-4" />
        العودة للاشتراكات
      </Link>
      <h1 className="font-display text-3xl font-bold mb-2">منح اشتراك يدوي</h1>
      <p className="text-sm text-gray-500 mb-6">
        منح اشتراك مجاني للمستخدم بدون مرور بالبوابة. مفيد للشراكات
        التسويقية أو التعويضات.
      </p>

      {searchParams.error && (
        <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {decodeURIComponent(searchParams.error)}
        </div>
      )}

      {/* Step 1: find user */}
      <section className="mb-6 p-5 rounded-2xl border border-gray-200 bg-white">
        <h2 className="font-bold mb-3 text-sm">١. اختار المستخدم</h2>
        <form className="mb-3">
          <Input
            name="q"
            defaultValue={q}
            placeholder="ابحث بالـ email أو الاسم..."
          />
        </form>
        {q.length >= 3 && users.length === 0 && (
          <p className="text-sm text-gray-500">مفيش مستخدمين بالنتائج دي.</p>
        )}
        {users.length > 0 && (
          <ul className="space-y-1">
            {users.map((u) => (
              <li key={u.id}>
                <a
                  href={`?q=${encodeURIComponent(q)}&picked=${u.id}`}
                  className="block p-2 rounded-lg hover:bg-gray-50"
                >
                  <div className="font-medium">{u.full_name || u.email}</div>
                  {u.email && (
                    <div className="text-xs text-gray-500" dir="ltr">
                      {u.email}
                    </div>
                  )}
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Step 2: grant */}
      <section className="p-5 rounded-2xl border border-gray-200 bg-white">
        <h2 className="font-bold mb-3 text-sm">٢. تفاصيل المنحة</h2>
        <form action={grantManualSubscription} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="user_id">معرّف المستخدم (uuid)</Label>
            <Input
              id="user_id"
              name="user_id"
              dir="ltr"
              required
              placeholder="انسخ المعرّف من نتائج البحث فوق أو من صفحة الطالب"
            />
            <p className="text-[11px] text-gray-500">
              مش لاقي زر سريع؟ افتح <Link href="/admin/students" className="underline">قائمة الطلاب</Link> وانسخ الـ id.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="plan">الخطة</Label>
              <select
                id="plan"
                name="plan"
                defaultValue="monthly"
                className="flex h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm"
              >
                <option value="monthly">شهري</option>
                <option value="yearly">سنوي</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="days">عدد الأيام</Label>
              <Input
                id="days"
                name="days"
                type="number"
                min="1"
                max="3650"
                defaultValue={30}
                dir="ltr"
                required
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="reason">السبب</Label>
            <Input
              id="reason"
              name="reason"
              placeholder="شراكة تسويقية / تعويض / مؤثر..."
            />
          </div>

          <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900">
            ⚠ لو فيه اشتراك نشط للمستخدم، هيتم تمديده بالمدة دي. لو لا، هيتم
            إنشاء اشتراك يدوي جديد.
          </div>

          <Button type="submit">منح الاشتراك</Button>
        </form>
      </section>
    </div>
  );
}
