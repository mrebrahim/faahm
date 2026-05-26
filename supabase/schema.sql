-- ============================================================================
-- فاهم! - منصة تعليمية بالاشتراك
-- Database Schema for Supabase (PostgreSQL)
-- Version: 1.0.0
-- ============================================================================
-- ترتيب التنفيذ: شغّل الملف ده كله مرة واحدة في Supabase SQL Editor
-- ============================================================================

-- ============================================================================
-- 1. EXTENSIONS
-- ============================================================================
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";


-- ============================================================================
-- 2. ENUMS (الأنواع المخصصة)
-- ============================================================================
create type user_role as enum ('student', 'instructor', 'admin');
create type subscription_plan as enum ('monthly', 'yearly');
create type subscription_status as enum ('active', 'cancelled', 'expired', 'paused', 'trialing');
create type payment_gateway as enum ('stripe', 'paymob', 'manual');
create type payment_status as enum ('pending', 'paid', 'failed', 'refunded');
create type course_level as enum ('beginner', 'intermediate', 'advanced');
create type quiz_question_type as enum ('single_choice', 'multiple_choice', 'true_false');


-- ============================================================================
-- 3. PROFILES (بيانات المستخدمين الإضافية)
-- ============================================================================
-- Supabase Auth بيدير auth.users، إحنا بنضيف معلومات إضافية هنا
create table public.profiles (
    id              uuid primary key references auth.users(id) on delete cascade,
    full_name       text,
    avatar_url      text,
    phone           text,
    country         text,
    role            user_role not null default 'student',
    is_blocked      boolean not null default false,
    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now(),
    marketing_opt_in boolean not null default false
);

create index idx_profiles_role on public.profiles(role);


-- ============================================================================
-- 4. CATEGORIES (تصنيفات الكورسات)
-- ============================================================================
create table public.categories (
    id              uuid primary key default uuid_generate_v4(),
    slug            text unique not null,
    name_ar         text not null,
    name_en         text,
    icon            text,                       -- اسم أيقونة من lucide-react
    sort_order      int not null default 0,
    is_active       boolean not null default true,
    created_at      timestamptz not null default now()
);


-- ============================================================================
-- 5. INSTRUCTORS (المدرّبين)
-- ============================================================================
create table public.instructors (
    id              uuid primary key default uuid_generate_v4(),
    user_id         uuid references auth.users(id) on delete set null,
    slug            text unique not null,
    full_name_ar    text not null,
    full_name_en    text,
    bio_ar          text,
    avatar_url      text,
    title_ar        text,                       -- مثلاً: "خبير تسويق"
    is_active       boolean not null default true,
    created_at      timestamptz not null default now()
);


-- ============================================================================
-- 6. COURSES (الكورسات)
-- ============================================================================
create table public.courses (
    id                  uuid primary key default uuid_generate_v4(),
    slug                text unique not null,
    title_ar            text not null,
    title_en            text,
    description_ar      text,
    short_description_ar text,
    thumbnail_url       text,
    trailer_vimeo_id    text,                   -- فيديو ترويجي اختياري
    category_id         uuid references public.categories(id) on delete set null,
    instructor_id       uuid references public.instructors(id) on delete set null,
    level               course_level not null default 'beginner',
    language            text not null default 'ar',
    total_lessons       int not null default 0, -- يتحدّث تلقائيًا
    total_duration_sec  int not null default 0, -- يتحدّث تلقائيًا
    sort_order          int not null default 0,
    is_published        boolean not null default false,
    published_at        timestamptz,
    created_at          timestamptz not null default now(),
    updated_at          timestamptz not null default now()
);

create index idx_courses_published on public.courses(is_published, sort_order);
create index idx_courses_category on public.courses(category_id);
create index idx_courses_slug on public.courses(slug);


-- ============================================================================
-- 7. CHAPTERS (أقسام داخل الكورس)
-- ============================================================================
create table public.chapters (
    id              uuid primary key default uuid_generate_v4(),
    course_id       uuid not null references public.courses(id) on delete cascade,
    title_ar        text not null,
    sort_order      int not null default 0,
    created_at      timestamptz not null default now()
);

create index idx_chapters_course on public.chapters(course_id, sort_order);


-- ============================================================================
-- 8. LESSONS (الدروس)
-- ============================================================================
create table public.lessons (
    id                  uuid primary key default uuid_generate_v4(),
    chapter_id          uuid not null references public.chapters(id) on delete cascade,
    course_id           uuid not null references public.courses(id) on delete cascade,
    title_ar            text not null,
    description_ar      text,
    vimeo_video_id      text not null,         -- مثلاً "912345678"
    duration_sec        int not null default 0,
    sort_order          int not null default 0,
    is_free_preview     boolean not null default false,  -- متاح من غير اشتراك
    created_at          timestamptz not null default now()
);

