'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Upload, LinkIcon, Loader2 } from 'lucide-react';

/**
 * Two-mode uploader: file (multipart POST → API route → Supabase Storage)
 * OR external link (just records a URL row). Uses fetch directly because
 * Server Actions' default body limit is too small for 50 MB files.
 */
export function AttachmentUploader({
  lessonId,
  courseId,
}: {
  lessonId: string;
  courseId: string;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<'file' | 'link'>('file');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const formData = new FormData(e.currentTarget);
      formData.set('kind', mode);
      const res = await fetch(`/api/admin/lessons/${lessonId}/attachments`, {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `فشل الرفع (${res.status})`);
      }
      // Reset the form and refresh the server component so the new row appears.
      (e.target as HTMLFormElement).reset();
      startTransition(() => {
        router.refresh();
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل الرفع');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 p-4 rounded-xl bg-gray-50 border border-gray-200">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setMode('file')}
          className={`inline-flex items-center gap-1.5 px-3 h-9 rounded-lg text-sm font-medium ${
            mode === 'file'
              ? 'bg-brand-500 text-white'
              : 'bg-white border border-gray-200 text-gray-600'
          }`}
        >
          <Upload className="w-4 h-4" />
          رفع ملف
        </button>
        <button
          type="button"
          onClick={() => setMode('link')}
          className={`inline-flex items-center gap-1.5 px-3 h-9 rounded-lg text-sm font-medium ${
            mode === 'link'
              ? 'bg-brand-500 text-white'
              : 'bg-white border border-gray-200 text-gray-600'
          }`}
        >
          <LinkIcon className="w-4 h-4" />
          رابط خارجي
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <Input
          name="name"
          placeholder="الاسم المعروض للطالب"
          required
          minLength={2}
          maxLength={120}
        />
        {mode === 'file' ? (
          <Input
            name="file"
            type="file"
            required
            accept=".pdf,.zip,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.webp,.txt,.csv,.json,.tar,.gz"
            className="cursor-pointer file:me-3 file:px-3 file:h-8 file:rounded file:border-0 file:bg-brand-500 file:text-white file:text-xs file:cursor-pointer"
          />
        ) : (
          <Input
            name="url"
            type="url"
            placeholder="https://example.com/file.pdf"
            required
            dir="ltr"
            className="text-left"
          />
        )}
      </div>

      {mode === 'file' && (
        <p className="text-xs text-gray-500">
          الحد الأقصى 50MB. الأنواع المسموحة: PDF, ZIP, DOC, XLS, صور.
        </p>
      )}

      {error && (
        <div className="p-2 rounded bg-red-50 border border-red-200 text-red-700 text-xs">
          {error}
        </div>
      )}

      <div>
        <Button type="submit" size="sm" disabled={busy}>
          {busy ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              جاري الرفع...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4" />
              إضافة المرفق
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
