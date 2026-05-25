'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { completeWelcome } from './actions';

/**
 * Inline client wrapper around the server action — adds a show/hide
 * password toggle and a small client-side strength hint. Validation also
 * happens server-side so disabling JS still produces a safe outcome.
 */
export function SetInitialPasswordForm({
  defaultName,
  email,
}: {
  defaultName: string;
  email: string;
}) {
  const [show, setShow] = useState(false);

  return (
    <form action={completeWelcome} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">البريد الإلكتروني</Label>
        <Input
          id="email"
          name="email_display"
          type="email"
          defaultValue={email}
          disabled
          dir="ltr"
          className="text-left bg-gray-50 text-gray-500"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="full_name">الاسم بالكامل</Label>
        <Input
          id="full_name"
          name="full_name"
          type="text"
          defaultValue={defaultName}
          placeholder="مثال: أحمد محمد"
          autoComplete="name"
          required
          minLength={2}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">كلمة سر جديدة</Label>
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={show ? 'text' : 'password'}
            minLength={8}
            required
            autoComplete="new-password"
            dir="ltr"
            className="text-left pe-10"
            placeholder="على الأقل 8 حروف"
          />
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="absolute end-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
            tabIndex={-1}
            aria-label={show ? 'إخفاء كلمة السر' : 'عرض كلمة السر'}
          >
            {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirm">تأكيد كلمة السر</Label>
        <Input
          id="confirm"
          name="confirm"
          type={show ? 'text' : 'password'}
          minLength={8}
          required
          autoComplete="new-password"
          dir="ltr"
          className="text-left"
        />
      </div>

      <Button type="submit" size="lg" className="w-full">
        احفظ وادخل
        <ArrowLeft className="w-4 h-4" />
      </Button>
    </form>
  );
}
