# ASH HOLDING — لوحة الإدارة وبوابة العملاء (إنتاج فعلي)

## نظرة عامة
بناء لوحتين متكاملتين (إدارة + عميل) بالعربية RTL، متصلتان بباك اند حقيقي (Node.js + Prisma + PostgreSQL) قابل للنشر على VPS عبر Docker Compose، مع مصادقة JWT، صلاحيات، ورفع ملفات محلي — بدون أي اعتماد على Supabase/Firebase/BaaS.

## هيكل المستودع النهائي
```
/                      ← جذر الموقع العام الحالي (يبقى كما هو)
├─ src/                ← الموقع العام (لا يتغير)
├─ backend/            ← يُعاد بناؤه بـ NestJS كاملاً
│  ├─ src/
│  │  ├─ auth/         ← JWT + Refresh + Guards + RBAC
│  │  ├─ users/  clients/  projects/  services/
│  │  ├─ invoices/  contracts/  support/  payments/
│  │  ├─ files/  notifications/  settings/  audit/
│  │  ├─ common/       ← decorators, filters, interceptors
│  │  └─ main.ts
│  ├─ prisma/
│  │  ├─ schema.prisma ← جميع 14 نموذج (User, Client, Project, ...)
│  │  ├─ migrations/   ← migration أولية
│  │  └─ seed.ts       ← super_admin / support / accountant / client + بيانات تجريبية
│  ├─ uploads/         ← تخزين ملفات محلي (mount volume)
│  ├─ Dockerfile  .env.example  package.json
├─ docker-compose.yml  ← postgres + backend + frontend + nginx
├─ nginx.conf          ← reverse proxy + رفع حجم ملفات
├─ README_DEPLOYMENT.md
```
لوحات الإدارة والعميل تعيش داخل الفرونت اند الحالي كمسارات جديدة `/admin/*` و `/client/*` مع Layout مستقل لكل واحدة، ومحمية بـ route guards تقرأ JWT من الباك اند.

## الباك اند (NestJS)
- **NestJS 10 + TypeScript + Prisma 5 + PostgreSQL 16**
- **المصادقة:** `@nestjs/jwt` + `passport-jwt` + bcrypt + Refresh token في جدول مستقل (rotation + revoke)
- **الحماية:** Helmet, CORS مضبوط، `@nestjs/throttler` (rate-limit خاص بـ `/auth/*`)، Zod/class-validator على كل DTO
- **الرفع:** Multer محلي، حد أقصى وأنواع مسموحة من `.env`، تخزين تحت `backend/uploads/{yyyy}/{mm}/`، والمسار في DB فقط
- **الصلاحيات:** `@Roles('super_admin','admin',...)` + `RolesGuard` + `ClientScopeGuard` (يضمن أن العميل يرى بياناته فقط)
- **التدقيق:** `AuditInterceptor` يسجل كل عملية كتابة إلى `AuditLog`
- **السجلات:** Pino
- **PDF/إشعارات:** placeholders (endpoints جاهزة، توليد فعلي لاحقاً)

## المسارات (كما طُلبت حرفياً)
Auth, Admin CRUD كامل (clients/projects/services/invoices/contracts/support/payments/files/users/settings/audit-log/stats)، Client (dashboard/projects/services/invoices/contracts/support + POST tickets & messages/payments/files/profile).

## الفرونت اند
- إضافة تبعيات: `@tanstack/react-query`, `axios`, `react-hook-form`, `zod`, `@hookform/resolvers`, `recharts`, `date-fns`, `jwt-decode`
- طبقة API: `src/lib/api.ts` (axios + interceptors للـ access/refresh token + إعادة المحاولة عند 401)
- Auth Context عبر Router context في `__root.tsx` + guards في `_authenticated/` layout
- توجيه بحسب الدور بعد تسجيل الدخول

