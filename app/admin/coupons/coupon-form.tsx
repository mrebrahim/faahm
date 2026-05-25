import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type Coupon = {
  id?: string;
  code?: string;
  discount_type?: string;
  discount_value?: number;
  applies_to?: string;
  max_uses?: number | null;
  max_uses_per_user?: number | null;
  expires_at?: string | null;
  is_active?: boolean;
  description?: string | null;
};

export function CouponForm({
  action,
  defaults,
  submitLabel,
}: {
  action: (formData: FormData) => Promise<void>;
  defaults?: Coupon;
  submitLabel: string;
}) {
  const d = defaults || {};
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
          <Label htmlFor="discount_type">نوع الخصم</Label>
          <select
            id="discount_type"
            name="discount_type"
            defaultValue={d.discount_type || 'percent'}
            className="flex h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm"
          >
            <option value="percent">نسبة مئوية</option>
            <option value="fixed">مبلغ ثابت (cents)</option>
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="discount_value">القيمة</Label>
          <Input
            id="discount_value"
            name="discount_value"
            type="number"
            min="1"
            defaultValue={d.discount_value ?? 50}
            dir="ltr"
            required
          />
        </div>
      </div>

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

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="max_uses">حد الاستخدام الكلي</Label>
          <Input
            id="max_uses"
            name="max_uses"
            type="number"
            min="1"
            defaultValue={d.max_uses ?? ''}
            placeholder="بدون حد"
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
          placeholder="إطلاق المنصة — خصم 50% على السنوي"
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