create index idx_lessons_chapter on public.lessons(chapter_id, sort_order);
create index idx_lessons_course on public.lessons(course_id, sort_order);


-- ============================================================================
-- 9. LESSON ATTACHMENTS (ملفات مرفقة بالدروس)
-- ============================================================================
create table public.lesson_attachments (
    id              uuid primary key default uuid_generate_v4(),
    lesson_id       uuid not null references public.lessons(id) on delete cascade,
    file_name_ar    text not null,
    file_url        text not null,             -- على Cloudflare R2
    file_size_kb    int,
    file_type       text,                      -- pdf, docx, zip, etc
    created_at      timestamptz not null default now()
);

create index idx_attachments_lesson on public.lesson_attachments(lesson_id);


-- ============================================================================
-- 10. SUBSCRIPTIONS (اشتراكات الطلاب)
-- ============================================================================
create table public.subscriptions (
    id                          uuid primary key default uuid_generate_v4(),
    user_id                     uuid not null references auth.users(id) on delete cascade,
    plan                        subscription_plan not null,
    status                      subscription_status not null default 'active',
    current_period_start        timestamptz not null default now(),
    current_period_end          timestamptz not null,
    cancelled_at                timestamptz,
    -- Gateway References
    gateway                     payment_gateway,
    stripe_subscription_id      text unique,
    stripe_customer_id          text,
    paymob_subscription_id      text unique,
    created_at                  timestamptz not null default now(),
    updated_at                  timestamptz not null default now()
);

create index idx_subscriptions_user on public.subscriptions(user_id, status);
create index idx_subscriptions_period on public.subscriptions(current_period_end);


-- ============================================================================
-- 11. PAYMENTS (سجل المدفوعات)
-- ============================================================================
create table public.payments (
    id                  uuid primary key default uuid_generate_v4(),
    user_id             uuid not null references auth.users(id) on delete cascade,
    subscription_id     uuid references public.subscriptions(id) on delete set null,
    amount_cents        int not null,           -- بالـ cents/قروش لتجنب float
    currency            text not null default 'USD',
    gateway             payment_gateway not null,
    gateway_order_id    text,                   -- order/intent id من البوابة
    gateway_payment_id  text,
    status              payment_status not null default 'pending',
    metadata            jsonb,                  -- بيانات إضافية من البوابة
    created_at          timestamptz not null default now()
);

create index idx_payments_user on public.payments(user_id, created_at desc);
create index idx_payments_gateway_order on public.payments(gateway, gateway_order_id);


-- ============================================================================
-- 12. PROGRESS (تقدّم الطلاب في الدروس)
-- ============================================================================
create table public.progress (
    id              uuid primary key default uuid_generate_v4(),
    user_id         uuid not null references auth.users(id) on delete cascade,
    lesson_id       uuid not null references public.lessons(id) on delete cascade,
    course_id       uuid not null references public.courses(id) on delete cascade,
    watched_sec     int not null default 0,
    is_completed    boolean not null default false,
    completed_at    timestamptz,
    last_watched_at timestamptz not null default now(),
    unique(user_id, lesson_id)
);

create index idx_progress_user_course on public.progress(user_id, course_id);
create index idx_progress_completed on public.progress(user_id, is_completed);


-- ============================================================================
-- 13. QUIZZES (المسابقات بين الدروس)
-- ============================================================================
create table public.quizzes (
    id                  uuid primary key default uuid_generate_v4(),
    lesson_id           uuid references public.lessons(id) on delete cascade,
    course_id           uuid references public.courses(id) on delete cascade,
    title_ar            text not null,
    description_ar      text,
    passing_score       int not null default 70,        -- النسبة المئوية للنجاح
    time_limit_minutes  int,                            -- اختياري
    max_attempts        int not null default 3,
    is_required         boolean not null default false, -- شرط لإكمال الدرس
    created_at          timestamptz not null default now(),
    check (lesson_id is not null or course_id is not null)
);

create index idx_quizzes_lesson on public.quizzes(lesson_id);
create index idx_quizzes_course on public.quizzes(course_id);


