import Script from 'next/script';
import { headers } from 'next/headers';
import { AnalyticsRouteTracker } from './analytics-route-tracker';

/**
 * Server component: reads tracking IDs from process.env at request time
 * and renders the GA4 / Meta Pixel / TikTok Pixel snippets. Doing the
 * env read on the server means the IDs don't need to be inlined at
 * build time — runtime-only env vars (the Coolify default) work fine.
 *
 * Each pixel renders only when its ID is set; an unconfigured platform
 * is a no-op rather than a broken snippet.
 */
export function Analytics() {
  // headers() opts this component into per-request rendering, so the env
  // lookup below picks up the value that's live in the container right
  // now (runtime), not the value that was present when the bundle was
  // built. Without this, a statically-generated parent would freeze the
  // value at build-time = whatever the env var was during `next build`.
  headers();

  const gaId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
  const fbId = process.env.NEXT_PUBLIC_FB_PIXEL_ID;
  const ttId = process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID;

  return (
    <>
      {gaId && (
        <>
          <Script
            id="ga4-loader"
            strategy="afterInteractive"
            src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
          />
          <Script id="ga4-init" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              window.gtag = gtag;
              gtag('js', new Date());
              gtag('config', '${gaId}', { send_page_view: true });
            `}
          </Script>
        </>
      )}

      {fbId && (
        <Script id="fb-pixel-init" strategy="afterInteractive">
          {`
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '${fbId}');
            fbq('track', 'PageView');
          `}
        </Script>
      )}

      {ttId && (
        <Script id="tt-pixel-init" strategy="afterInteractive">
          {`
            !function (w, d, t) {
              w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie","holdConsent","revokeConsent","grantConsent"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var r="https://analytics.tiktok.com/i18n/pixel/events.js",o=n&&n.partner;ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=r,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};n=document.createElement("script");n.type="text/javascript",n.async=!0,n.src=r+"?sdkid="+e+"&lib="+t;e=document.getElementsByTagName("script")[0];e.parentNode.insertBefore(n,e)};
              ttq.load('${ttId}');
              ttq.page();
            }(window, document, 'ttq');
          `}
        </Script>
      )}

      {(gaId || fbId || ttId) && (
        <AnalyticsRouteTracker hasGa={!!gaId} hasFb={!!fbId} hasTt={!!ttId} />
      )}
    </>
  );
}
