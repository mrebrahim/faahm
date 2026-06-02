import { MessageCircle } from 'lucide-react';
import { OFFLINE_PAYMENTS, type PlanId } from '@/lib/constants';

/**
 * 'ارسل صورة الدفع عبر الواتس اب لتاكيد الدفع' button. Builds a wa.me link
 * with a pre-filled Arabic message that includes the user's email and the
 * chosen plan / amount so admins can verify the payment fast.
 */
export function WhatsAppConfirmButton({
  email,
  plan,
  amountUsd,
  channel,
}: {
  email: string;
  plan: PlanId;
  amountUsd: number;
  /** Free-form channel label used in the message body. */
  channel: string;
}) {
  const planLabel = plan === 'yearly' ? 'سنوي' : 'شهري';
  const message = [
    'لقد اشتركت في فاهم وهذه اسكرين شوت من الدفع.',
    `الإيميل: ${email}`,
    `الخطة: ${planLabel} ($${amountUsd})`,
    `طريقة الدفع: ${channel}`,
  ].join('\n');

  const href = `https://wa.me/${OFFLINE_PAYMENTS.confirmationWhatsApp}?text=${encodeURIComponent(message)}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="w-full flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-[#25D366] hover:bg-[#1ebe5b] text-white font-bold text-sm transition-colors"
    >
      <MessageCircle className="w-5 h-5" />
      ارسل صورة الدفع عبر الواتس اب لتأكيد الدفع
    </a>
  );
}