-- ============================================================================
-- 14. QUIZ QUESTIONS
-- ============================================================================
create table public.quiz_questions (
    id              uuid primary key default uuid_generate_v4(),
    quiz_id         uuid not null references public.quizzes(id) on delete cascade,
    question_ar     text not null,
    type            quiz_question_type not null default 'single_choice',
    explanation_ar  text,                       -- شرح الإجابة الصحيحة
    sort_order      int not null default 0,
    created_at      timestamptz not null default now()
);

create index idx_questions_quiz on public.quiz_questions(quiz_id, sort_order);


-- ============================================================================
-- 15. QUIZ OPTIONS (خيارات الأسئلة)
-- ============================================================================
create table public.quiz_options (
    id              uuid primary key default uuid_generate_v4(),
    question_id     uuid not null references public.quiz_questions(id) on delete cascade,
    option_ar       text not null,
    is_correct      boolean not null default false,
    sort_order      int not null default 0
);

create index idx_options_question on public.quiz_options(question_id, sort_order);


-- ============================================================================
-- 16. QUIZ ATTEMPTS (محاولات الطلاب)
-- ============================================================================
create table public.quiz_attempts (
    id              uuid primary key default uuid_generate_v4(),
    user_id         uuid not null references auth.users(id) on delete cascade,
    quiz_id         uuid not null references public.quizzes(id) on delete cascade,
    score           int,                        -- النسبة المئوية
    is_passed       boolean,
    started_at      timestamptz not null default now(),
    submitted_at    timestamptz,
    answers         jsonb                       -- {question_id: [option_ids]}
);

create index idx_attempts_user_quiz on public.quiz_attempts(user_id, quiz_id);


-- ============================================================================
-- 17. CERTIFICATES (الشهادات التلقائية)
-- ============================================================================
create table public.certificates (
    id                  uuid primary key default uuid_generate_v4(),
    user_id             uuid not null references auth.users(id) on delete cascade,
    course_id           uuid not null references public.courses(id) on delete cascade,
    certificate_number  text unique not null,   -- مثلاً FH-2026-00001
    issued_at           timestamptz not null default now(),
    pdf_url             text,                   -- على Cloudflare R2
    student_name        text not null,          -- نخزّن الاسم وقت الإصدار
    course_title        text not null,
    unique(user_id, course_id)
);

create index idx_certificates_user on public.certificates(user_id);
create index idx_certificates_number on public.certificates(certificate_number);


-- ============================================================================
-- 18. COUPONS (كوبونات الخصم - للمستقبل)
-- ============================================================================
create table public.coupons (
    id                  uuid primary key default uuid_generate_v4(),
    code                text unique not null,
    discount_type       text not null check (discount_type in ('percent', 'fixed')),
    discount_value      int not null,
    applies_to          subscription_plan,      -- null = يعمل على الكل
    max_uses            int,
    used_count          int not null default 0,
    expires_at          timestamptz,
    is_active           boolean not null default true,
    created_at          timestamptz not null default now()
);


-- ============================================================================
-- 19. TRIGGERS (تحديثات تلقائية)
-- ============================================================================

-- تحديث updated_at تلقائيًا
create or replace function update_updated_at_column()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

create trigger trg_profiles_updated_at
    before update on public.profiles
    for each row execute function update_updated_at_column();

create trigger trg_courses_updated_at
    before update on public.courses
    for each row execute function update_updated_at_column();

create trigger trg_subscriptions_updated_at
    before update on public.subscriptions
    for each row execute function update_updated_at_column();


-- إنشاء profile تلقائيًا لما يسجل مستخدم جديد
create or replace function public.handle_new_user()
returns trigger as $$
begin
    insert into public.profiles (
        id,
        full_name,
        avatar_url,
        marketing_opt_in,
        phone,
        country
    )
    values (
        new.id,
        coalesce(new.raw_user_meta_data->>'full_name', new.email),
        new.raw_user_meta_data->>'avatar_url',
        coalesce((new.raw_user_meta_data->>'marketing_opt_in')::boolean, false),
        nullif(new.raw_user_meta_data->>'phone', ''),
        nullif(new.raw_user_meta_data->>'country', '')
    );
    return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.handle_new_user();


-- تحديث عدد الدروس ومجموع المدة عند إضافة/حذف درس
create or replace function update_course_stats()
returns trigger as $$
declare
    target_course_id uuid;
begin
    target_course_id := coalesce(new.course_id, old.course_id);
    
    update public.courses
    set 
        total_lessons = (select count(*) from public.lessons where course_id = target_course_id),
        total_duration_sec = (select coalesce(sum(duration_sec), 0) from public.lessons where course_id = target_course_id)
    where id = target_course_id;
    
    return coalesce(new, old);
end;
$$ language plpgsql;

