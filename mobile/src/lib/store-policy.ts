/**
 * Store compliance mode.
 *
 * ## Why this file exists
 *
 * Apple guideline 3.1.1 requires In-App Purchase for digital content
 * consumed inside the app, and 3.1.3(a) forbids a "reader" app from
 * including buttons, links, or any call to action pointing at an
 * external purchase. Google Play's Payments policy says the same thing
 * for digital goods. فاهم sells course subscriptions — squarely digital
 * content — so a Stripe checkout inside the app would be rejected at
 * review, not merely frowned upon.
 *
 * The chosen path for v1 is a **reader app**: the app plays content the
 * user already bought elsewhere, and says nothing at all about how to
 * buy. Zero commission, zero rejection risk, zero payment code.
 *
 * ## Flipping this later
 *
 * `READER_MODE = false` restores every purchase CTA. Do NOT flip it just
 * to link out to faahm.com/pricing — that's the exact thing 3.1.3(a)
 * blocks. Flip it only once one of these is true:
 *
 *   1. Native IAP is wired up (StoreKit + Play Billing, most likely via
 *      RevenueCat) and the purchase buttons open the STORE sheet, not a
 *      browser. `PURCHASE_TARGET` below becomes 'iap'.
 *   2. Apple granted the External Purchase Link Entitlement for the
 *      storefronts we ship to, in which case the link-out is legal and
 *      `PURCHASE_TARGET` becomes 'external'. Apple requires specific
 *      disclosure sheets in that mode — read the entitlement docs before
 *      shipping it.
 *
 * Rules change often here (the Epic rulings moved them twice). Verify
 * against App Store Connect and Play Console at submission time rather
 * than trusting this comment.
 */
import { Platform } from 'react-native';

/**
 * iOS is a reader app; Android is not.
 *
 * Apple 3.1.3(a) forbids ANY call to action toward an outside purchase,
 * and that is the storefront where a rejection costs the most time. On
 * Android the pricing screen and the WhatsApp CTA are shown.
 *
 * ⚠️ Google Play's Payments policy also restricts steering users to
 * outside payment for digital goods. A sideloaded APK (the AppGallery
 * and direct-download builds) is unaffected, but a Play submission with
 * the WhatsApp CTA visible carries real risk. If Play rejects it, set
 * this to `true` unconditionally and rebuild — nothing else changes.
 */
export const READER_MODE = Platform.OS === 'ios';

/** Where a purchase CTA would send the user, once CTAs are allowed at all. */
export type PurchaseTarget = 'none' | 'iap' | 'external';

export const PURCHASE_TARGET: PurchaseTarget = READER_MODE ? 'none' : 'external';

/** True when the UI may render any button/link that leads to a purchase. */
export const CAN_SHOW_PURCHASE_CTA = !READER_MODE;

/**
 * Outbound links that are safe in reader mode.
 *
 * Support and legal pages are informational, not commercial, so they're
 * fine. Anything under /pricing, /checkout, /billing, or /settings is
 * not — /settings reaches subscription management, which review treats
 * as purchase-adjacent.
 */
export const SAFE_WEB_LINKS = {
  help: '/help',
  privacy: '/privacy',
  terms: '/terms',
} as const;

/**
 * Sales contact. Subscribing happens over WhatsApp with a human rather
 * than a checkout in the app — no card handling, no store commission,
 * and it matches how faahm already closes most sales.
 */
export const SALES_WHATSAPP = '201027555789';
export const SALES_WHATSAPP_DISPLAY = '01027555789';
export const SALES_MESSAGE = 'اريد الاشتراك بالكورسات';

export function salesWhatsappUrl(context?: string): string {
  const text = context ? `${SALES_MESSAGE} — ${context}` : SALES_MESSAGE;
  return `https://wa.me/${SALES_WHATSAPP}?text=${encodeURIComponent(text)}`;
}

/**
 * Copy for locked content.
 *
 * Deliberately states the FACT that access is missing and stops there —
 * no price, no "اشترك من الموقع", no hint about where to buy. That
 * silence is what keeps the build inside 3.1.3(a).
 */
export function lockedMessage(reason: 'needs_yearly' | 'needs_subscription' | null): {
  title: string;
  body: string;
} {
  if (reason === 'needs_yearly') {
    return {
      title: '👑 مش متاح في باقتك',
      body: 'الكورس ده مش داخل في نوع الاشتراك المفعّل على حسابك دلوقتي.',
    };
  }
  return {
    title: '🔒 مش متاح في حسابك',
    body: 'الكورس ده محتاج اشتراك فعّال. لو عندك اشتراك خلاص، اعمل تحديث للصفحة.',
  };
}
