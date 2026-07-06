# خطة تطوير قسم العملاء (Admin)

## 1) توسيع مخطط قاعدة البيانات
إضافة حقول جديدة على `Client` عبر migration Prisma:
- `verificationStatus` (enum: `UNVERIFIED` / `PENDING` / `VERIFIED` / `REJECTED`)
- `verifiedAt`, `verifiedById`, `verificationNote`
- `lastIpAddress`, `lastIpCountry`, `lastIpCity`, `lastIpRegion`
- `lat`, `lng` (Decimal، للموقع الجغرافي)
- `lastSeenAt` (آخر ظهور فعلي)

وعلى `User`: `lastIpAddress` (يُحدَّث عند كل تسجيل دخول).

## 2) تحديث الباك اند (Express + Prisma)
- **تتبع IP تلقائيًا** في `POST /auth/login`: قراءة `req.ip` (مع `trust proxy`)، تحديث `User.lastIpAddress` و `Client.lastIp*`، واستدعاء خدمة `ip-api.com` (مجاني بدون مفتاح) لجلب الدولة/المدينة/الإحداثيات وتخزينها.
- **نقاط توثيق جديدة**:
  - `POST /clients/:id/verify` → تعيّن `VERIFIED` + `verifiedAt` + `verifiedById`.
  - `POST /clients/:id/unverify` → إعادة إلى `UNVERIFIED`.
  - `POST /clients/:id/refresh-geo` → إعادة جلب الموقع من آخر IP.
- **تحسين `GET /clients` و `GET /clients/:id`** لإرجاع الحقول الجديدة + `sessionsCount` من `RefreshToken`.

## 3) عميل تجريبي (Seed)
سكربت `backend/prisma/seed-demo-client.ts` يضيف:
- مستخدم `demo@client.sa` / `Demo@12345` بدور CLIENT.
- ملف عميل موثّق (`VERIFIED`) لشركة "الرياض للتقنية"، مع IP سعودي واقعي وإحداثيات الرياض.
- مشروع نشط + فاتورة مدفوعة + تذكرة مفتوحة كأمثلة.

## 4) تحويل النوافذ المنبثقة إلى صفحات داخلية
حاليًا "عميل جديد" و"تعديل العميل" يستخدمان `FormSheet` منبثق. سيتحوّل إلى:
- `/_authenticated/admin/clients/new.tsx` — صفحة إنشاء بتصميم متعدد الأقسام (بيانات الحساب / بيانات الشركة / العنوان).
- `/_authenticated/admin/clients/$id/edit.tsx` — صفحة تعديل مع نفس التخطيط.
- زر "عميل جديد" يوجّه بـ`navigate` بدل فتح شيت.

## 5) تحسينات صفحة تفاصيل العميل
داخل `admin.clients.$id.tsx` إضافة:
- **بطاقة التوثيق**: شارة VERIFIED/UNVERIFIED مع زر توثيق/إلغاء توثيق فوري.
- **بطاقة الهوية والاتصال**: IP الأخير، الدولة (علم)، المدينة، آخر ظهور، عدد الجلسات النشطة.
- **بطاقة الموقع**: خريطة صغيرة (OpenStreetMap iframe مجاني) بإحداثيات العميل + زر "فتح في الخرائط".
- **شريط علوي محسّن**: صورة رمزية، اسم، شارة توثيق، أزرار سريعة (تعديل، تعطيل، توثيق).

## 6) تحسينات قائمة العملاء
- عمود جديد "التوثيق" (شارة ملونة).
- عمود "الدولة" مع علم.
- فلترة سريعة: الكل / موثّق / غير موثّق / معطّل.

## تفاصيل تقنية
- خدمة الجغرافيا: `fetch('http://ip-api.com/json/'+ip+'?fields=country,city,regionName,lat,lon,countryCode')` — لا تتطلب مفتاح، حد 45 طلب/دقيقة (كافٍ).
- الخريطة: `<iframe src="https://www.openstreetmap.org/export/embed.html?bbox=...&marker=lat,lon" />` — مجاني.
- الشارات والألوان تتبع نظام التصميم الحالي (electric/emerald/rose).
- كل النماذج الجديدة تستخدم Zod للتحقق clint-side.

## الترتيب
1. Migration + تحديث Prisma.
2. تحديث الباك اند (auth + clients + geo).
3. Seed للعميل التجريبي.
4. الصفحات الداخلية للإنشاء/التعديل.
5. تحسين صفحة التفاصيل + القائمة.

هل نبدأ التنفيذ؟
