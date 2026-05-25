'use client';

import { Printer } from 'lucide-react';

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-brand-500 text-white font-medium text-sm hover:bg-brand-600"
    >
      <Printer className="w-4 h-4" />
      طباعة / Save as PDF
    </button>
  );
}
