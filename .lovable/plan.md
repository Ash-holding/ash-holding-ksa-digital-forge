
## نطاق العمل

بناء نظام **«تمويل خدمات ASH»** داخل الموقع الحالي (لا مشروع مستقل، لا Supabase) يمنح العميل — بعد دراسة ائتمانية داخلية — **رصيد شراء خدمي مقيّد** (Closed-Loop Service Credit) داخل محفظته لشراء خدمات شركة آش فقط. الرصيد:
- ليس نقدًا، لا يُصرف، لا يُسحب، لا يُحوّل، لا يُستخدم خارج خدمات الشركة.
- ينشأ عبر قرار داخلي موثق، ويُخصم آليًا عند شراء خدمة مرتبطة بالعقد.
- يبقى النظام في وضع **«بيئة تجريبية — الاعتماد النهائي معطّل»** افتراضيًا حتى يرفع المستشار القانوني والاعتمادات المطلوبة من بوابة الامتثال.

## ما نستخدمه من الموقع الحالي (لا إعادة بناء)

- `User` / `Client` / RBAC الحالي + إضافة أدوار جديدة.
- `Invoice` / `InvoiceItem` كفواتير أقساط وخدمات ممولة.
- `Contract` (توسعة للربط بعقد التمويل).
- `Wallet` / `WalletTransaction` الحالية تبقى للمحفظة النقدية العادية؛ **نضيف محفظة منفصلة** `ServiceCreditWallet` مع دفتر Ledger منفصل لا يختلط بالمحفظة النقدية.
- `PaymentIntent` / بوابة الدفع الحالية لسداد الأقساط.
- WhatsApp/SMS/Email عبر طبقة `WA` الموجودة.
- `AuditLog` الحالي + جدول تدقيق مالي مستقل غير قابل للتعديل.

## هيكل التنفيذ التدريجي (Phases)

نبني على 6 مراحل قابلة للنشر، كل مرحلة قابلة للاختبار وحدها. **هذا الطلب يغطي المرحلة 1 و2**، والباقي على دفعات لاحقة (بموافقتك) لأن الحجم كبير جدًا.

### Phase 1 — الأساس (Schema + RBAC + Compliance Gate + Products)
- Prisma migration بإضافة الجداول أدناه فقط، مع Grants و Indexes.
- إضافة أدوار: `CREDIT_ANALYST` `CREDIT_MANAGER` `RISK_OFFICER` `COMPLIANCE_OFFICER` `LEGAL_OFFICER` `COLLECTIONS_OFFICER` `CFO` `CREDIT_COMMITTEE` `FINAL_APPROVER` `INTERNAL_AUDITOR`.
- **بوابة الامتثال** `financing_settings` تحمل علم `productionEnabled=false` وقائمة الاعتمادات المطلوبة؛ أي endpoint حاسم يفحص العلم ويرفض بـ 423 Locked قبل التفعيل.
- إدارة `FinancingProduct` + خدمات مشمولة (CRUD في لوحة الإدارة، لا نشر قبل الاعتماد القانوني).

### Phase 2 — الواجهة العامة + الحاسبة + قسم «التمويل»
- Public routes: `financing/`, `financing/how`, `financing/calculator`, `financing/eligibility`, `financing/services`, `financing/faq`, `financing/apply`, `financing/track`, `financing/complaints`.
- الحاسبة تعتمد على `GET /api/financing/products/:id/quote?amount&term&down` من الخادم — **لا حساب في المتصفح**.
- كل صفحة تعرض التنبيه: "النتيجة تقديرية ولا تمثل موافقة أو عرضًا نهائيًا" ولا تستخدم أي عبارة ادعاء ترخيص.

### Phase 3 — الطلبات (فرد/منشأة) + الموافقات + المستندات + التحقق
- Wizard متعدد الخطوات مع حفظ Draft تلقائي وشريط نسبة اكتمال.
- Consent متعدد (لكل غرض سجل مستقل بـ Hash/IP/UA/إصدار).
- رفع مستندات (Malware/mime/hash/versions).
- Integrations Registry: بطاقات مزودين (نفاذ/سمة/يقين/IBAN…) بحالة "غير متصل" افتراضيًا؛ لا نتائج وهمية.

### Phase 4 — التقييم الائتماني + الاحتيال + المراجعة + الاعتماد
- محرك تقييم داخلي بإصدارات مسجّلة و Snapshot لكل قرار.
- محرك احتيال بقواعد يُدار من الإدارة (لا رفض تلقائي بمؤشر واحد).
- Approval Matrix متعدد المستويات مع مبدأ الفصل بين المهام (منشئ ≠ معتمد).

### Phase 5 — العرض + العقد + القبول الإلكتروني + تفعيل الرصيد
- `financing_offers` مع snapshot مجمّد بعد قبول العميل.
- قوالب عقود بإصدارات + توليد PDF نهائي بـ SHA-256 و Verification ID و QR (نستفيد من `contract-print.ts` القائم).
- OTP عبر WhatsApp + SMS، مع Evidence Bundle كامل. عبارة "قبول إلكتروني موثق بالأدلة".
- تفعيل الرصيد يتطلب موافقة شخص ثانٍ + OTP للمفوّض النهائي + `productionEnabled=true`.

