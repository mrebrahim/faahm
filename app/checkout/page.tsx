import { redirect } from 'next/navigation';

/**
 * Retired subscription checkout.
 *
 * فاهم no longer sells a monthly or yearly plan — the three courses are
 * bought outright and the bundle packages them. The route stays so the
 * ads, emails and WhatsApp messages that still point here land on the
 * price list instead of a 404.
 */
export default function RetiredCheckoutPage() {
  redirect('/pricing');
}
