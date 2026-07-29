# فصل الخدمات عن المشاريع بشكل كامل

الهدف: نظام مستقل لطلبات الخدمات (ServiceRequest) موازٍ لنظام المشاريع (ProjectRequest)، مع فصل واضح في قاعدة البيانات، الواجهات، ولوحة الإدمن.

## 1. قاعدة البيانات (Prisma)

**جدول جديد `ServiceRequest`:**
- `id`, `code` (SRQ-XXXXXX), `clientId`, `catalogKey` (dev/systems/marketing/design), `itemKey` (hosting/vps/smtp/...), `title`, `description`
- `kind`: `NEW_SUBSCRIPTION` | `QUOTE_REQUEST` | `RENEWAL_UPGRADE`
- `status`: `DRAFT` → `SUBMITTED` → `UNDER_REVIEW` → `QUOTED` → `AWAITING_PAYMENT` → `PAID` → `PROVISIONING` → `ACTIVE` / `REJECTED` / `CANCELLED`
- `basePrice`, `quotedPrice`, `currency`, `billingCycle` (MONTHLY/YEARLY/ONE_TIME)
- `attachedServiceId` (للترقية/التجديد — nullable FK إلى `Service`)
- `linkedInvoiceId`, `linkedServiceId` (بعد التفعيل)
- `adminNotes`, `clientNotes`, `metadata` JSON (specs مثل RAM/CPU/domain)
- `submittedAt`, `quotedAt`, `paidAt`, `activatedAt`
- `assignedAdminId`

**جدول `ServiceRequestMessage`** (محادثة داخلية مثل ProjectMessage).

**جدول `ServiceRequestEvent`** (audit trail لتغيير الحالات).

## 2. الباك-إند (Express routes)

- `backend/src/routes/service-requests.ts` — CRUD للعميل
- `backend/src/routes/service-requests-admin.ts` — إدارة، تسعير، موافقة، Kanban
- lifecycle helper: عند `PAID` للاشتراك → إنشاء `Service` تلقائياً + تفعيل + إشعار واتساب
- عند `QUOTED` → إشعار العميل + رابط دفع
- WhatsApp templates: تقديم طلب، تسعير، دفع، تفعيل، رفض

## 3. واجهة العميل

**مسارات جديدة:**
- `/client/services/new?catalog=dev&item=website` — نموذج طلب خدمة (3 أنواع)
- `/client/services/requests` — سجل طلبات الخدمات (منفصل عن `/client/projects/requests`)
- `/client/services/requests/$id` — تفاصيل الطلب + المحادثة + الحالة + الدفع
- `/client/services` تبقى للاشتراكات النشطة + الكتالوج

**تحديث `ServiceCatalog.tsx`:** زر "اطلب هذه الخدمة" يفتح `/client/services/new` بدلاً من `/client/projects/new`.

**نموذج الطلب `ServiceRequestSheet`:** يعرض حقول ديناميكية حسب النوع:
- اشتراك: مواصفات (نطاق، RAM، مدة) + سعر ثابت + زر "ادفع الآن"
- تسعير: وصف الاحتياج + ملفات مرفقة + انتظار عرض السعر
- تجديد: يختار خدمة قائمة + مدة التجديد

## 4. لوحة الإدمن

**مسارات جديدة:**
- `/admin/service-requests` — Layout مع Outlet
- `/admin/service-requests/index` — Kanban board بأعمدة (جديد، قيد المراجعة، مسعّر، بانتظار الدفع، مدفوع، مفعّل)
- `/admin/service-requests/$id` — تفاصيل + محادثة + تسعير + قبول/رفض + ربط بخدمة/فاتورة

**تحديث `AdminLayout`:** إضافة عنصر تنقل "طلبات الخدمات" منفصل عن "طلبات المشاريع".

## 5. الفصل النهائي

- إزالة أي استخدام لـ `ProjectRequest` من تدفق الخدمات.
- `client.projects.new` يبقى للمشاريع فقط (تطوير مخصص).
- الفواتير المولّدة من طلبات الخدمات تحمل `sourceType: SERVICE_REQUEST` بدلاً من `PROJECT`.
- إحصائيات لوحة الإدمن تعرض عدّاداً منفصلاً للطلبين.

## تفاصيل تقنية

- Prisma migration + `prisma db push` (يتم يدوياً على السيرفر — سأذكر ذلك).
- إشعارات SmartWats منفصلة عن قوالب المشاريع.
- reuse مكونات `DataTable`, `DetailShell`, `StatusBadge` مع ألوان جديدة للحالات.
- بدون تكرار: `ServiceCatalog` تبقى مكون واحد يُستخدم في `/client/services` و`/client/services/new`.

## ما لن يُلمس

- نظام المشاريع الحالي (`Project`, `ProjectRequest`, `ProjectMessage`) يبقى كما هو تماماً.
- نظام التمويل والمحفظة لا يتغيّر.

هل أبدأ التنفيذ؟
