import { createServiceClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/admin-guard';
import { auditLog } from '@/lib/admin-audit';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Settings as SettingsIcon,
  CheckCircle2,
  AlertCircle,
  Database,
  CreditCard,
  Video,
  Mail,
  KeyRound,
} from 'lucide-react';
import { updateSiteSettings } from './actions';

export const metadata = { title: 'الإعدادات — إدارة فاهم!' };

const SETTINGS_ID = '00000000-0000-0000-0000-000000000001';

export default async function AdminSettingsPage({
  searchParams,
}: {
  searchParams: { success?: string; error?: string };
}) {
  const ctx = await requireAdmin();
  void auditLog(ctx, { action: 'settings.viewed' });
  const service = createServiceClient();

  const { data: settings } = await service
    .from('site_settings')
    .select('*')
    .eq('id', SETTINGS_ID)
    .maybeSingle();

  // Env-derived read-only system info. Service-role key is intentionally
  // never displayed — only its presence.
  const sys = {
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    supabaseAnonConfigured: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    supabaseServiceConfigured: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    stripeSecretConfigured: Boolean(process.env.STRIPE_SECRET_KEY),
    stripeWebhookConfigured: Boolean(process.env.STRIPE_WEBHOOK_SECRET),
    stripePriceMonthly: process.env.STRIPE_PRICE_ID_MONTHLY || '',
    stripePriceYearly: process.env.STRIPE_PRICE_ID_YEARLY || '',
    paymobConfigured: Boolean(process.env.PAYMOB_API_KEY),
    bunnyLibraryId: process.env.NEXT_PUBLIC_BUNNY_LIBRARY_ID || '668938',
    openaiConfigured: Boolean(process.env.OPENAI_API_KEY),
    resendConfigured: Boolean(process.env.RESEND_API_KEY),
    resendFrom: process.env.RESEND_FROM_EMAIL || '',
    r2Configured: Boolean(
      process.env.R2_ACCOUNT_ID &&
        process.env.R2_ACCESS_KEY_ID &&
        process.env.R2_SECRET_ACCESS_KEY
    ),
    appUrl: process.env.NEXT_PUBLIC_APP_URL || '',
  };

  return (
    <div className="p-6 lg:p-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="font-display text-3xl font-bold flex items-center gap-2">
          <SettingsIcon className="w-7 h-7 text-brand-500" />
          الإعدادات
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          إعدادات المنصة ومعلومات النظام. القيم اللي مش معروضة هنا بتيجي
          من متغيرات البيئة في Vercel.
        </p>
      </div>

      {searchParams.error && (
        <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {decodeURIComponent(searchParams.error)}
        </div>
      )}
      {searchParams.success && (
        <div className="mb-4 p-3 rounded-lg bg-brand-500/10 border border-brand-500/30 text-brand-700 text-sm flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          تم الحفظ.
        </div>
      )}

      <form action={updateSiteSettings} className="space-y-6">
        {/* Branding / contact */}
        <Section title="العلامة التجارية والتواصل">
          <Field label="بريد الدعم" htmlFor="support_email">
            <Input
              id="support_email"
              name="support_email"
              type="email"
              defaultValue={settings?.support_email || ''}
              placeholder="support@faahm.com"
              dir="ltr"
              className="text-left"
            />
          </Field>
          <Field label="رقم واتساب الدعم" htmlFor="support_whatsapp">
            <Input
              id="support_whatsapp"
              name="support_whatsapp"
              defaultValue={settings?.support_whatsapp || ''}
              placeholder="201XXXXXXXXX"
              dir="ltr"
              className="text-left"
            />
            <Hint>الصيغة الدولية بدون + أو رموز. مثلًا: 201012345678</Hint>
          </Field>
          <Field label="ملاحظة الفوتر (اختياري)" htmlFor="footer_note_ar">
            <textarea
              id="footer_note_ar"
              name="footer_note_ar"
              rows={2}
              defaultValue={settings?.footer_note_ar || ''}
              placeholder="رسالة بسيطة تظهر تحت كل صفحة..."
              className="flex w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            />
          </Field>
        </Section>

        {/* Course / quiz defaults */}
        <Section title="افتراضيات الكورسات والكويزات">
          <Field
            label="درجة النجاح الافتراضية للكويز (%)"
            htmlFor="default_quiz_passing_score"
          >
            <Input
              id="default_quiz_passing_score"
              name="default_quiz_passing_score"
              type="number"
              min="0"
              max="100"
              defaultValue={settings?.default_quiz_passing_score ?? 70}
              dir="ltr"
              className="text-left max-w-[160px]"
            />
            <Hint>
              تُستخدم لما الـ admin ينشئ كويز جديد بدون تحديد نسبة. لا تؤثر على
              الكويزات الموجودة.
            </Hint>
          </Field>
          <Field
            label="الحد الأقصى للمحاولات في الكويز"
            htmlFor="default_quiz_max_attempts"
          >
            <Input
              id="default_quiz_max_attempts"
              name="default_quiz_max_attempts"
              type="number"
              min="1"
              max="50"
              defaultValue={settings?.default_quiz_max_attempts ?? 3}
              dir="ltr"
              className="text-left max-w-[160px]"
            />
          </Field>
          <Field
            label="مزوّد الفيديو الافتراضي"
            htmlFor="default_video_provider"
          >
            <select
              id="default_video_provider"
              name="default_video_provider"
              defaultValue={settings?.default_video_provider || 'bunny'}
              className="flex h-11 w-full max-w-[200px] rounded-lg border border-gray-300 bg-white px-3 text-sm"
            >
              <option value="bunny">Bunny Stream</option>
              <option value="vimeo">Vimeo</option>
            </select>
          </Field>
          <Field
            label="درجة النجاح المطلوبة للشهادة (%)"
            htmlFor="certificate_min_score"
          >
            <Input
              id="certificate_min_score"
              name="certificate_min_score"
              type="number"
              min="0"
              max="100"
              defaultValue={settings?.certificate_min_score ?? 70}
              dir="ltr"
              className="text-left max-w-[160px]"
            />
            <Hint>
              معروض هنا للمرجعية فقط. منطق الإصدار التلقائي حاليًا مثبّت على
              ≥70% في دالة <code dir="ltr">check_certificate_eligibility</code>؛
              تغيير القيمة هنا مش هيغيّر منطق الـ trigger.
            </Hint>
          </Field>
        </Section>

        <div className="flex items-center justify-between gap-3 flex-wrap">
          <Button type="submit">حفظ التغييرات</Button>
          {settings?.updated_at && (
            <span className="text-xs text-gray-500">
              آخر تحديث:{' '}
              <span dir="ltr">
                {new Date(settings.updated_at).toLocaleString('ar-EG')}
              </span>
              {settings.updated_by_email && (
                <>
                  {' '}
                  · <span dir="ltr">{settings.updated_by_email}</span>
                </>
              )}
            </span>
          )}
        </div>
      </form>

      {/* System info (read-only) */}
      <div className="mt-10">
        <h2 className="font-bold mb-3 flex items-center gap-2">
          <Database className="w-5 h-5 text-gray-500" />
          معلومات النظام (قراءة فقط)
        </h2>
        <p className="text-xs text-gray-500 mb-4">
          المتغيرات الحساسة بتظهر هنا بالحالة (مُهيّأ / غير مُهيّأ) فقط — قيمها
          الفعلية مش بتترسل للمتصفح. لتعديلها افتح إعدادات Vercel.
        </p>

        <div className="rounded-2xl border border-gray-200 bg-white divide-y divide-gray-100">
          <SysRow icon={Database} label="Supabase URL">
            <Mono>{sys.supabaseUrl || '—'}</Mono>
          </SysRow>
          <SysRow icon={KeyRound} label="Supabase Anon Key">
            <StatusBadge ok={sys.supabaseAnonConfigured} />
          </SysRow>
          <SysRow icon={KeyRound} label="Supabase Service Role">
            <StatusBadge ok={sys.supabaseServiceConfigured} />
          </SysRow>
          <SysRow icon={Database} label="App URL">
            <Mono>{sys.appUrl || '—'}</Mono>
          </SysRow>

          <SysRow icon={CreditCard} label="Stripe Secret Key">
            <StatusBadge ok={sys.stripeSecretConfigured} />
          </SysRow>
          <SysRow icon={CreditCard} label="Stripe Webhook Secret">
            <StatusBadge ok={sys.stripeWebhookConfigured} />
          </SysRow>
          <SysRow icon={CreditCard} label="Stripe Price IDs">
            <div className="text-xs space-y-0.5">
              <div dir="ltr">
                Monthly: <Mono>{sys.stripePriceMonthly || '—'}</Mono>
              </div>
              <div dir="ltr">
                Yearly: <Mono>{sys.stripePriceYearly || '—'}</Mono>
              </div>
            </div>
          </SysRow>
          <SysRow icon={CreditCard} label="Paymob">
            <StatusBadge ok={sys.paymobConfigured} />
          </SysRow>

          <SysRow icon={Video} label="Bunny Library">
            <Mono>{sys.bunnyLibraryId}</Mono>
          </SysRow>
          <SysRow icon={KeyRound} label="OpenAI API Key (Quiz AI)">
            <StatusBadge ok={sys.openaiConfigured} />
          </SysRow>
          <SysRow icon={Mail} label="Resend">
            <div className="text-xs space-y-0.5">
              <StatusBadge ok={sys.resendConfigured} />
              {sys.resendFrom && (
                <div dir="ltr" className="text-gray-500">
                  from: {sys.resendFrom}
                </div>
              )}
            </div>
          </SysRow>
          <SysRow icon={Database} label="Cloudflare R2">
            <StatusBadge ok={sys.r2Configured} />
          </SysRow>
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 space-y-4">
      <h2 className="font-bold">{title}</h2>
      {children}
    </section>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}

function Hint({ children }: { children: React.ReactNode }) {
  return <p className="text-[11px] text-gray-500">{children}</p>;
}

function SysRow({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3 p-4">
      <div className="flex items-center gap-2 text-sm text-gray-700">
        <Icon className="w-4 h-4 text-gray-400" />
        {label}
      </div>
      <div className="text-left">{children}</div>
    </div>
  );
}

function Mono({ children }: { children: React.ReactNode }) {
  return (
    <code
      dir="ltr"
      className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded break-all inline-block"
    >
      {children}
    </code>
  );
}

function StatusBadge({ ok }: { ok: boolean }) {
  return ok ? (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-emerald-50 text-emerald-700">
      <CheckCircle2 className="w-3 h-3" /> مُهيّأ
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-amber-50 text-amber-700">
      <AlertCircle className="w-3 h-3" /> غير مُهيّأ
    </span>
  );
}
