import { PAYPAL, type PlanId } from '@/lib/constants';

/**
 * PayPal Hosted Button — a plain form-post into PayPal's webscr
 * endpoint. PayPal hosts the entire checkout (no SDK, no JS), so this
 * stays a server component. No subscription id comes back to us; the
 * post-payment landing handles activation through the same WhatsApp
 * confirmation path as the other offline channels until a proper
 * IPN/webhook handler is wired up.
 */
export function PayPalButton({ plan }: { plan: PlanId }) {
  const buttonId = PAYPAL.hostedButtons[plan];
  return (
    <form
      action="https://www.paypal.com/cgi-bin/webscr"
      method="post"
      target="_top"
      className="flex justify-center"
    >
      <input type="hidden" name="cmd" value="_s-xclick" />
      <input type="hidden" name="hosted_button_id" value={buttonId} />
      <input type="hidden" name="currency_code" value="USD" />
      <input
        type="image"
        src="https://www.paypalobjects.com/en_US/i/btn/btn_subscribe_LG.gif"
        border={0}
        name="submit"
        title="PayPal - The safer, easier way to pay online!"
        alt="Subscribe"
      />
    </form>
  );
}
