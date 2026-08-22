/**
 * Transactional email via Resend's HTTP API.
 *
 * Plain `fetch` rather than the SDK — one endpoint, no dependency, and
 * nothing to keep in sync at upgrade time.
 *
 * Never throws. A failed notification must not fail the action that
 * triggered it: a student's question is saved whether or not the alert
 * reaches an inbox, and the admin queue is the real source of truth.
 */

const API_KEY = process.env.RESEND_API_KEY;
const FROM = process.env.RESEND_FROM_EMAIL || 'hello@faahm.com';

/** Where student questions land. */
export const SUPPORT_INBOX = 'ibrahim@digitalsolutionegy.com';

export type EmailResult = { sent: boolean; reason?: string };

export async function sendEmail(opts: {
  to: string | string[];
  subject: string;
  html: string;
  replyTo?: string;
}): Promise<EmailResult> {
  if (!API_KEY) {
    console.warn('[email] RESEND_API_KEY not set — skipping', opts.subject);
    return { sent: false, reason: 'not_configured' };
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `فاهم <${FROM}>`,
        to: Array.isArray(opts.to) ? opts.to : [opts.to],
        subject: opts.subject,
        html: opts.html,
        // So hitting Reply in the inbox answers the student directly.
        ...(opts.replyTo ? { reply_to: opts.replyTo } : {}),
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error('[email] send failed', res.status, body.slice(0, 300));
      return { sent: false, reason: `http_${res.status}` };
    }
    return { sent: true };
  } catch (err) {
    console.error('[email] send threw', err instanceof Error ? err.message : err);
    return { sent: false, reason: 'network' };
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Shared RTL shell. Inline styles only — Gmail and Outlook strip
 * <style> blocks, and a stylesheet that half-applies looks worse than
 * none at all.
 */
export function emailLayout(opts: {
  heading: string;
  body: string;
  ctaLabel?: string;
  ctaUrl?: string;
  footer?: string;
}): string {
  return `<!doctype html>
<html dir="rtl" lang="ar">
<body style="margin:0;padding:24px;background:#f9fafb;font-family:-apple-system,'Segoe UI',Tahoma,Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb;">
    <div style="background:#16a34a;padding:20px 24px;">
      <span style="color:#ffffff;font-size:20px;font-weight:800;">فاهم!</span>
    </div>
    <div style="padding:24px;">
      <h1 style="margin:0 0 16px;font-size:20px;color:#111827;">${escapeHtml(opts.heading)}</h1>
      <div style="color:#374151;font-size:15px;line-height:1.9;">${opts.body}</div>
      ${
        opts.ctaUrl && opts.ctaLabel
          ? `<div style="margin-top:24px;">
               <a href="${opts.ctaUrl}" style="display:inline-block;background:#16a34a;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:12px;font-weight:700;">${escapeHtml(
                 opts.ctaLabel
               )}</a>
             </div>`
          : ''
      }
    </div>
    <div style="padding:16px 24px;background:#f9fafb;border-top:1px solid #e5e7eb;color:#6b7280;font-size:12px;">
      ${escapeHtml(opts.footer ?? 'رسالة تلقائية من منصة فاهم.')}
    </div>
  </div>
</body>
</html>`;
}

export { escapeHtml };
