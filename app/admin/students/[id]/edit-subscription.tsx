import { Pencil } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { editStudentSubscription } from './actions';

/**
 * Pencil button that reveals a small inline form for switching a student's
 * subscription plan and resetting the billing period. Uses native <details>
 * so the whole thing is server-rendered — no client-side state needed.
 *
 * Renders next to 'حالة الاشتراك' on the student overview so admins can hit
 * the pencil, pick monthly/yearly, pick a start date, and hit save without
 * leaving the page. The server action does the +30/+365 math.
 */
export function EditSubscriptionButton({
  studentId,
  currentPlan,
  currentStart,
}: {
  studentId: string;
  currentPlan: 'monthly' | 'yearly' | null;
  currentStart: string | null;
}) {
  const defaultPlan = currentPlan || 'yearly';
  const defaultStart = (currentStart || new Date().toISOString()).slice(0, 10);

  return (
    <details className="relative inline-block">
      <summary
        className="cursor-pointer inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors list-none"
        title="تعديل الاشتراك"
      >
        <Pencil className="w-3 h-3" />
        تعديل
      </summary>
      <div className="absolute top-full end-0 mt-2 z-30 w-80 rounded-xl border-2 border-brand-500/30 bg-white shadow-xl p-4">
        <form action={editStudentSubscription} className="space-y-3">
          <input type="hidden" name="id" value={studentId} />

          <div>
            <h4 className="font-bold text-sm mb-2">تعديل الاشتراك</h4>
            <p className="text-[11px] text-gray-500 mb-3 leading-relaxed">
              اختار الخطة وتاريخ البداية — النظام هيحسب تاريخ النهاية
              تلقائياً (شهر أو سنة من تاريخ البداية).
            </p>
          </div>

          <div className="space-y-1">
            <Label htmlFor="plan" className="text-xs">
              الخطة
            </Label>
            <select
              id="plan"
              name="plan"
              defaultValue={defaultPlan}
              required
              className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            >
              <option value="monthly">شهري (30 يوم)</option>
              <option value="yearly">سنوي (365 يوم)</option>
            </select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="starts_at" className="text-xs">
              تاريخ البداية
            </Label>
            <Input
              id="starts_at"
              name="starts_at"
              type="date"
              defaultValue={defaultStart}
              required
              dir="ltr"
              className="h-10 text-sm"
            />
            <p className="text-[10px] text-gray-400 mt-1">
              النهاية بتتحسب تلقائياً من تاريخ البداية.
            </p>
          </div>

          <div className="pt-1">
            <Button type="submit" size="sm" className="w-full">
              حفظ التعديلات
            </Button>
          </div>
        </form>
      </div>
    </details>
  );
}
