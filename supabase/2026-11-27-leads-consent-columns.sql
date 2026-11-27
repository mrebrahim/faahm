-- Claude free course form (faahm.com/claude-course): store name, optional
-- WhatsApp, UTM attribution and an opt-in log (timestamp + exact consent
-- text) next to each lead. Additive + idempotent; existing rows untouched.
alter table public.leads add column if not exists name text;
alter table public.leads add column if not exists whatsapp text;
alter table public.leads add column if not exists page_path text;
alter table public.leads add column if not exists utm jsonb;
alter table public.leads add column if not exists email_consent boolean not null default false;
alter table public.leads add column if not exists whatsapp_consent boolean not null default false;
alter table public.leads add column if not exists consent_text text;
alter table public.leads add column if not exists consented_at timestamptz;
