import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { ROUTES, APP_NAME } from '@/lib/constants';
import { CheckCircle2, ArrowLeft, Sparkles } from 'lucide-react';

export const metadata = {
  title: 'تم الاشتراك — فاهم!',
  robots: { index: false, follow: false },
};

export default async function BillingSuccessPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(ROUTES.login);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-16">
      <div className="max-w-lg w-full text-center">
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-brand-500/15 flex items-center justify-center">
          <CheckCircle2 className="w-10 h-10 text-brand-500" />
        </div>

        <h1 className="font-display text-3xl md:text-4xl font-extrabold mb-3">
          تم اشتراكك بنجاح
        </h1>
        <p className="text-gray-600 text-lg mb-2">
          أهلًا بك في <span className="font-bold text-foreground">{APP_NAME}</span> 🎉
        </p>
        <p className="text-sm text-gray-500 mb-8">
          أي لحظة دلوقتي تقدر تبدأ تتفرّج على كل الكورسات. ممكن ياخد لحظات
          عشان الاشتراك يظهر في حسابك.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center mb-10">
          <Button asChild size="lg">
            <Link href={ROUTES.courses}>
              <Sparkles className="w-4 h-4" />
              تصفّح الكورسات
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href={ROUTES.dashboard}>روح للوحتي</Link>
          </Button>
        </div>

        <p className="text-xs text-gray-400">
          إيصال الدفع جاي على إيميلك. لو فيه أي مشكلة كلّمنا.
        </p>
      </div>
    </div>
  );
}
