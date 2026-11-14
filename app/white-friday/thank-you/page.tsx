import Link from 'next/link';
export const metadata = { title: 'تأكيد طلبك — فاهم', robots: { index: false, follow: false } };
export default function Page({ searchParams }: { searchParams: { method?: string } }) {
  const method = ({paypal:'PayPal', instapay:'InstaPay', vodafone:'Vodafone Cash'} as Record<string,string>)[searchParams.method ?? ''] ?? 'الدفع اليدوي';
  const message = `أريد تأكيد دفع AI Bundle — عرض الجمعة البيضاء عبر ${method}. سأرفق الإيصال وإيميل حسابي: `;
  return <main dir="rtl" className="min-h-screen bg-slate-50 px-4 py-16"><div className="mx-auto max-w-lg rounded-3xl border bg-white p-8 text-center"><h1 className="text-3xl font-bold">شكرًا ليك! خطوة أخيرة لتأكيد الدفع</h1><p className="mt-5 leading-8 text-slate-600">ابعت إيصال الدفع وإيميل حسابك على واتساب. هنراجع العملية ونفعّل كورسات n8n وAI Video وVibe Coding بعد التأكد من الدفع.</p><p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">لم يتم التحقق من الدفع بعد. فتح الصفحة دي مش تأكيد لنجاح العملية.</p><a href={`https://wa.me/201027555789?text=${encodeURIComponent(message)}`} target="_blank" rel="noopener noreferrer" className="mt-6 block rounded-xl bg-green-700 p-4 font-bold text-white">إرسال الإيصال والإيميل للدعم</a><Link href="/white-friday/checkout" className="mt-5 inline-block text-red-700">العودة لطرق الدفع</Link></div></main>;
}