### Phase 6 — Ledger + شراء الخدمات + الأقساط + التحصيل + لوحات + تقارير
- Ledger append-only مع Idempotency Keys و Row Locking عبر `SELECT … FOR UPDATE`.
- شراء الخدمة: `BEGIN TRANSACTION → HOLD → CREATE ORDER → CREATE INVOICE → CAPTURE → RELEASE_HOLD_ON_FAIL`.
- جدولة الأقساط + Webhook الدفع (Signature verify + idempotent).
- لوحة الإدارة الفرعية «التمويل» + KPIs + تقارير CSV/Excel/PDF.
- شكاوى/اعتراضات مع اعتراض مستقل على القرار الائتماني.

## قاعدة البيانات (المرحلة 1 فقط الآن)

سنضيف في المهاجرة الأولى — الباقي في مهاجرات لاحقة لتقليل المخاطر:

```text
financing_products
financing_product_services
financing_settings           -- بوابة الامتثال + Feature flags
compliance_approvals         -- الرأي القانوني + السياسات
financing_audit_logs         -- تدقيق مستقل غير قابل للتعديل
```

كل الجداول:
- `id uuid`, `createdAt`, `updatedAt`, `createdById`, Foreign Keys, Indexes.
- Grants لـ `authenticated`/`service_role`.
- Constraints: `amount_min >= 5000`, `amount_max <= 500000`, `amount_min <= amount_max`.

## نقاط الربط مع الكود الحالي

- `backend/src/routes/financing.ts` (عام + عميل) و`backend/src/routes/financing-admin.ts` (إدارة).
- تسجيل الراوترات في `backend/src/server.ts` تحت `/api/financing` و`/api/admin/financing`.
- Middleware جديد `requireFinancingRole` يقرأ من الأدوار الجديدة.
- Middleware `requireProductionEnabled` يمنع القرارات النهائية في بيئة تجريبية.
- استفادة من `contract-print.ts` و`invoice-print.ts` القائمين لتوليد PDF.
- لا تعديل على مسارات `/api/wallet` الحالية — نفصل تحت `/api/financing/wallet`.

## الملفات المتوقع إنشاؤها في المرحلتين 1+2

Backend:
- `backend/prisma/migrations/<ts>_financing_phase1/migration.sql`
- تعديل `backend/prisma/schema.prisma` بالجداول الخمسة.
- `backend/src/routes/financing.ts` (calculator + products list + apply-draft).
- `backend/src/routes/financing-admin.ts` (products CRUD + compliance).
- `backend/src/lib/financing/calculator.ts` (خدمة الحساب على الخادم).
- `backend/src/middleware/financing.ts` (RBAC + production gate).

Frontend:
- `src/routes/financing.tsx` (Layout قسم التمويل).
- `src/routes/financing.index.tsx` (الصفحة التعريفية).
- `src/routes/financing.how.tsx`, `financing.calculator.tsx`, `financing.eligibility.tsx`, `financing.services.tsx`, `financing.faq.tsx`, `financing.complaints.tsx`, `financing.apply.tsx`, `financing.track.tsx`.
- `src/components/financing/*` (Calculator, EligibilityRing, JourneyStepper, DisclaimerBar).
- `src/routes/_authenticated/admin.financing.tsx` + subroutes (products, compliance).
- إضافة رابط "التمويل" في Header + Footer + Admin Sidebar.

## قواعد صارمة أثناء التنفيذ

- TypeScript strict، عربي RTL، `IBM Plex Sans Arabic` (يُحمَّل عبر `<link>` في `__root.tsx`).
- Mobile-first، Framer Motion مع دعم `prefers-reduced-motion`، لا Emoji، لا صور مولّدة، لا أنيميشن داخل PDF.
- بدون بيانات وهمية إطلاقًا في الإنتاج — كل رقم يأتي من API.
- بدون قرارات مالية في الفرونت، بدون مفاتيح تكامل في المتصفح.
- `AuditLog` لكل تغيير حالة/قرار مع IP وUA والموظف والسبب.
- Idempotency-Key + Database Transactions + Row Locks لكل عملية مالية.
- بوابة الامتثال ترفض القرارات النهائية بـ HTTP 423 حتى يفعّل المفوض الإنتاج.

## ما نحتاج قرارك فيه قبل البدء

1. هل نبدأ فعليًا بـ **Phase 1 + Phase 2** الآن (Schema + بوابة الامتثال + منتجات التمويل + قسم «التمويل» العام + الحاسبة)، ونؤجل بقية المراحل لدفعات لاحقة بموافقتك؟
2. هل تريد أن يكون الرابط الجديد في هيدر الموقع **«التمويل»** أم **«تمويل خدمات ASH»**؟
3. هل تفضّل ظهور بطاقة «التمويل» في لوحة العميل الحالية فور المرحلة 2 (بصفة "قريبًا")، أم نؤجلها للمرحلة 5؟
