# نظام التسويق بالعمولة (Affiliate System)

نظام إنتاجي كامل داخل ash-holding.sa، مرتبط بقاعدة PostgreSQL الحالية وBackend الحالي وطبقة api-client، بدون Supabase وبدون مشروع منفصل.

الحجم كبير جداً، لذا سأنفّذه على **6 مراحل مستقلة قابلة للتسليم**. كل مرحلة تنتهي بميزة قابلة للاستخدام فعلياً. أنتظر موافقتك ثم أبدأ بالمرحلة 1.

---

## المرحلة 1 — الأساس والبيانات (Foundation)

- تحديث `prisma/schema.prisma` بالجداول التالية مع فهارس وقيود:
  `Affiliate`, `AffiliateApplication`, `AffiliateCampaign`, `AffiliateLink`,
  `AffiliateClick`, `AffiliateAttribution`, `AffiliateCustomer`,
  `CommissionRule`, `Commission`, `AffiliateLedgerEntry`,
  `PayoutMethod`, `AffiliatePayoutAccount`, `WithdrawalRequest`,
  `MarketingMaterial`, `AffiliateNotification`, `AffiliateAuditLog`.
- إضافة أدوار جديدة في نظام RBAC الحالي:
  `AFFILIATE_MANAGER`, `AFFILIATE`, `FINANCE_REVIEWER` (بجانب SUPER_ADMIN).
- إضافة `AffiliateSettings` (مفاتيح: cookie_days=30, hold_days=14,
  min_withdrawal, attribution_model=last_click, system_enabled).
- ledger مالي غير قابل للتلاعب: `INSERT-only`، حساب الأرصدة عبر SUM
  مع Snapshot أداء.
- Migration + prisma db push.

## المرحلة 2 — التتبع والإسناد (Tracking)

- Middleware يلتقط `?ref=CODE` + UTM ويحفظ Cookie موقّع 30 يوم.
- Endpoint `POST /api/affiliate/track/click` يسجّل زيارة server-side
  (device/browser/geo/referrer/session_id).
- Hash للـ IP (لا يُخزّن الكامل، للحماية فقط).
- ربط الجلسة بالعميل عند التسجيل → `AffiliateAttribution`.
- Last-Valid-Click افتراضاً، قابل للتغيير من الإعدادات.
- منع self-referral.

## المرحلة 3 — تسجيل ولوحة المسوق

- صفحة عامة `/affiliate/join` — نموذج طلب انضمام + رفع مستندات.
- Route `_authenticated/affiliate/` محمي بدور AFFILIATE:
  - `dashboard` — KPIs + رسوم (recharts) + فترات زمنية.
  - `links` — إنشاء روابط/حملات + QR + نسخ + مشاركة.
  - `customers` — جدول العملاء المحالين (بيانات مخفية للخصوصية).
  - `commissions` — pending/available/paid/reversed.
  - `wallet` — Ledger + طلب سحب.
  - `payout-accounts` — إدارة IBAN مع تحقق سعودي + تشفير.
  - `marketing-center` — أدلة ومكتبة محتوى + زر نسخ.
  - `profile` — بياناته وحالة الحساب.

## المرحلة 4 — محرك العمولة و Webhook الدفع

- `commission-engine.ts` مع ترتيب أولويات القواعد المطلوب.
- Snapshot للنسبة/القاعدة داخل سجل Commission.
- Webhook `POST /api/public/affiliate/payment-webhook`:
  - التحقق من HMAC signature.
  - Idempotency key (منع تكرار).
  - Database transaction: إنشاء Commission + LedgerEntry `pending`.
  - إشعار فوري + WhatsApp عبر SmartWats.
- Cron job (يومي): نقل `pending → available` بعد hold_days.
- Endpoint استرجاع/إلغاء → عكس تلقائي مع سبب.

## المرحلة 5 — لوحة الإدارة الكاملة

Route `_authenticated/admin/affiliates/` مع 17 قسم فرعي مطلوب
(نظرة عامة، طلبات الانضمام، المسوقون، الحملات، الروابط، الأكواد،
قواعد العمولات، الزيارات، العملاء، المبيعات، العمولات، السحوبات،
وسائل السحب، المكافآت، المحتوى، الإعدادات، التقارير، سجل التدقيق).
- اعتماد/رفض المسوقين + تعديل نسب + مكافآت يدوية (تتطلب سبب + Audit).
- مراجعة السحوبات مع رفع إيصال تحويل.
- تصدير CSV/Excel/PDF.

## المرحلة 6 — السحوبات + الإشعارات + الحماية النهائية

- تدفق السحب الكامل مع حجز الرصيد + OTP للتغييرات الحساسة.
- إشعارات نظام + بريد + WhatsApp لكل الأحداث المطلوبة.
- Rate limiting على endpoints العمولة.
- Anti-fraud: كشف تكرار الأجهزة/الحسابات (fingerprint hash).
- اختبار end-to-end للسيناريو الكامل:
  زيارة → تسجيل → شراء → عمولة معلقة → متاحة → سحب → تحويل → استرجاع → عكس.

---

## ملاحظات تقنية

- **Backend**: أضيف المسارات داخل `backend/src/routes/affiliate/*` وأسجّلها في
  الـ router الحالي. Zod validation على كل endpoint.
- **Frontend**: TanStack Router + Query (نفس النمط الحالي). ملفات routes
  تحت `src/routes/_authenticated/affiliate/*` و`src/routes/_authenticated/admin/affiliates/*`.
- **api-client**: أضيف قسم `affiliate` بنفس النمط الحالي.
- **UI**: IBM Plex Sans Arabic، RTL، Framer Motion، Lucide، بدون صور مولّدة.
- **PDF/Excel**: أستخدم `jspdf` و`xlsx` الموجودَين مسبقاً.
- **QR**: مكتبة `qrcode` الموجودة.

---

## سؤال قبل البدء

هل تريدني أبدأ بـ **المرحلة 1 (قاعدة البيانات + الأدوار + الإعدادات)** الآن،
أم تفضّل أن أبدأ بمرحلة أخرى أولاً (مثلاً لوحة الإدارة بواجهة فارغة أولاً
ثم نبني الخلفية)؟
