import type Stripe from 'stripe';
import { createServiceClient } from '@/lib/supabase/server';
import { CANONICAL_URL } from '@/lib/constants';
import { emailLayout, escapeHtml, sendEmail } from '@/lib/email';
import { productById, type PurchasableProduct } from '@/lib/catalog';

/**
 * Fulfilment for one-off course purchases.
 *
 * A purchase is nothing more than a permanent `enrollments` row —
 * `canAccessCourse` already treats an enrollment as a key to a single
 * course, so buying and being hand-granted by an admin land in exactly
 * the same place. No new access path, no second thing to keep in sync.
 *
 * Everything here is idempotent. Stripe retries a webhook until it gets
 * a 2xx, so this WILL be called twice for the same payment; running it
 * twice must not double-charge the ledger or duplicate the receipt.
 */

export type GrantResult = {
  granted: string[];
  /** Slugs we could not resolve to a course row. */
  missing: string[];
  /** False when the payment was already recorded — a webhook replay. */
  firstTime: boolean;
};

/**
 * Unlock a product's courses for a user, permanently, and write the
 * matching payments row.
 *
 * `gatewayOrderId` is the idempotency key. Pass the Stripe Checkout
 * Session id (or the InstaPay reference for a manual grant); a second
 * call with the same id records nothing new but still re-asserts the
 * enrollments, so a partially-applied first attempt heals itself.
 */
export async function grantCoursePurchase(args: {
  userId: string;
  product: PurchasableProduct;
  gateway: 'stripe' | 'paypal' | 'manual';
  gatewayOrderId: string | null;
  gatewayPaymentId?: string | null;
  amountCents: number;
  currency?: string;
  notes?: string | null;
}): Promise<GrantResult> {
  const service = createServiceClient();

  const { data: courses } = await service
    .from('courses')
    .select('id, slug, title_ar')
    .in('slug', args.product.slugs);

  const found = courses ?? [];
  const missing = args.product.slugs.filter(
    (s) => !found.some((c) => c.slug === s)
  );
  if (missing.length) {
    // Loud, because it means someone paid for a course whose slug moved.
    console.error(
      `[purchase] slugs not found for product=${args.product.id}:`,
      missing.join(', ')
    );
  }

  for (const course of found) {
    await upsertPermanentEnrollment(service, {
      userId: args.userId,
      courseId: course.id,
      notes: args.notes ?? `شراء ${args.product.titleAr}`,
    });
  }

  // Ledger. Guarded so a webhook replay doesn't inflate revenue.
  let firstTime = true;
  if (args.gatewayOrderId) {
    const { data: dupe } = await service
      .from('payments')
      .select('id')
      .eq('gateway', args.gateway)
      .eq('gateway_order_id', args.gatewayOrderId)
      .maybeSingle();
    firstTime = !dupe;
  }

  if (firstTime) {
    const { error } = await service.from('payments').insert({
      user_id: args.userId,
      amount_cents: args.amountCents,
      currency: (args.currency ?? 'USD').toUpperCase(),
      gateway: args.gateway,
      gateway_order_id: args.gatewayOrderId,
      gateway_payment_id: args.gatewayPaymentId ?? null,
      status: 'paid',
      metadata: {
        kind: 'course_purchase',
        product: args.product.id,
        slugs: args.product.slugs,
        notes: args.notes ?? null,
      } as any,
    });
    if (error) {
      console.error('[purchase] payments insert failed', error.message);
    }
  }

  return {
    granted: found.map((c) => c.slug),
    missing,
    firstTime,
  };
}

/**
 * Write the access grant.
 *
 * `source` is written as 'purchase' where the column allows it. Older
 * deploys constrain that column to the values the admin tools use, and
 * a rejected insert here would mean a paying customer gets nothing — so
 * a constraint violation retries as 'manual' with the real story kept
 * in `notes`. Access is what matters; the label is bookkeeping.
 */
async function upsertPermanentEnrollment(
  service: ReturnType<typeof createServiceClient>,
  args: { userId: string; courseId: string; notes: string }
) {
  const row = {
    user_id: args.userId,
    course_id: args.courseId,
    // null = never expires. A purchase is forever; only subscriptions lapse.
    expires_at: null as string | null,
    granted_by: null,
    notes: args.notes,
  };

  const { error } = await service
    .from('enrollments')
    .upsert({ ...row, source: 'purchase' }, { onConflict: 'user_id,course_id' });

  if (!error) return;

  console.warn(
    `[purchase] source='purchase' rejected (${error.message}) — retrying as 'manual'`
  );
  const { error: retryError } = await service
    .from('enrollments')
    .upsert(
      { ...row, source: 'manual', notes: `${args.notes} (شراء)` },
      { onConflict: 'user_id,course_id' }
    );

  if (retryError) {
    // Nothing left to try. Surfacing it is the only way the merchant
    // finds out before the customer emails them.
    console.error('[purchase] enrollment grant FAILED', {
      userId: args.userId,
      courseId: args.courseId,
      error: retryError.message,
    });
  }
}

