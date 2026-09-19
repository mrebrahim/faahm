import { redirect } from 'next/navigation';

/**
 * Retired subscription funnel.
 *
 * This page sold the monthly/yearly plan. Plans are gone, and the AI
 * Bundle landing at '/' is the funnel now. The route stays so the ads,
 * WhatsApp messages and links still pointing here land on the offer
 * rather than a 404.
 */
export default function RetiredPersonalPlanPage() {
  redirect('/');
}
