import Link from 'next/link';
import { createServiceClient } from '@/lib/supabase/server';
import { requireAdmin, canViewFinance } from '@/lib/admin-guard';
import { Button } from '@/components/ui/button';
import {
  Users,
  BookOpen,
  CreditCard,
  TrendingUp,
  Plus,
  ArrowLeft,
} from 'lucide-react';

export const metadata = {
  title: 'لوحة الإدارة',
};

export default async function AdminDashboardPage() {
  // Layout has already run requireAdmin (so role + audit are settled);
  // re-resolve the role here to decide whether to render the revenue
  // total. Moderators see every operational stat but stay blind to the
  // aggregate revenue / profit number.
  const ctx = await requireAdmin();
  const showFinance = canViewFinance(ctx.userRole);

  // Use service client to bypass RLS for admin stats
  const supabase = createServiceClient();

  // Fetch counts in parallel
  const [
    { count: totalUsers },
    { count: totalCourses },
    { count: activeSubscriptions },
    { count: totalPayments },
    { data: recentSignups },
    { data: recentPayments },
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('courses').select('*', { count: 'exact', head: true }),
    supabase.from('subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('payments').select('*', { count: 'exact', head: true }).eq('status', 'paid'),
    supabase
      .from('profiles')
      .select('id, full_name, created_at')
      .order('created_at', { ascending: false })
      .limit(5),
    supabase
      .from('payments')
      .select('id, amount_cents, currency, status, created_at, user_id')
      .order('created_at', { ascending: false })
      .limit(5),
  ]);

  // Skip the revenue sum entirely for non-finance roles so the number
  // never enters the render tree, even briefly.
  let totalRevenue = 0;
  if (showFinance) {
    const { data: paidPayments } = await supabase
      .from('payments')
      .select('amount_cents')
      .eq('status', 'paid');
    totalRevenue = (paidPayments || []).reduce((sum, p) => sum + (p.amount_cents || 0), 0);
  }

  return (
    <div className="p-8 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl font-bold">الرئيسية</h1>
          <p className="text-gray-500 mt-1">نظرة عامة على المنصة</p>
        </div>
        <Button asChild>
          <Link href="/admin/courses/new">
            <Plus className="w-4 h-4" />
            كورس جديد
          </Link>
        </Button>
      </div>

      {/* Stats Grid */}
      <div
        className={`grid grid-cols-1 md:grid-cols-2 ${
          showFinance ? 'lg:grid-cols-4' : 'lg:grid-cols-3'
        } gap-4 mb-8`}
      >
        <StatCard
          icon={Users}
          label="الطلاب"
          value={totalUsers?.toString() || '0'}
          trend="جميع الحسابات المسجلة"
          link="/admin/students"
        />
        <StatCard
          icon={BookOpen}
          label="الكورسات"
          value={totalCourses?.toString() || '0'}
          trend="منشورة ومسودات"
          link="/admin/courses"
        />
        <StatCard
          icon={CreditCard}
          label="الاشتراكات النشطة"
          value={activeSubscriptions?.toString() || '0'}
          trend="مدفوعة حاليًا"
          link="/admin/subscriptions"
        />
        {showFinance && (
          <StatCard
            icon={TrendingUp}
            label="الإيرادات"
            value={`$${(totalRevenue / 100).toFixed(2)}`}
            trend={`${totalPayments || 0} عملية دفع`}
            link="/admin/payments"
            highlight
          />
        )}
      </div>

      {/* Two columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Signups */}
        <div className="rounded-2xl bg-white border border-gray-200">
          <div className="p-6 border-b border-gray-200 flex items-center justify-between">
            <h3 className="font-bold">آخر التسجيلات</h3>
            <Link href="/admin/students" className="text-sm text-brand-600 hover:text-brand-600 flex items-center gap-1">
              عرض الكل
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </div>
          <div className="divide-y divide-gray-200">
            {recentSignups && recentSignups.length > 0 ? (
              recentSignups.map((u) => (
                <div key={u.id} className="p-4 flex items-center justify-between text-sm">
                  <div>
                    <div className="font-medium">{u.full_name || 'بدون اسم'}</div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {new Date(u.created_at).toLocaleDateString('ar-EG')}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-12 text-center text-sm text-gray-500">لسه ما حدش سجّل</div>
            )}
          </div>
        </div>

        {/* Recent Payments */}
        <div className="rounded-2xl bg-white border border-gray-200">
          <div className="p-6 border-b border-gray-200 flex items-center justify-between">
            <h3 className="font-bold">آخر المدفوعات</h3>
            <Link href="/admin/payments" className="text-sm text-brand-600 hover:text-brand-600 flex items-center gap-1">
              عرض الكل
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </div>
          <div className="divide-y divide-gray-200">
            {recentPayments && recentPayments.length > 0 ? (
              recentPayments.map((p) => (
                <div key={p.id} className="p-4 flex items-center justify-between text-sm">
                  <div>
                    <div className="font-bold text-brand-600">
                      ${((p.amount_cents || 0) / 100).toFixed(2)}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {new Date(p.created_at).toLocaleDateString('ar-EG')}
                    </div>
                  </div>
                  <div className="text-xs">
                    <span className={`px-2 py-1 rounded-full ${
                      p.status === 'paid'
                        ? 'bg-brand-500/20 text-brand-600'
                        : 'bg-yellow-500/20 text-yellow-400'
                    }`}>
                      {p.status === 'paid' ? 'مدفوع' : 'معلّق'}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-12 text-center text-sm text-gray-500">لسه ما فيش مدفوعات</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  trend,
  link,
  highlight = false,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  trend: string;
  link?: string;
  highlight?: boolean;
}) {
  const card = (
    <div className={`p-6 rounded-2xl border transition-all ${
      highlight
        ? 'bg-gradient-to-br from-brand-500/10 to-white border-brand-500/30 hover:border-brand-500/50'
        : 'bg-white border-gray-200 hover:border-gray-300'
    }`}>
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
          highlight ? 'bg-brand-500/20' : 'bg-gray-100'
        }`}>
          <Icon className={`w-5 h-5 ${highlight ? 'text-brand-600' : 'text-gray-600'}`} />
        </div>
      </div>
      <div className="text-3xl font-extrabold mb-1 font-display">{value}</div>
      <div className="text-sm font-medium">{label}</div>
      <div className="text-xs text-gray-500 mt-1">{trend}</div>
    </div>
  );

  if (link) {
    return <Link href={link}>{card}</Link>;
  }
  return card;
}
