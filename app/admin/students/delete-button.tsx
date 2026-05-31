'use client';

import { Trash2 } from 'lucide-react';
import { deleteStudent } from './[id]/actions';

export function DeleteStudentButton({ id, email }: { id: string; email: string }) {
  return (
    <form
      action={deleteStudent}
      onSubmit={(e) => {
        if (!confirm(`تأكيد حذف الطالب ${email}؟\nهيتم مسح حسابه نهائياً وكل الـ enrollments والاشتراكات بتاعته. ما فيش رجوع.`)) {
          e.preventDefault();
        }
      }}
      className="inline"
    >
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        title="حذف الطالب نهائياً"
        className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 transition-colors ms-2"
      >
        <Trash2 className="w-3.5 h-3.5" />
        حذف
      </button>
    </form>
  );
}
