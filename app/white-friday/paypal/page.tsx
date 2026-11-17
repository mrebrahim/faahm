import Link from 'next/link';
import { ArrowLeft, MessageCircle } from 'lucide-react';
import { OFFLINE_PAYMENTS } from '@/lib/constants';

export const metadata = {
  title: 'الدفع بـ PayPal — عرض الجمعة البيضاء | فاهم',
  robots: { index: false, follow: false },
};

const paypalUrl = 'https://www.paypal.com/ncp/payment/QG5GCZNMLBC3L';
const message = 'دفعت عرض الجمعة البيضاء — AI Bundle عن طريق PayPal. ده إيصال الدفع، والإيميل اللي عايز أفعّل عليه الكورسات هو: ';
const whatsappUrl = `https://wa.me/${OFFLINE_PAYMENTS.confirmationWhatsApp}?text=${encodeURIComponent(message)}`;

export default function WhiteFridayPayPalPage() {
  return (
    <main dir="rtl" className="min-h-screen bg-slate-50 px-4 py-12 text-slate-950">
      <div className="mx-auto max-w-lg">
        <Link href="/white-friday" className="text-sm font-bold text-red-700">العودة للعرض</Link>
        <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <p className="text-sm font-bold text-red-700">AI Bundle · الجمعة البيضاء</p>
          <h1 className="mt-3 text-3xl font-extrabold">الدفع عن طريق PayPal</h1>
          <p className="mt-4 leading-7 text-slate-600">سعر العرض 60 دولار للتلات كورسات. راجع المبلغ على صفحة PayPal قبل إتمام الدفع.</p>
          <ol className="mt-6 list-inside list-decimal space-y-3 leading-7 text-slate-700">
            <li>افتح رابط PayPal وأكمل الدفع.</li>
            <li>ابعت إيصال الدفع وإيميل حسابك على واتساب.</li>
            <li>بعد مراجعة الدفع، هنفعّل الكورسات على حسابك يدويًا.</li>
          </ol>
          <a href={paypalUrl} target="_blank" rel="noopener noreferrer" className="mt-7 flex min-h-[54px] items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 font-bold text-white hover:bg-blue-800">افتح صفحة الدفع بـ PayPal <ArrowLeft className="h-5 w-5" /></a>
          <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="mt-3 flex min-h-[54px] items-center justify-center gap-2 rounded-xl bg-green-700 px-5 text-center font-bold text-white hover:bg-green-800"><MessageCircle className="h-5 w-5" /> ابعت الإيصال والإيميل على واتساب</a>
          <p className="mt-4 text-sm leading-6 text-slate-500">الدفع عبر PayPal لا يفعّل الكورسات تلقائيًا؛ يُراجع الإيصال قبل التفعيل.</p>
        </div>
      </div>
    </main>
  );
}
