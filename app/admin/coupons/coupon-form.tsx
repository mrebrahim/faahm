'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type Coupon = {
  id?: string;
  code?: string;
  discount_type?: string;
  discount_value?: number;
  applies_to?: string;
  course_id?: string | null;
  max_uses?: number | null;
  max_uses_per_user?: number | null;
  expires_at?: string | null;
  is_active?: boolean;
  description?: string | null;
};

type CourseOption = {
  id: string;
  title_ar: string;
  slug: string;
};

export function CouponForm({
  action,
  defaults,
  submitLabel,
  courses = [],
}: {
  action: (formData: FormData) => Promise<void>;
  defaults?: Coupon;
  submitLabel: string;
  courses?: CourseOption[];
}) {
  const d = defaults || {};
  const [discountType, setDiscountType] = useState<string>(
    d.discount_type || 'percent'
  );
  const isFreeCourse = discountType === 'free_course';

  return (
    <form
      action={action}
      className="space-y-4 p-5 rounded-2xl border border-gray-200 bg-white"
    >
      {d.id && <input type="hidden" name="id" value={d.id} />}

      <div className="space-y-1">
        <Label htmlFor="code">الكود</Label>
        <Input
          id="code"
          name="code"
          defaultValue={d.code || ''}
          required
          dir="ltr"
          placeholder="LAUNCH50"
          className="font-mono uppercase"
          maxLength={20}
        />
        <p className="text-[11px] text-gray-500">
          4-20 حرف. كابيتال وأرقام و _ و - فقط.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="discount_type">نوع الكوبون</Label>
          <select
            id="discount_type"
            name="discount_type"
            value={discountType}
            onChange={(e) => setDiscountType(e.target.value)}
            className="flex h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm"
          >
            <option value="percent">نسبة خصم (%)</option>
            <option value="fixed">مبلغ خصم ثابت (cents)</option>
            <option value="free_course">دخول مجاني على كورس</option>
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="discount_value">
            {isFreeCourse ? 'قيمة (غير مستخدمة)' : 'القيمة'}
          </Label>
          <Input
            id="discount_value"
            name="discount_value"
            type="number"
            min="1"
            defaultValue={d.discount_value ?? (isFreeCourse ? 100 : 50)}
            dir="ltr"
            required
            disabled={isFreeCourse}
            className={isFreeCourse ? 'opacity-50' : ''}
          />
        </div>
      </div>

      {isFreeCourse && (
        <div className="space-y-1 p-4 rounded-xl border border-emerald-200 bg-emerald-50">
          <Label htmlFor="course_id" className="text-emerald-800 font-bold">
            الكورس اللي هيتفتح مجاناً
          </Label>
          <select
            id="course_id"
            name="course_id"
            defaultValue={d.course_id || ''}
            required
            className="flex h-11 w-full rounded-lg border border-emerald-300 bg-white px-3 text-sm"
          >
            <option value="">— اختار الكورس —</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title_ar}
              </option>
            ))}
          </select>
          <p className="text-[11px] text-emerald-700 mt-1 leading-relaxed">
            الطالب هيدخل الكود ويسجّل بيانات (اسم + إيميل + رقم موبايل) ويتحقّق من الإيميل عبر OTP ثم يفتحله الكورس مجاناً.
            الرابط اللي يشارك بيه الكوبون: <code dir="ltr" className="font-mono bg-white px-1 py-0.5 rounded border border-emerald-200">/redeem</code>
          </p>
        </div>
      )}

      {!isFreeCourse && (
        <div className="space-y-1">
          <Label htmlFor="applies_to">ينطبق على</Label>
          <select
            id="applies_to"
            name="applies_to"
            defaultValue={d.applies_to || 'all'}
            className="flex h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm"
          >
            <option value="all">كل الخطط</option>
            <option value="monthly">شهري فقط</option>
            <option value="yearly">سنوي فقط</option>
          </select>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="max_uses">حد الاستخدام الكلي</Label>
          <Input
            id="max_uses"
            name="max_uses"
            type="number"
            min="1"
            defaultValue={d.max_uses ?? ''}
            placeholder={isFreeCourse ? '1000' : 'بدون حد'}
            dir="ltr"
          />
          <p className="text-[11px] text-gray-500">سيب فاضي = لا محدود.</p>
        </div>
        <div className="space-y-1">
          <Label htmlFor="max_uses_per_user">حد لكل مستخدم</Label>
          <Input
            id="max_uses_per_user"
            name="max_uses_per_user"
            type="number"
            min="1"
            defaultValue={d.max_uses_per_user ?? 1}
            dir="ltr"
          />
        </div>
      </div>

      <div className="space-y-1">
        <Label htmlFor="expires_at">ينتهي في (اختياري)</Label>
        <Input
          id="expires_at"
          name="expires_at"
          type="date"
          defaultValue={d.expires_at ? d.expires_at.slice(0, 10) : ''}
          dir="ltr"
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="description">الوصف (للموظفين فقط)</Label>
        <Input
          id="description"
          name="description"
          defaultValue={d.description || ''}
          placeholder={
            isFreeCourse
              ? 'حملة إطلاق — 1000 كوبون مجاني على كورس الكوبيرايتنج'
              : 'إطلاق المنصة — خصم 50% على السنوي'
          }
          maxLength={200}
        />
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="is_active"
          defaultChecked={d.is_active ?? true}
          className="accent-brand-500"
        />
        مفعّل
      </label>

      <Button type="submit">{submitLabel}</Button>
    </form>
  );
}
