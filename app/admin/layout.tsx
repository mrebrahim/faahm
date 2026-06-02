import Link from 'next/link';
import { headers } from 'next/headers';
import { requireAdmin, canViewFinance } from '@/lib/admin-guard';
import { auditLog } from '@/lib/admin-audit';
import { APP_NAME } from '@/lib/constants';
import {
  LayoutDashboard,
  BookOpen,
  Users,
  CreditCard,
  HelpCircle,
  Award,
  Settings,
  Home,
  LogOut,
  Shield,
  Ticket,
  TrendingUp,
  Inbox,
  Sparkles,
  Users2,
} from 'lucide-react';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Centralised admin gate: role check + structured audit log on denial.
  const ctx = await requireAdmin();

  // Log every admin page view so we can spot reconnaissance later.
  const path = headers().get('x-invoke-path') || headers().get('referer') || '/admin';
  void auditLog(ctx, {
    action: 'admin.page_view',
    path,
  });

  const profile = { full_name: ctx.userEmail, role: ctx.userRole };
  const showFinance = canViewFinance(ctx.userRole);
  const roleLabel = ctx.userRole === 'moderator' ? 'مشرف' : 'مدير';

  return (
    <div className="min-h-screen bg-white flex">
      {/* Sidebar */}
      <aside className="w-64 border-l border-gray-200 bg-gray-50 flex-shrink-0 flex flex-col">
        {/* Logo */}
        <div className="h-16 flex items-center px-6 border-b border-gray-200">
          <Link href="/admin" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-brand-500 flex items-center justify-center font-display font-extrabold text-white">
              ف
            </div>
            <div>
              <div className="font-display font-extrabold leading-none">{APP_NAME}</div>
              <div className="text-xs text-brand-600 mt-0.5">لوحة الإدارة</div>
            </div>
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-4 py-6 space-y-1 text-sm">
          <NavSection title="الإدارة">
            <NavLink href="/admin" icon={LayoutDashboard}>الرئيسية</NavLink>
            <NavLink href="/admin/courses" icon={BookOpen}>الكورسات</NavLink>
            <NavLink href="/admin/students" icon={Users}>الطلاب</NavLink>
            <NavLink href="/admin/leads" icon={Inbox}>بريد العملاء المحتملين</NavLink>
            <NavLink href="/admin/career-leads" icon={Sparkles}>عملاء التيست المهني</NavLink>
            <NavLink href="/admin/personality-leads" icon={Users2}>عملاء اختبار الشخصية</NavLink>
            <NavLink href="/admin/quizzes" icon={HelpCircle}>المسابقات</NavLink>
            <NavLink href="/admin/certificates" icon={Award}>الشهادات</NavLink>
          </NavSection>

          <NavSection title="المالية">
            {showFinance && (
              <NavLink href="/admin/revenue" icon={TrendingUp}>لوحة الإيرادات</NavLink>
            )}
            <NavLink href="/admin/payments" icon={CreditCard}>المدفوعات</NavLink>
            <NavLink href="/admin/subscriptions" icon={CreditCard}>الاشتراكات</NavLink>
            <NavLink href="/admin/coupons" icon={Ticket}>الكوبونات</NavLink>
          </NavSection>

          <NavSection title="النظام">
            <NavLink href="/admin/audit-log" icon={Shield}>سجل المراجعة</NavLink>
            <NavLink href="/admin/settings" icon={Settings}>الإعدادات</NavLink>
          </NavSection>
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 space-y-2">
          <div className="px-3 py-2 text-xs text-gray-500">
            <div>{profile?.full_name}</div>
            <div className="text-brand-600">{roleLabel}</div>
          </div>
          <Link
            href="/"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100 hover:text-foreground transition-colors"
          >
            <Home className="w-4 h-4" />
            رجوع للموقع
          </Link>
          <form action="/auth/signout" method="POST">
            <button
              type="submit"
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100 hover:text-foreground transition-colors"
            >
              <LogOut className="w-4 h-4" />
              خروج
            </button>
          </form>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-x-hidden">{children}</main>
    </div>
  );
}

function NavSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="pb-4">
      <div className="px-3 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
        {title}
      </div>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function NavLink({
  href,
  icon: Icon,
  children,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-foreground transition-colors"
    >
      <Icon className="w-4 h-4" />
      {children}
    </Link>
  );
}