/**
 * Turn a paid Stripe Checkout Session into access.
 *
 * Called from BOTH the webhook and /purchase/success. The webhook is
 * the reliable path; the success page is the fast one, and it means a
 * misconfigured webhook secret degrades to "access on redirect" rather
 * than "customer paid and got nothing". Running both is safe: the
 * enrollment upsert converges and the payments row is deduped on the
 * session id.
 *
 * Returns null when the session isn't a paid course purchase.
 */
export async function fulfilCoursePurchaseSession(
  session: Stripe.Checkout.Session
): Promise<(GrantResult & { userId: string; product: PurchasableProduct }) | null> {
  if ((session.metadata?.service as string | undefined) !== 'course') return null;

  // Never grant on an unpaid session. `payment_status` is the field that
  // survives a session the buyer abandoned at the card form.
  if (session.payment_status !== 'paid') {
    console.warn(
      `[purchase] session=${session.id} not paid (${session.payment_status}) — skipping`
    );
    return null;
  }

  const product = productById(session.metadata?.product as string | undefined);
  if (!product) {
    console.error(
      `[purchase] unknown product on session=${session.id}:`,
      session.metadata?.product
    );
    return null;
  }

  const email =
    session.customer_email ??
    session.customer_details?.email ??
    null;

  // A signed-in buyer carries their id on the session. A guest is
  // provisioned from the email Stripe collected, exactly as the
  // subscription funnel does — they set a password on the success page.
  let userId = (session.metadata?.supabase_user_id as string | undefined) ?? null;
  if (!userId && email) {
    const { ensureUserForEmail } = await import('@/lib/billing');
    const created = await ensureUserForEmail(email);
    userId = created?.userId ?? null;
  }

  if (!userId) {
    console.error(
      `[purchase] cannot resolve a user for session=${session.id} (email=${email ?? 'none'})`
    );
    return null;
  }

  const result = await grantCoursePurchase({
    userId,
    product,
    gateway: 'stripe',
    gatewayOrderId: session.id,
    gatewayPaymentId:
      typeof session.payment_intent === 'string'
        ? session.payment_intent
        : session.payment_intent?.id ?? null,
    amountCents: session.amount_total ?? product.priceUsd * 100,
    currency: session.currency ?? 'usd',
  });

  // Only on the first pass — a webhook replay must not re-send the receipt.
  if (result.firstTime && email) {
    const { data: profile } = await createServiceClient()
      .from('profiles')
      .select('full_name')
      .eq('id', userId)
      .maybeSingle();

    await sendPurchaseReceipt({
      email,
      fullName: profile?.full_name ?? null,
      product,
      amountCents: session.amount_total ?? product.priceUsd * 100,
      currency: session.currency ?? 'usd',
    });
  }

  console.log(
    `[purchase] session=${session.id} product=${product.id} user=${userId} ` +
      `granted=${result.granted.join(',') || 'none'} firstTime=${result.firstTime}`
  );

  return { ...result, userId, product };
}

/** Receipt + "start here" link. Best-effort — never blocks fulfilment. */
export async function sendPurchaseReceipt(args: {
  email: string;
  fullName?: string | null;
  product: PurchasableProduct;
  amountCents: number;
  currency?: string;
}) {
  const isBundle = args.product.slugs.length > 1;
  const amount = (args.amountCents / 100).toFixed(0);
  const currency = (args.currency ?? 'USD').toUpperCase() === 'USD' ? '$' : '';

  await sendEmail({
    to: args.email,
    subject: `تم تفعيل ${args.product.titleAr} ✅`,
    html: emailLayout({
      heading: `مبروك ${args.fullName?.split(' ')[0] ?? ''} 🎉`,
      body: `
        <p style="margin:0 0 12px;">تم تفعيل <strong>${escapeHtml(
          args.product.titleAr
        )}</strong> على حسابك — الوصول دايم، من غير تجديد ولا اشتراك.</p>
        <p style="margin:0 0 16px;color:#6b7280;font-size:13px;">
          المبلغ المدفوع: <strong dir="ltr">${currency}${amount}</strong>
        </p>
        ${
          isBundle
            ? `<div style="padding:16px;background:#f0fdf4;border-radius:12px;border-right:4px solid #16a34a;">
                 <p style="margin:0 0 8px;font-weight:bold;">الكورسات اللي اتفتحت:</p>
                 <ul style="margin:0;padding-right:18px;color:#374151;">
                   <li>أتمتة n8n</li>
                   <li>AI Video Master</li>
                   <li>Vibe Coding</li>
                 </ul>
               </div>`
            : ''
        }`,
      ctaLabel: 'ابدأ التعلم دلوقتي',
      ctaUrl: `${CANONICAL_URL}/dashboard`,
      footer: 'ضمان استرداد ٧ أيام — لو مش راضي كلّمنا وهنرجّعلك المبلغ.',
    }),
  });
}
