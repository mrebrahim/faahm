import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ROUTES } from '@/lib/constants';
import { ArrowLeft, XCircle } from 'lucide-react';

export const metadata = {
  title: 'تم إلغاء الدفع — فاهم!',
  robots: { index: false, follow: false },
};

export default function BillingCancelPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-16">
      <div className="max-w-md w-full text-center">
        <div className="w-16 h-16 mx-auto mb-5 rounded-full bg-gray-100 flex items-center justify-center">
          <XCircle className="w-8 h-8 text-gray-400" />
        </div>
        <h1 className="font-display text-2xl md:text-3xl font-bold mb-2">
          مفيش مشكلة، اتلغى الدفع
        </h1>
        <p className="text-gray-600 mb-8">
          مش متحاسب على أي حاجة. تقدر تجرّب تاني وقت ما تحب.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild>
            <Link href={ROUTES.pricing}>
              ارجع للأسعار
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={ROUTES.courses}>تصفّح الكورسات</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