### المسارات الجديدة
عامة: `/login`, `/forgot-password`
`_authenticated/_admin.*` (11 صفحة): overview, clients (+ صفحة تفاصيل client)، projects, services, invoices, contracts, support, payments, files, users, settings, reports, audit-log
`_authenticated/_client.*` (10 صفحات): overview, projects, services, invoices, contracts, support, payments, files, profile, notifications

### مكونات مشتركة
`AdminLayout` (سايدبار ثابت + توب بار + بحث + إشعارات + قائمة حساب)، `ClientLayout` (سايدبار + Bottom-nav على الجوال)، `DataTable` (بحث/فلترة/ترقيم/تحويل لبطاقات على الجوال)، `StatCard`, `StatusBadge`, `EmptyState`, `SkeletonTable`, `ConfirmDialog`, `FileUploader`, `TicketChat`، جميعها بـ shadcn + Framer Motion + tokens الموقع الحالي (electric/purple-accent، خلفية داكنة)

### قواعد UX
- كل جدول: Skeleton أثناء التحميل → Empty state إن كانت النتائج فارغة → Pagination + Search + Filter
- كل حذف: `ConfirmDialog`
- كل mutation: toast (sonner) نجاح/خطأ عربي
- الجوال: السايدبار Drawer، الجداول تصير بطاقات، النماذج عمود واحد، أزرار full-width

## النشر
- `docker-compose.yml`: خدمات postgres (volume)، backend (build من backend/Dockerfile، mount uploads)، frontend (build ثم يخدمه nginx)، nginx (reverse proxy `/api` → backend، بقية المسارات → frontend، `client_max_body_size` من env)
- `.env.example` جذر + `backend/.env.example` كامل (DATABASE_URL, JWT_SECRET, JWT_REFRESH_SECRET, UPLOAD_DIR, UPLOAD_MAX_MB, ALLOWED_MIME, CORS_ORIGIN, SEED_ADMIN_EMAIL/PASSWORD ...)
- `README_DEPLOYMENT.md` عربي: خطوات Ubuntu VPS من الصفر (تثبيت Docker، clone، env، migrate، seed، nginx، SSL بـ certbot، backup PostgreSQL)

## طريقة التنفيذ (على دفعات داخل هذه الجولة)
1. **الباك اند أولاً** — إعادة بناء `backend/` كمشروع NestJS كامل مع Prisma schema الجديد الشامل، جميع الوحدات، Seed، Dockerfile.
2. **البنية التحتية** — `docker-compose.yml`، `nginx.conf`، `.env.example`، `README_DEPLOYMENT.md`.
3. **طبقة API + Auth** في الفرونت اند + Layouts + Guards + صفحات `/login` و `/forgot-password`.
4. **صفحات الإدارة الـ13** بمكونات مشتركة (DataTable, StatCard, ...).
5. **صفحات العميل الـ10** بنفس المكونات + Bottom-nav.
6. تحقق نهائي (build + lint).

## ملاحظات مهمة
- الموقع العام الحالي (`/`, `/about`, `/services/...`, ...) **لا يُلمس**.
- لا بيانات وهمية داخل مكونات React — كل صفحة تسحب من الـ API عبر TanStack Query. أثناء التطوير المحلي يعمل السيد لملء PostgreSQL ببيانات واقعية.
- ملفات المستخدمين تُخزن **محلياً** فقط تحت `backend/uploads/` والمسار في DB. لا S3/Cloud.
- placeholders الواضحة (توليد PDF الحقيقي، إرسال الإيميل الفعلي، تكامل بوابة الدفع) موثقة كـ TODO في الكود ولا تعرض حالة نجاح كاذبة.

---
هذا حجم كبير جداً لجولة واحدة؛ سأنفذه على 2-3 ردود متتالية بعد موافقتك، بدءاً بالباك اند + البنية التحتية، ثم الفرونت اند بالكامل. أؤكد أن نتيجة النهاية تعمل محلياً (`docker compose up`) وقابلة للنقل لأي VPS.

**هل أبدأ التنفيذ بهذا التقسيم؟**
