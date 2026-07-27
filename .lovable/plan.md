# خطة إكمال الموقع ثم الرفع

## المرحلة 1: إكمال الصفحات العامة (4 صفحات)

### 1. الصفحة الرئيسية `/` (إعادة تصميم)
- Hero سينمائي: خلفية متحركة (particles/mesh gradient) + عنوان ضخم متحرك + CTA مزدوج
- شريط شعارات العملاء (Marquee لا نهائي)
- Bento Grid يعرض 6 خدمات أساسية بأيقونات مخصصة
- قسم "لماذا ASH" بأرقام متحركة (Counter)
- شريط تقنيات (Stack) مع icons
- قسم آخر مشاريع (3 كروت)
- قسم آراء العملاء (Testimonials carousel)
- CTA نهائي كبير

### 2. صفحات الخدمات
- `/services` — index يعرض كل الخدمات في Bento مع تصنيفات
- `/services/$slug` — صفحة تفصيلية لكل خدمة تحتوي:
  - Hero بأيقونة ولون مخصص للخدمة
  - قسم "ما نقدمه" (features grid)
  - قسم "المراحل" (process timeline)
  - Tech stack المستخدم
  - باقات الأسعار (3 خطط)
  - FAQ
  - CTA
- الخدمات: تطوير ويب، تطبيقات موبايل، حلول سحابية، ذكاء اصطناعي، أمن سيبراني، استشارات

### 3. صفحة المشاريع `/portfolio`
- Grid مع فلاتر (كل، ويب، موبايل، AI، سحابة)
- كروت مشاريع بصور + hover overlay
- `/portfolio/$slug` — دراسة حالة تفصيلية (Challenge, Solution, Results, Gallery)

### 4. صفحة التواصل `/contact`
- Hero بسيط
- Grid: نموذج ذكي (يمين) + معلومات + خريطة (يسار)
- النموذج: Zod validation، حقول (اسم، بريد، شركة، نوع المشروع، الميزانية، رسالة)
- إرسال عبر server function يحفظ في DB (`ContactRequest` model)
- خريطة OpenStreetMap للموقع
- معلومات: هاتف، بريد، عنوان، ساعات العمل، سوشيال ميديا
- FAQ سريع

## المرحلة 2: البنية التحتية
- إضافة model `Project` و `Service` و `ContactRequest` لـ Prisma
- Seed data للخدمات والمشاريع
- Server routes للنموذج

## المرحلة 3: الرفع على سيرفرك (GitHub → Auto Deploy)

بعد إكمال الصفحات، سأجهز:
1. **GitHub Actions workflow** — يبني ويرفع تلقائياً عند push
2. **سكربت `deploy.sh`** على السيرفر — pull + rebuild + restart
3. **`docker-compose.prod.yml`** محدث مع:
   - Nginx reverse proxy
   - Let's Encrypt SSL تلقائي (Certbot)
   - Postgres مع volumes دائمة
   - Restart policies
4. **دليل خطوة بخطوة** لـ:
   - إعداد السيرفر (Ubuntu + Docker)
   - ربط GitHub Deploy Key
   - إعداد Webhook أو GitHub Actions
   - إعداد الدومين + DNS
   - أول deploy

## معلومات أحتاجها منك قبل مرحلة الرفع
- نظام السيرفر (Ubuntu 22/24؟)
- IP السيرفر أو الدومين
- هل GitHub متصل بالمشروع؟
- Postgres مثبت مسبقاً أم نستخدم Docker؟

## التنفيذ
سأبدأ الآن بالمرحلة 1 بالترتيب: Home → Services → Portfolio → Contact، ثم أخبرك حين نجهز للرفع.
