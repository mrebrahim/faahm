import { ImageResponse } from 'next/og';
import { createServiceClient } from '@/lib/supabase/server';

export const runtime = 'edge';
// Cache the rendered PNG for an hour — student name + course title don't
// change after issuance, and Cache-Control headers below also tell the CDN.
export const revalidate = 3600;

const SIZE = { width: 1200, height: 630 };

/**
 * OG image for /verify/[code] — 1200×630 PNG used by LinkedIn / Twitter /
 * WhatsApp link previews. Reuses the same green/gold brand palette as the
 * full certificate page but in a card-shaped layout suited to social shares.
 */
export async function GET(
  _req: Request,
  { params }: { params: { code: string } }
) {
  const service = createServiceClient();
  const { data: cert } = await service
    .from('certificates')
    .select('certificate_number, student_name, course_title, score_percent, is_revoked')
    .eq('certificate_number', params.code)
    .maybeSingle();

  // No PII leakage when cert doesn't exist — generic brand card.
  const studentName = cert?.student_name || 'طالب فاهم!';
  const courseTitle = cert?.course_title || 'كورس فاهم!';
  const number = cert?.certificate_number || params.code;
  const isRevoked = cert?.is_revoked === true;

  return new ImageResponse(
    (
      <div
        dir="rtl"
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: '#FAFAF9',
          fontFamily: 'sans-serif',
          padding: '40px',
          position: 'relative',
        }}
      >
        {/* Border frame */}
        <div
          style={{
            position: 'absolute',
            inset: 24,
            border: '10px solid #22C55E',
            borderRadius: 16,
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 44,
            border: '2px solid #D4AF37',
            borderRadius: 12,
          }}
        />

        {/* Logo + brand */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            marginTop: 36,
            marginRight: 36,
          }}
        >
          <div
            style={{
              width: 84,
              height: 84,
              background: '#22C55E',
              color: '#fff',
              fontSize: 56,
              fontWeight: 900,
              borderRadius: 20,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              lineHeight: 1,
            }}
          >
            ف
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: 32, fontWeight: 900, color: '#0a0a0a' }}>
              فاهم!
            </span>
            <span style={{ fontSize: 16, color: '#6b7280' }}>
              منصة الكورسات بالذكاء الاصطناعي
            </span>
          </div>
        </div>

        {/* Main */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            color: '#0a0a0a',
            padding: '0 80px',
          }}
        >
          <div style={{ fontSize: 24, color: '#4b5563', marginBottom: 8 }}>
            شهادة إتمام الكورس
          </div>
          <div
            style={{
              width: 100,
              height: 4,
              background: '#22C55E',
              borderRadius: 2,
              marginBottom: 24,
            }}
          />
          <div style={{ fontSize: 18, color: '#6b7280', marginBottom: 4 }}>
            تشهد منصة فاهم! أنّ
          </div>
          <div
            style={{
              fontSize: 64,
              fontWeight: 900,
              marginBottom: 14,
              letterSpacing: '-1px',
              lineHeight: 1.1,
            }}
          >
            {studentName}
          </div>
          <div style={{ fontSize: 18, color: '#6b7280', marginBottom: 6 }}>
            قد أتمّ بنجاح كورس
          </div>
          <div
            style={{
              fontSize: 30,
              fontWeight: 700,
              fontStyle: 'italic',
              color: '#16A34A',
              maxWidth: 900,
            }}
          >
            «{courseTitle}»
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            margin: '0 60px 36px',
            color: '#6b7280',
            fontSize: 18,
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
              direction: 'ltr',
              fontFamily: 'monospace',
            }}
          >
            <span style={{ color: '#16A34A', fontWeight: 700 }}>{number}</span>
            <span style={{ fontSize: 14 }}>faahm.com/verify/{number}</span>
          </div>
          {typeof cert?.score_percent === 'number' && !isRevoked && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-end',
              }}
            >
              <span style={{ fontSize: 14 }}>التقدير</span>
              <span
                style={{ fontSize: 28, fontWeight: 800, color: '#0a0a0a' }}
                dir="ltr"
              >
                {cert.score_percent}%
              </span>
            </div>
          )}
        </div>

        {isRevoked && (
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%) rotate(-18deg)',
              border: '8px solid #dc2626',
              color: '#dc2626',
              fontSize: 80,
              fontWeight: 900,
              padding: '12px 36px',
              letterSpacing: '6px',
              opacity: 0.65,
            }}
          >
            REVOKED
          </div>
        )}
      </div>
    ),
    {
      ...SIZE,
      headers: {
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      },
    }
  );
}
