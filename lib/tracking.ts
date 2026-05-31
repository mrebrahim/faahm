/**
 * Server-side tracking helpers.
 *
 * Sends events to Facebook Conversions API and TikTok Events API so we can
 * deduplicate against the client-side Pixel/TikTok hits (using the same
 * event_id) and survive ad-blockers.
 *
 * Call from server actions for key events: signup, purchase, etc.
 */

import { createHash } from 'crypto';

const FB_PIXEL_ID = process.env.NEXT_PUBLIC_FB_PIXEL_ID;
const FB_CAPI_TOKEN = process.env.FB_CONVERSIONS_API_TOKEN;
const TIKTOK_PIXEL_ID = process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID;
const TIKTOK_EVENTS_TOKEN = process.env.TIKTOK_EVENTS_API_TOKEN;

type UserData = {
  email?: string | null;
  phone?: string | null; // E.164 (e.g. +201234567890)
  externalId?: string | null; // your internal user id
  ipAddress?: string | null;
  userAgent?: string | null;
  fbp?: string | null; // _fbp cookie
  fbc?: string | null; // _fbc cookie
  ttp?: string | null; // _ttp cookie
};

type EventOptions = {
  eventName: string; // e.g. 'Purchase', 'CompleteRegistration', 'Subscribe'
  eventId?: string; // for client/server dedup
  eventTime?: number; // unix seconds
  eventSourceUrl?: string;
  user: UserData;
  custom?: {
    value?: number;
    currency?: string;
    contentName?: string;
    contentIds?: string[];
    [key: string]: unknown;
  };
};

function sha256(v: string | null | undefined): string | undefined {
  if (!v) return undefined;
  return createHash('sha256').update(v.trim().toLowerCase()).digest('hex');
}

export async function trackServerEvent(opts: EventOptions): Promise<void> {
  const time = opts.eventTime ?? Math.floor(Date.now() / 1000);
  const eventId = opts.eventId ?? `${opts.eventName}-${time}-${Math.random().toString(36).slice(2, 10)}`;

  await Promise.allSettled([sendToMeta(opts, time, eventId), sendToTikTok(opts, time, eventId)]);
}

async function sendToMeta(opts: EventOptions, time: number, eventId: string) {
  if (!FB_PIXEL_ID || !FB_CAPI_TOKEN) return;

  const userData: Record<string, unknown> = {
    em: sha256(opts.user.email) ? [sha256(opts.user.email)] : undefined,
    ph: sha256(opts.user.phone) ? [sha256(opts.user.phone)] : undefined,
    external_id: sha256(opts.user.externalId) ? [sha256(opts.user.externalId)] : undefined,
    client_ip_address: opts.user.ipAddress ?? undefined,
    client_user_agent: opts.user.userAgent ?? undefined,
    fbp: opts.user.fbp ?? undefined,
    fbc: opts.user.fbc ?? undefined,
  };

  const body = {
    data: [
      {
        event_name: opts.eventName,
        event_time: time,
        event_id: eventId,
        action_source: 'website',
        event_source_url: opts.eventSourceUrl,
        user_data: userData,
        custom_data: opts.custom,
      },
    ],
  };

  try {
    await fetch(
      `https://graph.facebook.com/v19.0/${FB_PIXEL_ID}/events?access_token=${FB_CAPI_TOKEN}`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      }
    );
  } catch (err) {
    console.error('[tracking] meta capi failed', err);
  }
}

async function sendToTikTok(opts: EventOptions, time: number, eventId: string) {
  if (!TIKTOK_PIXEL_ID || !TIKTOK_EVENTS_TOKEN) return;

  const userData: Record<string, unknown> = {
    email: sha256(opts.user.email),
    phone: sha256(opts.user.phone),
    external_id: sha256(opts.user.externalId),
    ip: opts.user.ipAddress,
    user_agent: opts.user.userAgent,
    ttp: opts.user.ttp,
  };

  const properties: Record<string, unknown> = {};
  if (opts.custom?.value !== undefined) properties.value = opts.custom.value;
  if (opts.custom?.currency) properties.currency = opts.custom.currency;
  if (opts.custom?.contentName) properties.content_name = opts.custom.contentName;
  if (opts.custom?.contentIds?.length) {
    properties.contents = opts.custom.contentIds.map((id) => ({ content_id: id }));
  }

  const body = {
    event_source: 'web',
    event_source_id: TIKTOK_PIXEL_ID,
    data: [
      {
        event: opts.eventName,
        event_time: time,
        event_id: eventId,
        page: { url: opts.eventSourceUrl },
        user: userData,
        properties,
      },
    ],
  };

  try {
    await fetch('https://business-api.tiktok.com/open_api/v1.3/event/track/', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'Access-Token': TIKTOK_EVENTS_TOKEN,
      },
      body: JSON.stringify(body),
    });
  } catch (err) {
    console.error('[tracking] tiktok events failed', err);
  }
}
