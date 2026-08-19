# فاهم — تطبيق الموبايل

Expo + React Native + expo-router. تطبيق واحد لـ Android و iOS.

الخطة المعمارية الكاملة والمخاطر: [`../docs/mobile-app-plan.md`](../docs/mobile-app-plan.md).

## التشغيل محلياً

```bash
cd mobile
npm install
cp .env.example .env      # وحط الـ anon key الحقيقي
npx expo start
```

امسح الـ QR بتطبيق Expo Go على تليفونك، أو اضغط `a` / `i`.

> **مهم:** `.env` فيه الـ **anon key** بس. مفتاح `service_role`
> عمره ما يدخل مجلد `mobile/` — أي حاجة هنا بتترص جوه ملف التطبيق
> اللي بينزل على تليفون المستخدم.

## البنية

```
app/                    مسارات expo-router
├── _layout.tsx         RTL + AuthProvider
├── login.tsx           دخول بكود على الإيميل (OTP)
├── (tabs)/             الرئيسية · الكورسات · الكوميونيتي · نقاطي · حسابي
├── course/[slug].tsx   تفاصيل الكورس + المحتوى
├── lesson/[id].tsx     المشغّل + نبضة التقدّم
└── post/               تفاصيل البوست + بوست جديد

src/lib/
├── supabase.ts         العميل (anon key + جلسة المستخدم)
├── api.ts              عميل /api/mobile/* مع أخطاء مترجمة
├── community.ts        قراءة/كتابة مباشرة على Supabase (RLS)
├── auth-context.tsx    الجلسة + بروفايل المستخدم
└── theme.ts            نفس ألوان وقياسات الويب
```

## من فين بتيجي البيانات

| الميزة | المصدر | ليه |
|---|---|---|
| الكوميونيتي، XP، المتصدرين | Supabase مباشرة | RLS + الـ RPCs بتعبّر عن كل القواعد |
| الكورسات، الدروس، التقدّم | `/api/mobile/*` | منطق الفتح موجود في `lib/access.ts` |
| الاشتراك | متصفح خارجي | عمولة المتاجر — راجع §٥.١ في خطة العمل |

## البناء

عبر Codemagic — الإعداد في [`../codemagic.yaml`](../codemagic.yaml).
`ios/` و`android/` مش في git؛ `expo prebuild` بيولّدهم في كل build،
فـ `app.json` هو المرجع الوحيد لأي إعداد أصلي.

## قبل أول إطلاق

- [ ] `assets/icon.png` (1024×1024) · `assets/splash.png` · `assets/adaptive-icon.png`
- [ ] `extra.eas.projectId` في `app.json`
- [ ] مجموعات المتغيّرات في Codemagic
- [ ] قرار Apple 3.1.1 (خطة العمل §٥.١)
- [ ] تأكيد إن RTL شغّال بعد `expo prebuild` (خطة العمل §٥.٢)