create trigger trg_lessons_update_course_stats
    after insert or update or delete on public.lessons
    for each row execute function update_course_stats();


-- ============================================================================
-- 20. ROW LEVEL SECURITY (RLS) - الأمان على مستوى الصف
-- ============================================================================
-- الـ RLS بيحدد مين يقدر يقرا/يكتب إيه

-- Helper function: check if user has active subscription
create or replace function public.user_has_active_subscription(uid uuid)
returns boolean as $$
    select exists (
        select 1 from public.subscriptions
        where user_id = uid
        and status = 'active'
        and current_period_end > now()
    );
$$ language sql stable security definer;

-- Helper function: check if user is admin
create or replace function public.is_admin(uid uuid)
returns boolean as $$
    select exists (
        select 1 from public.profiles
        where id = uid and role = 'admin'
    );
$$ language sql stable security definer;


-- تفعيل RLS على كل الجداول
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.instructors enable row level security;
alter table public.courses enable row level security;
alter table public.chapters enable row level security;
alter table public.lessons enable row level security;
alter table public.lesson_attachments enable row level security;
alter table public.subscriptions enable row level security;
alter table public.payments enable row level security;
alter table public.progress enable row level security;
alter table public.quizzes enable row level security;
alter table public.quiz_questions enable row level security;
alter table public.quiz_options enable row level security;
alter table public.quiz_attempts enable row level security;
alter table public.certificates enable row level security;
alter table public.coupons enable row level security;


-- ============================================================================
-- POLICIES: PROFILES
-- ============================================================================
create policy "Users can view own profile"
    on public.profiles for select
    using (auth.uid() = id);

create policy "Users can update own profile"
    on public.profiles for update
    using (auth.uid() = id);

create policy "Admins can view all profiles"
    on public.profiles for select
    using (public.is_admin(auth.uid()));


-- ============================================================================
-- POLICIES: CATEGORIES & INSTRUCTORS (للقراءة العامة)
-- ============================================================================
create policy "Anyone can view active categories"
    on public.categories for select
    using (is_active = true);

create policy "Anyone can view active instructors"
    on public.instructors for select
    using (is_active = true);

create policy "Admins can manage categories"
    on public.categories for all
    using (public.is_admin(auth.uid()));

create policy "Admins can manage instructors"
    on public.instructors for all
    using (public.is_admin(auth.uid()));


-- ============================================================================
-- POLICIES: COURSES (متاح للكل لشاف، لكن المحتوى محمي)
-- ============================================================================
create policy "Anyone can view published courses"
    on public.courses for select
    using (is_published = true);

create policy "Admins can manage all courses"
    on public.courses for all
    using (public.is_admin(auth.uid()));


-- ============================================================================
-- POLICIES: CHAPTERS & LESSONS (محتوى محمي بالاشتراك)
-- ============================================================================
create policy "Anyone can view chapters of published courses"
    on public.chapters for select
    using (exists (
        select 1 from public.courses 
        where id = chapters.course_id and is_published = true
    ));

create policy "Subscribers and free previews can view lessons"
    on public.lessons for select
    using (
        is_free_preview = true 
        or public.user_has_active_subscription(auth.uid())
        or public.is_admin(auth.uid())
    );

create policy "Admins can manage chapters"
    on public.chapters for all
    using (public.is_admin(auth.uid()));

create policy "Admins can manage lessons"
    on public.lessons for all
    using (public.is_admin(auth.uid()));


-- ============================================================================
-- POLICIES: ATTACHMENTS (للمشتركين فقط)
-- ============================================================================
create policy "Subscribers can view attachments"
    on public.lesson_attachments for select
    using (
        public.user_has_active_subscription(auth.uid())
        or public.is_admin(auth.uid())
    );

create policy "Admins can manage attachments"
    on public.lesson_attachments for all
    using (public.is_admin(auth.uid()));


-- ============================================================================
-- POLICIES: SUBSCRIPTIONS & PAYMENTS (الطالب يشوف بتاعه فقط)
-- ============================================================================
create policy "Users can view own subscriptions"
    on public.subscriptions for select
    using (auth.uid() = user_id);

create policy "Users can view own payments"
    on public.payments for select
    using (auth.uid() = user_id);

create policy "Admins can view all subscriptions"
    on public.subscriptions for select
    using (public.is_admin(auth.uid()));

create policy "Admins can view all payments"
    on public.payments for select
    using (public.is_admin(auth.uid()));

-- ⚠️ ملحوظة: الـ INSERT/UPDATE على subscriptions و payments
-- بيحصل بس من خلال الـ server-side via Service Role Key
-- مفيش policy للـ insert من المستخدم العادي


