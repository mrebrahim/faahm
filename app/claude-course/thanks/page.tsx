import type { Metadata } from 'next';
import Link from 'next/link';
import { PlayCircle } from 'lucide-react';

export const metadata: Metadata = {
  title: { absolute: 'تمام! شيّك على إيميلك | فاهم' },
  robots: { index: false, follow: false },
};

export default function ClaudeCourseThanks({
  searchParams,
}: {
  searchParams: { n?: string };
}) {
  const name = (searchParams.n ?? '').trim().slice(0, 40);
  return (
    <main className="mx-auto max-w-2xl px-4 py-10 sm:py-16 flex flex-col gap-5 text-center">
      <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold break-words">
        تمام{name ? ` يا ${name}` : ''} 🎉
      </h1>
      <p className="text-base sm:text-lg text-gray-700">
        شيّك على إيميلك دلوقتي (ولو مش لاقيه بص في السبام/Promotions). ومش
        هتستنى — اتفرج على الكورس من هنا:
      </p>
      <a
        href="https://youtu.be/y5G-1ocBij4"
        target="_blank"
        rel="noopener"
        className="inline-flex w-full sm:w-auto self-center items-center justify-center gap-2 rounded-md bg-primary px-6 py-3 font-semibold text-primary-foreground"
      >
        <PlayCircle className="h-5 w-5" />
        اتفرج على كورس Claude
      </a>
      <Link href="/courses" className="text-sm text-gray-600 underline">
        كمّل مع كورسات فاهم
      </Link>
    </main>
  );
}
