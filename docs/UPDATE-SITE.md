# تحديث موقع faahm.com — الخطوات

> الموقع شغّال على **aaPanel** بـ PM2 على بورت **3001**.
> آخر مرة اتظبط: 21 نوفمبر 2026.

---

## أي تعديل جديد — أمر واحد

ادخل على السيرفر والصق ده:

```bash
cd /www/wwwroot/faahm/src && git pull && PORT=3001 bash deploy-aapanel.sh
```

ياخد حوالي دقيقتين. في الآخر لازم يقول:

```
==> Deployed <كوميت> — http://127.0.0.1:3001 answers 200
```

**لو قال 200، خلاص — الموقع اتحدّث.** مش محتاج تلمس أي حاجة تانية.

لو وقف بأي رسالة حمرا، **الموقع القديم لسه شغّال زي ما هو** — مفيش حاجة اتكسرت. ابعت الرسالة واتصلحت.

---

## ترجع نسخة قديمة

لو تحديث طلع فيه مشكلة:

```bash
ls -1dt /www/wwwroot/faahm/releases/*/     # الأحدث فوق
ln -sfn /www/wwwroot/faahm/releases/<اسم_المجلد> /www/wwwroot/faahm/current
pm2 restart faahm
```

فوري، ومن غير إعادة بناء. بيتحفظ آخر ٥ نسخ.

---

## لو الموقع فتح بس التعديل مش ظاهر

ده حصل قبل كده: nginx كان لسه موجّه على السيرفر القديم.

```bash
grep proxy_pass /www/server/panel/vhost/nginx/faahm.com.conf
```

**لازم يقول `3001`.** لو قال رقم تاني:

```bash
sed -i 's|127.0.0.1:[0-9]*|127.0.0.1:3001|' /www/server/panel/vhost/nginx/faahm.com.conf && nginx -t && nginx -s reload
```

ولو لسه، افتح الصفحة في **نافذة خفية** (Ctrl+Shift+N) — المتصفح بيحفظ النسخة القديمة.

---

## تتأكد إن التعديل وصل فعلاً

متبصش على الصفحة وخلاص — اختبر حاجة بتفرق:

```bash
curl -s -H 'Host: faahm.com' 'http://127.0.0.1/course/vibe-coding?code=VIBE20' | grep -c 'خصم'
```

رقم أكبر من صفر = التعديل وصل.

---

## كوبونات الخصم

اللينك: `faahm.com/course/<الكورس>?code=<الكود>`

الشغّال دلوقتي: **`VIBE20`** → Vibe Coding بـ $20 بدل $60.

**توقف كوبون** (فوري، من غير deploy): **/admin/coupons** → اقفل `Active`.

**كوبون جديد:** من **/admin/coupons** → New.
- `fixed` = خصم بالسنتات (`4000` = خصم $40)
- `percent` = نسبة (`50` = نص السعر)

---

## أماكن مهمة

| الحاجة | المكان |
|---|---|
| الكود | `/www/wwwroot/faahm/src` |
| المفاتيح والأسرار | `/www/wwwroot/faahm/faahm.env` |
| النسخ القديمة | `/www/wwwroot/faahm/releases/` |
| إعداد nginx | `/www/server/panel/vhost/nginx/faahm.com.conf` |
| اسم العملية | `faahm` (PM2) |

```bash
pm2 list                      # شغّال ولا لأ
pm2 logs faahm --lines 50     # الأخطاء
```

---

## الكونتينر القديم

لسه موجود ومتوقف — اسمه `faahm` على بورت 3300، وده كان الموقع قبل النقل.
سيبه شهر كـسيفتي قبل ما تمسحه.

```bash
docker start faahm    # لو احتجت ترجعله في أزمة
```

وساعتها غيّر الـproxy لـ 3300 بنفس أمر الـ`sed` فوق.
