import { MainNav } from '@/components/main-nav';
import { DubbingForm } from './dubbing-form';
import { Sparkles, Send, PackageCheck, Globe2 } from 'lucide-react';
import { DUBBING_USD_PER_MINUTE } from '@/lib/dubbing';

export const metadata = {
  title: 'خدمة دبلجة الفيديوهات — فاهم',
  description:
    'ارفعلنا لينك فيديوك، اختار من لغة لأي لغة وأي لهجة، ادفع بالدقيقة، واستلم الدبلجة.',
};

export const dynamic = 'force-dynamic';

export default function DubbingPage() {
  return (
    <main className="relative min-h-screen bg-white">
      <MainNav signedIn={false} isAdmin={false} />

      {/* HERO */}
      <section className="relative px-4 pt-10 pb-8 sm:pt-14">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[800px] h-[800px] rounded-full bg-brand-500/5 blur-[120px]"
        />
        <div className="relative container mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 mb-5 rounded-full border border-brand-500/30 bg-brand-500/10">
            <Sparkles className="w-4 h-4 text-brand-500" />
            <span className="text-sm font-medium text-brand-700">
              خدمة دبلجة فيديوهات
            </span>
          </div>
          <h1
            className="font-display font-extrabold leading-[1.1] mb-4 text-balance"
            style={{ fontSize: 'clamp(1.75rem, 6vw, 3.25rem)' }}
          >
            دبلجة فيديوهاتك —{' '}
            <span className="text-gradient-brand">أي لغة، أي لهجة</span>
          </h1>
          <p className="max-w-2xl mx-auto text-sm sm:text-lg text-gray-600 leading-relaxed">
            ارفعلنا لينك فيديوك، اختار من لغة لأي لغة وأي لهجة، ادفع بالدقيقة،
            واستلم الدبلجة في وقتها.{' '}
            <span className="font-bold text-brand-700">
              ${DUBBING_USD_PER_MINUTE} للدقيقة
            </span>
            .
          </p>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="relative px-4 pb-8">
        <div className="container mx-auto max-w-3xl grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Step n={1} icon={Globe2} title="اختار اللغة واللهجة">
            من أي لغة لأي لغة، وباللهجة اللي تحبها.
          </Step>
          <Step n={2} icon={Send} title="ابعت لينك فيديوهاتك">
            درايف، يوتيوب، تيك توك، أو أي مكان — لينك في كل سطر.
          </Step>
          <Step n={3} icon={PackageCheck} title="ادفع واستلم">
            ${DUBBING_USD_PER_MINUTE} × الدقائق. ميعاد التسليم بيظهرلك على طول.
          </Step>
        </div>
      </section>

      {/* FORM */}
      <section className="relative px-4 pb-16">
        <div className="container mx-auto max-w-3xl">
          <DubbingForm />
        </div>
      </section>
    </main>
  );
}

function Step({
  n,
  icon: Icon,
  title,
  children,
}: {
  n: number;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 flex gap-3 items-start">
      <span className="w-8 h-8 rounded-full bg-brand-500 text-white font-bold text-sm inline-flex items-center justify-center flex-shrink-0">
        {n}
      </span>
      <div className="min-w-0">
        <div className="flex items-center gap-1.5 font-bold text-sm mb-0.5">
          <Icon className="w-4 h-4 text-brand-600" />
          {title}
        </div>
        <p className="text-[11px] text-gray-500 leading-relaxed">{children}</p>
      </div>
    </div>
  );
}
