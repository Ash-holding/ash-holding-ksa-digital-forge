# تطوير قسم المشاريع — نظام موافقات متعدد المراحل بمستوى الشركات العالمية

## الرؤية
تحويل مسار الطلب من "طلب → مشروع" إلى **رحلة موافقات تفاعلية بمراحل متوازية** بين العميل والادمن، تنتهي بتوقيع رقمي رسمي من العميل، ثم فاتورة تلقائية، ثم انتقال تلقائي بعد السداد إلى «جاري التنفيذ» مع عدّاد تنازلي حي.

## مراحل الرحلة (State Machine)

```text
[SUBMITTED]        ← العميل أرسل الطلب
     ↓ (الادمن يراجع)
[UNDER_REVIEW]     ← دراسة فنية داخلية
     ↓ (الادمن يقدّم عرض)
[PROPOSAL_SENT]    ← عرض سعر + جدول زمني + نطاق عمل
     ↓ (العميل يعلّق أو يطلب تعديلات — chat)
[CLIENT_REVISION]  ← جولة تعديلات (اختياري / متكرر)
     ↓
[FINAL_APPROVAL]   ← جاهز للتوقيع النهائي
     ↓ (العميل يوقّع رقمياً بـ OTP واتساب)
[SIGNED]           ← موثّق — يصدر invoice تلقائياً
     ↓ (بعد السداد الكامل)
[IN_PROGRESS]      ← تحوّل تلقائي + بدء العدّاد التنازلي
     ↓
[DELIVERED] → [COMPLETED]
```

كل انتقال يبعث إشعار واتساب للطرفين ويُسجَّل في `AuditLog`.

## Backend

### تحديث Prisma
- `ProjectRequest`: إضافة `stage` enum جديد (القيم أعلاه), `proposalAmount`, `proposalScope` (text), `proposalDuration` (days), `proposalValidUntil`, `signedAt`, `signatureOtp`, `signatureIp`, `signatureUserAgent`, `revisionCount`, `linkedInvoiceId`, `executionStartAt`, `executionDueAt`.
- جدول جديد `RequestApprovalEvent` (id, requestId, actor, fromStage, toStage, note, meta, createdAt) لسجل زمني كامل.
- توسيع `ProjectMessage` ليدعم `requestId` (chat على مستوى الطلب قبل تحويله لمشروع).

### مسارات جديدة/محدّثة في `backend/src/routes/projects.ts`
- `POST /requests/:id/proposal` (admin) — يحفظ العرض ويحوّل الحالة لـ `PROPOSAL_SENT` + واتساب للعميل.
- `POST /requests/:id/revise` (client) — يفتح جولة تعديل، يعيد الحالة لـ `CLIENT_REVISION`.
- `POST /requests/:id/request-signature` (admin) — يرسل OTP واتساب للعميل ويحوّل لـ `FINAL_APPROVAL`.
- `POST /requests/:id/sign` (client) — يتحقق من OTP، يسجّل التوقيع (IP + UA + timestamp)، يحوّل لـ `SIGNED`، وينشئ Invoice تلقائياً بالمبلغ المتفق عليه.
- Webhook داخلي عند تحديث Invoice لـ `PAID`: يحوّل الطلب لـ `IN_PROGRESS`، ينشئ Project رسمي إن لم يكن، ويحسب `executionDueAt = now + proposalDuration`.
- `GET /requests/:id/timeline` — يرجّع كل `RequestApprovalEvent` مرتبة.

## Frontend

### صفحة الادمن `admin.project-requests.$id.tsx`
- **Stepper أفقي فخم** يعرض المراحل السبع بأيقونات وحالة (مكتملة/حالية/قادمة) مع Framer Motion.
- **بطاقة العرض (Proposal Builder):** حقول المبلغ، النطاق (rich text)، المدة (أيام)، صلاحية العرض. زر «إرسال العرض للعميل».
- **زر «طلب التوقيع النهائي»** يظهر بعد PROPOSAL_SENT.
- **Timeline events** جانبية تعرض كل حركة.
- **بعد SIGNED:** تعرض تفاصيل التوقيع (IP, UA, timestamp, OTP verified) + رقم الفاتورة المرتبطة.

### صفحة العميل `client.projects.requests.$id.tsx` (جديدة)
- **Hero سينمائي** مع Stepper نفسه بتصميم مطابق.
- **بطاقة العرض:** لما تصير `PROPOSAL_SENT`، تظهر بطاقة فخمة بتفاصيل العرض (المبلغ، النطاق، المدة، الصلاحية) وزرّان: «طلب تعديل» و«موافق — تابع للتوقيع».
- **شاشة التوقيع الرقمي (Modal فخم):**
  - يعرض ملخص الاتفاقية مع صندوق تمرير للشروط.
  - checkbox «أوافق على الشروط والأحكام».
  - حقل OTP 6 أرقام (يُرسل واتساب).
  - زر «توقيع رقمي رسمي» بأنميشن ختم + confetti عند النجاح.
- **شهادة التوقيع:** بعد التوقيع، بطاقة تعرض «موثّق رقمياً» مع IP، الوقت، ورقم مرجعي.
- **بعد السداد:** بطاقة عدّاد تنازلي حي (days / hours / minutes / seconds) لتاريخ تسليم المشروع، بأنميشن حي (framer-motion `AnimatePresence` على الأرقام).

### مكوّنات مشتركة جديدة
- `src/components/projects/ApprovalStepper.tsx` — Stepper تفاعلي.
- `src/components/projects/ProposalCard.tsx` — بطاقة عرض السعر.
- `src/components/projects/SignatureDialog.tsx` — modal التوقيع مع OTP.
- `src/components/projects/CountdownTimer.tsx` — عدّاد تنازلي حي.
- `src/components/projects/ApprovalTimeline.tsx` — سجل الحركات.

## تفاصيل تقنية (للمهتمين)
- التوقيع الرقمي = OTP واتساب + hash يُخزّن `sha256(otp + userId + requestId + timestamp)` في `signatureOtp`.
- IP يُلتقط من `req.ip` + `x-forwarded-for`.
- العدّاد التنازلي client-side بـ `setInterval` كل ثانية، مع مصدر الحقيقة `executionDueAt` من السيرفر.
- إشعارات واتساب لكل انتقال حالة (قوالب رسمية بالعربية).
- كل الشاشات تستخدم `refetchInterval: 5s` للتزامن اللحظي بين الادمن والعميل.

## نطاق التنفيذ (مرحلة واحدة)
1. Prisma migration + مسارات backend الكاملة.
2. المكوّنات المشتركة الخمسة.
3. تحديث صفحة الادمن للطلب.
4. إنشاء صفحة العميل الداخلية للطلب.
5. ربط تلقائي Invoice → PAID → IN_PROGRESS + بدء العدّاد.

بعد الاعتماد نبدأ التنفيذ مباشرة وننشر على السيرفر مع تعليمات `prisma db push` و`pm2 restart`.
