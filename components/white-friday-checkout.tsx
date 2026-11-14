'use client';
import Link from 'next/link';
import { useState } from 'react';
import { WHITE_FRIDAY_BUNDLE, checkoutHrefFor } from '@/lib/catalog';
import { OFFLINE_PAYMENTS } from '@/lib/constants';

const methods = [
  { id: 'card', title: 'Visa / Mastercard', price: '60 دولار', note: 'دفع آمن بالبطاقة وتفعيل تلقائي بعد نجاح الدفع' },
  { id: 'paypal', title: 'PayPal', price: '60 دولار', note: 'الدفع عبر PayPal ثم إرسال الإيصال للمراجعة' },
  { id: 'instapay', title: 'InstaPay', price: '3,000 ج.م', note: 'تحويل محلي ثم إرسال الإيصال للمراجعة' },
  { id: 'vodafone', title: 'Vodafone Cash', price: '3,000 ج.م', note: 'تحويل محلي ثم إرسال الإيصال للمراجعة' },
];
export function WhiteFridayCheckout() {
  const [selected, setSelected] = useState('card');
  const [step, setStep] = useState(false);
  const method = methods.find(m => m.id === selected)!;
  return <main dir="rtl" className="min-h-screen bg-slate-50 px-4 py-10 text-slate-950"><div className="mx-auto max-w-3xl"><Link href="/white-friday" className="text-red-700">العودة للعرض</Link><div className="mt-6 rounded-3xl border bg-white p-6 sm:p-10"><p className="text-sm text-red-700">AI Bundle · دفعة واحدة</p><h1 className="mt-2 text-3xl font-extrabold">{step ? 'أكمل الدفع' : 'اختار طريقة الدفع المناسبة ليك'}</h1><p className="mt-4 text-slate-600">n8n + AI Video + Vibe Coding · وصول دائم للكورسات</p>
  {!step ? <><fieldset className="mt-8 space-y-3"><legend className="mb-3 font-bold">طرق الدفع</legend>{methods.map(m => <label key={m.id} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 ${selected === m.id ? 'border-red-600 bg-red-50' : 'border-slate-200'}`}><input type="radio" name="payment" value={m.id} checked={selected === m.id} onChange={() => setSelected(m.id)} className="mt-1 accent-red-700" /><span className="flex-1"><span className="flex flex-wrap justify-between gap-2 font-bold"><span>{m.title}</span><span>{m.price}</span></span><span className="mt-1 block text-sm text-slate-600">{m.note}</span></span></label>)}</fieldset>{selected === 'card' ? <a href={checkoutHrefFor(WHITE_FRIDAY_BUNDLE)} className="mt-6 block rounded-xl bg-red-700 p-4 text-center font-bold text-white">متابعة للدفع بالبطاقة — 60 دولار</a> : <button onClick={() => setStep(true)} className="mt-6 w-full rounded-xl bg-red-700 p-4 font-bold text-white">متابعة — {method.title}</button>}</> : <div className="mt-8"><button onClick={() => setStep(false)} className="mb-5 text-sm text-red-700 underline">تغيير طريقة الدفع</button><h2 className="text-xl font-bold">{method.title} — {method.price}</h2>
  {selected === 'paypal' ? <><p className="mt-4 leading-7">افتح PayPal وأكمل الدفع، ثم ارجع هنا واضغط «دفعت بالفعل». راجع المبلغ قبل التأكيد.</p><a href="https://www.paypal.com/ncp/payment/QG5GCZNMLBC3L" target="_blank" rel="noopener noreferrer" className="mt-5 block rounded-xl bg-blue-700 p-4 text-center font-bold text-white">افتح PayPal للدفع</a></> : <><p className="mt-4">حوّل 3,000 ج.م على الرقم:</p><p dir="ltr" className="mt-3 rounded-xl bg-slate-100 p-4 text-center font-mono text-2xl font-bold">01050858819</p>{selected === 'instapay' && <><a href={OFFLINE_PAYMENTS.instapay.link} target="_blank" rel="noopener noreferrer" className="mt-5 block rounded-xl bg-purple-700 p-4 text-center font-bold text-white">افتح InstaPay</a><p className="mt-3 text-center" dir="ltr">{OFFLINE_PAYMENTS.instapay.handle}</p>{/* eslint-disable-next-line @next/next/no-img-element */}<img src={`https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(OFFLINE_PAYMENTS.instapay.link)}`} alt="امسح الكود لفتح رابط الدفع عبر InstaPay" width={240} height={240} className="mx-auto mt-5" /></>}</>}
  <p className="mt-6 text-sm leading-6 text-slate-600">احتفظ بالإيصال. التفعيل يتم بعد إرسال الإيصال وإيميل الحساب ومراجعة الدفع.</p><Link href={`/white-friday/thank-you?method=${selected}`} className="mt-5 block rounded-xl bg-red-700 p-4 text-center font-bold text-white">دفعت بالفعل — متابعة لتأكيد الطلب</Link></div>}
  </div></div></main>;
}