-- ============================================================================
-- POLICIES: PROGRESS (الطالب يقرا ويكتب بتاعه فقط)
-- ============================================================================
create policy "Users can view own progress"
    on public.progress for select
    using (auth.uid() = user_id);

create policy "Users can manage own progress"
    on public.progress for all
    using (
        auth.uid() = user_id 
        and (
            public.user_has_active_subscription(auth.uid())
            or exists (select 1 from public.lessons where id = progress.lesson_id and is_free_preview = true)
        )
    );


-- ============================================================================
-- POLICIES: QUIZZES & QUESTIONS (للمشتركين فقط)
-- ============================================================================
create policy "Subscribers can view quizzes"
    on public.quizzes for select
    using (
        public.user_has_active_subscription(auth.uid())
        or public.is_admin(auth.uid())
    );

create policy "Subscribers can view questions"
    on public.quiz_questions for select
    using (
        public.user_has_active_subscription(auth.uid())
        or public.is_admin(auth.uid())
    );

-- ⚠️ ملحوظة: الـ options فيها is_correct! متعرّضش الإجابات الصح للمستخدم
-- بنعرضها فقط بدون عمود is_correct من خلال view خاصة
create policy "Subscribers can view options (without correct answer)"
    on public.quiz_options for select
    using (
        public.user_has_active_subscription(auth.uid())
        or public.is_admin(auth.uid())
    );

create policy "Users can view own attempts"
    on public.quiz_attempts for select
    using (auth.uid() = user_id);

create policy "Users can create own attempts"
    on public.quiz_attempts for insert
    with check (
        auth.uid() = user_id 
        and public.user_has_active_subscription(auth.uid())
    );

create policy "Admins can manage all quiz data"
    on public.quizzes for all
    using (public.is_admin(auth.uid()));

create policy "Admins can manage all questions"
    on public.quiz_questions for all
    using (public.is_admin(auth.uid()));

create policy "Admins can manage all options"
    on public.quiz_options for all
    using (public.is_admin(auth.uid()));


-- ============================================================================
-- POLICIES: CERTIFICATES
-- ============================================================================
create policy "Users can view own certificates"
    on public.certificates for select
    using (auth.uid() = user_id);

create policy "Admins can view all certificates"
    on public.certificates for select
    using (public.is_admin(auth.uid()));

-- ⚠️ INSERT يحصل من السيرفر فقط


-- ============================================================================
-- POLICIES: COUPONS
-- ============================================================================
create policy "Anyone can view active coupons"
    on public.coupons for select
    using (is_active = true and (expires_at is null or expires_at > now()));

create policy "Admins can manage coupons"
    on public.coupons for all
    using (public.is_admin(auth.uid()));


-- ============================================================================
-- 21. INITIAL DATA (بيانات أولية)
-- ============================================================================

-- التصنيفات الأساسية
insert into public.categories (slug, name_ar, icon, sort_order) values
('marketing', 'التسويق الرقمي', 'megaphone', 1),
('automation', 'الأتمتة و n8n', 'workflow', 2),
('ai', 'الذكاء الاصطناعي', 'brain', 3),
('programming', 'البرمجة و Vibe Coding', 'code', 4),
('content', 'صناعة المحتوى', 'video', 5),
('business', 'ريادة الأعمال', 'briefcase', 6);


-- ============================================================================
-- 22. VIEWS (للأمان والسهولة)
-- ============================================================================

-- view لعرض خيارات السؤال بدون الإجابة الصحيحة (للطلاب)
create or replace view public.quiz_options_safe as
select 
    id,
    question_id,
    option_ar,
    sort_order
from public.quiz_options;


-- view لإحصائيات الطالب
create or replace view public.user_stats as
select 
    p.id as user_id,
    p.full_name,
    (select count(*) from public.progress where user_id = p.id and is_completed = true) as completed_lessons,
    (select count(*) from public.certificates where user_id = p.id) as certificates_count,
    (select sum(watched_sec) from public.progress where user_id = p.id) as total_watched_sec
from public.profiles p;


-- ============================================================================
-- 🎉 انتهى الـ Schema
-- ============================================================================
-- الخطوة الجاية: نضيف الـ Storage Buckets في Supabase Dashboard:
-- 1. avatars (للصور الشخصية - public)
-- 2. course-thumbnails (لصور الكورسات - public)
-- 3. lesson-attachments (للملفات - private)
-- 4. certificates (للشهادات - private with signed URLs)
-- ============================================================================
