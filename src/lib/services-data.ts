import {
  Code2, Smartphone, LayoutDashboard, Brain, Palette, GraduationCap, Plug, Wrench,
  Globe, ShoppingCart, Rocket, Zap, Lock, LineChart, Users, Cloud, Database, Bell,
  Cpu, Server, MessageSquare, CreditCard, Bot, Sparkles, PenTool, MonitorSmartphone,
  BookOpen, GitBranch, Activity, Shield,
  type LucideIcon,
} from "lucide-react";

export type ServiceFeature = { icon: LucideIcon; title: string; desc: string };
export type ServiceItem = {
  slug: string;
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  gradient: string;
  tagline: string;
  description: string;
  tone: "blue" | "cyan" | "violet" | "rose" | "amber" | "indigo" | "teal" | "emerald";
  stats: { value: string; label: string }[];
  features: ServiceFeature[];
  stack: string[];
  process: { t: string; d: string }[];
};

export const SERVICES: ServiceItem[] = [
  {
    slug: "web",
    icon: Code2,
    eyebrow: "تطوير المواقع والمنصات",
    title: "منصات ويب",
    gradient: "بأداء استثنائي",
    tone: "blue",
    tagline: "مواقع تعريفية، بوابات أعمال، ومتاجر إلكترونية مخصصة.",
    description:
      "نبني منصات ويب عالية الأداء بتقنيات حديثة تجمع بين الجمال والسرعة، مع بنية قابلة للتوسع تدعم نمو أعمالك.",
    stats: [
      { value: "99.9%", label: "وقت التشغيل" },
      { value: "<1.5s", label: "زمن التحميل" },
      { value: "100/100", label: "Lighthouse" },
      { value: "SEO", label: "جاهز كاملاً" },
    ],
    features: [
      { icon: Globe, title: "مواقع تعريفية", desc: "هوية رقمية قوية تعكس احترافية شركتك." },
      { icon: ShoppingCart, title: "متاجر إلكترونية", desc: "متاجر متكاملة مع بوابات الدفع والشحن." },
      { icon: Rocket, title: "بوابات أعمال", desc: "منصات مخصصة لإدارة العملاء والمشاريع." },
      { icon: Zap, title: "أداء فائق", desc: "SSR وتحميل ذكي لتجربة سلسة." },
      { icon: Lock, title: "أمان مؤسسي", desc: "SSL، حماية DDoS، وتشفير كامل." },
      { icon: LineChart, title: "SEO متقدم", desc: "بنية معدّة لمحركات البحث من اليوم الأول." },
    ],
    stack: ["Next.js", "React", "TypeScript", "Tailwind", "Node.js", "PostgreSQL"],
    process: [
      { t: "تحليل", d: "دراسة السوق والمتطلبات." },
      { t: "تصميم", d: "UX/UI احترافي بنماذج تفاعلية." },
      { t: "تطوير", d: "برمجة نظيفة قابلة للتوسع." },
      { t: "إطلاق", d: "نشر ومراقبة ودعم." },
    ],
  },
  {
    slug: "mobile",
    icon: Smartphone,
    eyebrow: "تطبيقات الجوال",
    title: "تطبيقات جوال",
    gradient: "iOS و Android",
    tone: "cyan",
    tagline: "تطبيقات iOS و Android بتجربة استخدام متقدمة.",
    description:
      "نطور تطبيقات جوال أصلية وهجينة بأداء عالٍ وتصميم يواكب معايير Apple و Google، مع دمج كامل لخدمات الإشعارات والدفع.",
    stats: [
      { value: "iOS", label: "Swift + Flutter" },
      { value: "Android", label: "Kotlin + Flutter" },
      { value: "60fps", label: "أداء سلس" },
      { value: "4.8★", label: "تقييم المستخدمين" },
    ],
    features: [
      { icon: MonitorSmartphone, title: "Cross-Platform", desc: "قاعدة كود واحدة لجميع المنصات." },
      { icon: Bell, title: "الإشعارات الفورية", desc: "Push notifications مخصصة وذكية." },
      { icon: CreditCard, title: "المدفوعات داخل التطبيق", desc: "دمج Apple Pay و Google Pay وبوابات محلية." },
      { icon: Cloud, title: "مزامنة سحابية", desc: "تخزين وتزامن آمن للبيانات." },
      { icon: Lock, title: "بصمة ومصادقة", desc: "دخول بالوجه، البصمة، وOTP." },
      { icon: Activity, title: "تحليلات مدمجة", desc: "تتبع سلوك المستخدم وتحسين التجربة." },
    ],
    stack: ["Flutter", "React Native", "Swift", "Kotlin", "Firebase", "Node.js"],
    process: [
      { t: "استراتيجية", d: "تحديد الميزات الأساسية." },
      { t: "Prototype", d: "نموذج تفاعلي قابل للتجربة." },
      { t: "تطوير", d: "بناء وتكامل الواجهات والباك اند." },
      { t: "نشر", d: "رفع على App Store و Google Play." },
    ],
  },
  {
    slug: "systems",
    icon: LayoutDashboard,
    eyebrow: "الأنظمة ولوحات التحكم",
    title: "أنظمة إدارية",
    gradient: "ذكية ومتكاملة",
    tone: "indigo",
    tagline: "أنظمة إدارية، صلاحيات، تقارير، وفواتير.",
    description:
      "نصمم لوحات تحكم ومنصات SaaS بواجهات مبسطة تدير عمليات أعمالك من مكان واحد، مع نظام صلاحيات دقيق وتقارير حية.",
    stats: [
      { value: "RBAC", label: "صلاحيات كاملة" },
      { value: "Real-time", label: "تحديث لحظي" },
      { value: "PDF/Excel", label: "تصدير التقارير" },
      { value: "Multi-tenant", label: "متعدد المستخدمين" },
    ],
    features: [
      { icon: Users, title: "إدارة المستخدمين", desc: "أدوار، صلاحيات، ومجموعات." },
      { icon: LineChart, title: "تقارير ذكية", desc: "رسوم بيانية تفاعلية وحية." },
      { icon: CreditCard, title: "الفواتير", desc: "إصدار وأرشفة مع دعم ZATCA." },
      { icon: Database, title: "قواعد بيانات مرنة", desc: "PostgreSQL و MongoDB." },
      { icon: Bell, title: "التنبيهات", desc: "إشعارات داخل النظام وعبر البريد." },
      { icon: Shield, title: "سجل تدقيق", desc: "تتبع كامل لكل الإجراءات." },
    ],
    stack: ["React", "NestJS", "PostgreSQL", "Prisma", "Redis", "Docker"],
    process: [
      { t: "خرائط", d: "رسم بنية النظام والوحدات." },
      { t: "تصميم", d: "لوحات تحكم مبسطة." },
      { t: "بناء", d: "تطوير الوحدات بالتدريج." },
      { t: "تدريب", d: "تسليم مع تدريب الفريق." },
    ],
  },
  {
    slug: "ai",
    icon: Brain,
    eyebrow: "الذكاء الاصطناعي والأتمتة",
    title: "ذكاء اصطناعي",
    gradient: "يخدم أعمالك",
    tone: "violet",
    tagline: "حلول ذكية لتسريع التشغيل وتحسين الإنتاجية.",
    description:
      "ندمج نماذج LLM المتقدمة وحلول الأتمتة لتحويل عملياتك اليومية إلى تدفقات ذكية توفر الوقت وترفع الإنتاجية.",
    stats: [
      { value: "GPT-4o", label: "أحدث النماذج" },
      { value: "70%", label: "توفير في الوقت" },
      { value: "RAG", label: "قواعد معرفة" },
      { value: "24/7", label: "بوتات ذكية" },
    ],
    features: [
      { icon: Bot, title: "شات بوت مؤسسي", desc: "روبوت خدمة عملاء يفهم بياناتك." },
      { icon: Sparkles, title: "توليد المحتوى", desc: "نصوص، صور، وترجمات آلية." },
      { icon: GitBranch, title: "أتمتة العمليات", desc: "n8n و Zapier و Workflow مخصص." },
      { icon: Database, title: "RAG على بياناتك", desc: "بحث دلالي بمصادر موثوقة." },
      { icon: Activity, title: "تحليلات تنبؤية", desc: "توقع الطلب والسلوك." },
      { icon: MessageSquare, title: "معالجة اللغة العربية", desc: "دعم عربي احترافي." },
    ],
    stack: ["OpenAI", "LangChain", "Pinecone", "n8n", "Python", "FastAPI"],
    process: [
      { t: "اكتشاف", d: "تحديد فرص الأتمتة." },
      { t: "PoC", d: "نموذج مصغر للتحقق." },
      { t: "دمج", d: "ربط مع أنظمتك." },
      { t: "تحسين", d: "قياس وتطوير مستمر." },
    ],
  },
  {
    slug: "design",
    icon: Palette,
    eyebrow: "التصميم والهوية",
    title: "تصميم يعكس",
    gradient: "احترافية علامتك",
    tone: "rose",
    tagline: "UI/UX، هوية بصرية، وصفحات هبوط.",
    description:
      "نبني هويات بصرية استثنائية وتجارب مستخدم مدروسة، من الشعار إلى نظام تصميم كامل يمنح علامتك حضوراً لا يُنسى.",
    stats: [
      { value: "UX", label: "بأبحاث حقيقية" },
      { value: "Design", label: "System كامل" },
      { value: "A11y", label: "متوافق WCAG" },
      { value: "RTL", label: "دعم عربي كامل" },
    ],
    features: [
      { icon: PenTool, title: "هوية بصرية", desc: "شعار، ألوان، خطوط، ودليل استخدام." },
      { icon: Sparkles, title: "UI/UX Design", desc: "واجهات جميلة وسهلة الاستخدام." },
      { icon: Rocket, title: "صفحات هبوط", desc: "مصممة للتحويل وقياس النتائج." },
      { icon: MonitorSmartphone, title: "تصميم متجاوب", desc: "يعمل على جميع الشاشات." },
      { icon: BookOpen, title: "دليل الهوية", desc: "Brand book احترافي كامل." },
      { icon: Users, title: "أبحاث المستخدم", desc: "شخصيات، مقابلات، واختبارات." },
    ],
    stack: ["Figma", "Adobe CC", "Framer", "Principle", "Lottie", "Rive"],
    process: [
      { t: "بحث", d: "دراسة السوق والمنافسين." },
      { t: "مفهوم", d: "توجهات إبداعية." },
      { t: "تنفيذ", d: "تصاميم كاملة." },
      { t: "تسليم", d: "ملفات مصدرية ودليل." },
    ],
  },
  {
    slug: "education",
    icon: GraduationCap,
    eyebrow: "خدمات الطلاب والأعمال",
    title: "حلول تعليمية",
    gradient: "ورقمية مخصصة",
    tone: "amber",
    tagline: "حلول تعليمية وخدمات رقمية مخصصة.",
    description:
      "نساعد الطلاب ورواد الأعمال على تحويل أفكارهم إلى مشاريع رقمية ناجحة، بدعم فني كامل وأسعار مناسبة.",
    stats: [
      { value: "+500", label: "مشروع طلابي" },
      { value: "24h", label: "استجابة سريعة" },
      { value: "MVP", label: "بأسعار خاصة" },
      { value: "دعم", label: "طوال المشروع" },
    ],
    features: [
      { icon: BookOpen, title: "مشاريع التخرج", desc: "دعم كامل من الفكرة للتسليم." },
      { icon: Rocket, title: "MVP للشركات الناشئة", desc: "منتج أولي جاهز للسوق." },
      { icon: Users, title: "ورش تدريبية", desc: "برمجة، تصميم، وإدارة مشاريع." },
      { icon: PenTool, title: "أبحاث علمية", desc: "تنسيق ومساعدة أكاديمية." },
      { icon: MessageSquare, title: "استشارات تقنية", desc: "توجيه من خبراء الصناعة." },
      { icon: GitBranch, title: "توثيق فني", desc: "SRS و UML ومخططات كاملة." },
    ],
    stack: ["React", "Python", "Java", "Flutter", "SQL", "LaTeX"],
    process: [
      { t: "استماع", d: "فهم متطلباتك." },
      { t: "خطة", d: "جدول زمني وميزانية." },
      { t: "تنفيذ", d: "مع متابعة دورية." },
      { t: "تسليم", d: "مع توثيق كامل." },
    ],
  },
  {
    slug: "integrations",
    icon: Plug,
    eyebrow: "التكاملات البرمجية",
    title: "تكاملات API",
    gradient: "بلا حدود",
    tone: "teal",
    tagline: "ربط API، بوابات دفع، SMS، بريد، وأنظمة خارجية.",
    description:
      "نربط أنظمتك مع أي خدمة خارجية، من بوابات الدفع إلى منصات الشحن والـ CRM، بتكاملات موثوقة ومراقبة مستمرة.",
    stats: [
      { value: "+100", label: "تكامل جاهز" },
      { value: "REST", label: "و GraphQL و gRPC" },
      { value: "Webhooks", label: "في الوقت الحقيقي" },
      { value: "OAuth 2", label: "أمان معتمد" },
    ],
    features: [
      { icon: CreditCard, title: "بوابات الدفع", desc: "STC Pay، مدى، Apple Pay، PayPal." },
      { icon: MessageSquare, title: "SMS وواتساب", desc: "Twilio، Unifonic، WhatsApp API." },
      { icon: Cloud, title: "خدمات سحابية", desc: "AWS، Azure، Google Cloud." },
      { icon: GitBranch, title: "CRM و ERP", desc: "Salesforce، HubSpot، Odoo، Zoho." },
      { icon: Bell, title: "الإشعارات", desc: "بريد، Push، Slack، Discord." },
      { icon: Shield, title: "SSO ومصادقة", desc: "SAML، LDAP، Azure AD." },
    ],
    stack: ["Node.js", "Python", "Postman", "Stripe", "Twilio", "AWS"],
    process: [
      { t: "تحليل", d: "دراسة الأنظمة الحالية." },
      { t: "تصميم", d: "مخطط التكامل." },
      { t: "ربط", d: "تنفيذ واختبار." },
      { t: "مراقبة", d: "تنبيهات ولوحات." },
    ],
  },
  {
    slug: "support-ops",
    icon: Wrench,
    eyebrow: "الدعم والتشغيل",
    title: "دعم وتشغيل",
    gradient: "على مدار الساعة",
    tone: "emerald",
    tagline: "صيانة، تحديثات، مراقبة، وتحسين مستمر.",
    description:
      "نضمن استمرارية أنظمتك بأعلى كفاءة، من خلال فريق دعم متخصص يعمل 24/7 مع مراقبة حية وخطط SLA واضحة.",
    stats: [
      { value: "24/7", label: "دعم متواصل" },
      { value: "SLA", label: "متعددة المستويات" },
      { value: "<15m", label: "زمن الاستجابة" },
      { value: "99.99%", label: "توفر الخدمة" },
    ],
    features: [
      { icon: Activity, title: "مراقبة حية", desc: "Uptime، أداء، وأخطاء لحظية." },
      { icon: Shield, title: "أمان مستمر", desc: "فحص ثغرات وترقيعات دورية." },
      { icon: Server, title: "إدارة السيرفرات", desc: "Linux، Nginx، Docker، K8s." },
      { icon: Database, title: "نسخ احتياطية", desc: "يومية، مشفرة، متعددة المواقع." },
      { icon: Cpu, title: "تحسين الأداء", desc: "Caching، CDN، Query optimization." },
      { icon: Bell, title: "تنبيهات ذكية", desc: "Slack، بريد، SMS، Discord." },
    ],
    stack: ["Datadog", "Grafana", "Sentry", "PagerDuty", "Docker", "K8s"],
    process: [
      { t: "تدقيق", d: "تقييم البنية الحالية." },
      { t: "إعداد", d: "أدوات المراقبة والنسخ." },
      { t: "تشغيل", d: "دعم يومي مستمر." },
      { t: "تحسين", d: "تقارير شهرية." },
    ],
  },
];

export const SERVICE_MAP: Record<string, ServiceItem> = Object.fromEntries(
  SERVICES.map((s) => [s.slug, s])
);
