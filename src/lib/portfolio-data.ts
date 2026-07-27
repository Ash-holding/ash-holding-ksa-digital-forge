import type { LucideIcon } from "lucide-react";
import {
  ShoppingBag, Building2, GraduationCap, Stethoscope, Plane, Landmark,
  Truck, UtensilsCrossed,
} from "lucide-react";

export type ProjectCategory = "web" | "mobile" | "ai" | "cloud" | "systems";

export type Project = {
  slug: string;
  title: string;
  client: string;
  category: ProjectCategory;
  year: string;
  tagline: string;
  cover: string; // gradient class
  icon: LucideIcon;
  tone: "blue" | "cyan" | "violet" | "rose" | "amber" | "indigo" | "teal" | "emerald";
  summary: string;
  challenge: string;
  solution: string;
  results: { value: string; label: string }[];
  stack: string[];
  duration: string;
  scope: string[];
};

export const CATEGORIES: { id: ProjectCategory | "all"; label: string }[] = [
  { id: "all", label: "الكل" },
  { id: "web", label: "منصات ويب" },
  { id: "mobile", label: "تطبيقات جوال" },
  { id: "systems", label: "أنظمة إدارية" },
  { id: "ai", label: "ذكاء اصطناعي" },
  { id: "cloud", label: "حلول سحابية" },
];

export const PROJECTS: Project[] = [
  {
    slug: "noor-mart",
    title: "متجر نور الإلكتروني",
    client: "شركة نور للتجارة",
    category: "web",
    year: "2025",
    tagline: "منصة تجارة متكاملة بأكثر من 12 ألف منتج",
    cover: "from-blue-500/40 via-cyan-500/20 to-transparent",
    icon: ShoppingBag,
    tone: "blue",
    summary: "بناء متجر إلكتروني متكامل مع لوحة تحكم متقدمة، بوابات دفع محلية، وربط شركات الشحن.",
    challenge: "احتاج العميل لنقل متجر تقليدي بـ12,000 منتج إلى منصة رقمية بسرعة تحميل تحت الثانية ودعم 10 آلاف زائر متزامن.",
    solution: "طوّرنا المتجر باستخدام Next.js مع SSR، كاش على مستوى الحافة، وقاعدة بيانات PostgreSQL محسّنة، مع لوحة إدارة كاملة للطلبات والمخزون.",
    results: [
      { value: "+340%", label: "نمو المبيعات" },
      { value: "0.8s", label: "زمن التحميل" },
      { value: "99.99%", label: "وقت التشغيل" },
      { value: "4.9★", label: "تقييم العملاء" },
    ],
    stack: ["Next.js", "PostgreSQL", "Redis", "Stripe", "Mada", "Cloudflare"],
    duration: "4 أشهر",
    scope: ["UX/UI", "Backend", "Payments", "SEO", "Analytics"],
  },
  {
    slug: "elite-realestate",
    title: "منصة إيليت العقارية",
    client: "إيليت العقارية",
    category: "web",
    year: "2025",
    tagline: "بوابة عقارية بخرائط تفاعلية وبحث ذكي",
    cover: "from-indigo-500/40 via-violet-500/20 to-transparent",
    icon: Building2,
    tone: "indigo",
    summary: "منصة عقارية شاملة تربط الملاك والوسطاء والمشترين، مع بحث بالخريطة وجولات افتراضية 360.",
    challenge: "توحيد أكثر من 8,000 عقار من مصادر مختلفة مع بحث دقيق وعرض على الخريطة.",
    solution: "بناء نظام ETL لجمع البيانات، فهرسة عبر Elasticsearch، وواجهة تعرض العقارات على Mapbox مع فلاتر متقدمة.",
    results: [
      { value: "8,000+", label: "عقار مفهرس" },
      { value: "45K", label: "مستخدم شهري" },
      { value: "-60%", label: "وقت البحث" },
      { value: "12", label: "مدينة مغطاة" },
    ],
    stack: ["React", "Node.js", "Elasticsearch", "Mapbox", "AWS"],
    duration: "6 أشهر",
    scope: ["Web App", "Data Pipeline", "Maps", "Search"],
  },
  {
    slug: "tallab-app",
    title: "تطبيق طلاّب",
    client: "أكاديمية المستقبل",
    category: "mobile",
    year: "2024",
    tagline: "تطبيق تعليمي بأكثر من 200 ألف طالب",
    cover: "from-cyan-500/40 via-teal-500/20 to-transparent",
    icon: GraduationCap,
    tone: "cyan",
    summary: "تطبيق iOS و Android للتعلم عن بُعد مع فصول مباشرة، اختبارات، وتتبع تقدّم.",
    challenge: "بناء تجربة تعليمية سلسة تعمل على شبكات ضعيفة، مع بث مباشر منخفض الكمون.",
    solution: "Flutter لقاعدة كود موحدة، WebRTC للفصول، تخزين محلي ذكي، وSync خلفي عند توفر الاتصال.",
    results: [
      { value: "200K+", label: "طالب نشط" },
      { value: "4.8★", label: "App Store" },
      { value: "18 min", label: "متوسط الجلسة" },
      { value: "-45%", label: "معدل التسرب" },
    ],
    stack: ["Flutter", "WebRTC", "Firebase", "Node.js"],
    duration: "5 أشهر",
    scope: ["iOS", "Android", "Live Streaming", "Offline"],
  },
  {
    slug: "sehha-clinic",
    title: "نظام صحّة للعيادات",
    client: "مجموعة صحّة الطبية",
    category: "systems",
    year: "2025",
    tagline: "نظام إدارة طبي شامل لـ24 عيادة",
    cover: "from-emerald-500/40 via-teal-500/20 to-transparent",
    icon: Stethoscope,
    tone: "emerald",
    summary: "نظام EMR كامل لإدارة المرضى، المواعيد، الوصفات، والفواتير مع تكامل التأمين.",
    challenge: "توحيد سجلات المرضى بين 24 فرعاً مع الامتثال لمعايير حماية البيانات الصحية.",
    solution: "بنية Multi-tenant، تشفير عند التخزين وفي النقل، تكامل مع شركات التأمين، وتطبيق للأطباء.",
    results: [
      { value: "24", label: "فرع مربوط" },
      { value: "180K", label: "سجل مريض" },
      { value: "-70%", label: "وقت الحجز" },
      { value: "HIPAA", label: "متوافق" },
    ],
    stack: ["React", "NestJS", "PostgreSQL", "Docker", "Kubernetes"],
    duration: "8 أشهر",
    scope: ["EMR", "Billing", "Insurance", "Mobile"],
  },
  {
    slug: "safar-ai",
    title: "سفر AI - مساعد الرحلات",
    client: "منصة سفر",
    category: "ai",
    year: "2025",
    tagline: "مساعد ذكي يخطط رحلتك في 60 ثانية",
    cover: "from-violet-500/40 via-purple-500/20 to-transparent",
    icon: Plane,
    tone: "violet",
    summary: "مساعد ذكاء اصطناعي يقترح وجهات، يحجز فنادق، ويرتب جدول رحلات حسب ميزانية المستخدم.",
    challenge: "بناء تجربة محادثة طبيعية بالعربية تفهم النية وتنفّذ الحجوزات مباشرة.",
    solution: "دمج GPT-4 مع RAG على قاعدة بيانات الفنادق، Function calling لواجهات الحجز، وذاكرة سياق طويلة.",
    results: [
      { value: "60s", label: "لتخطيط رحلة" },
      { value: "+220%", label: "معدل التحويل" },
      { value: "12", label: "لغة مدعومة" },
      { value: "94%", label: "دقة الاقتراح" },
    ],
    stack: ["GPT-4", "Python", "Pinecone", "FastAPI", "React"],
    duration: "3 أشهر",
    scope: ["AI/ML", "RAG", "Voice", "Booking"],
  },
  {
    slug: "bank-cloud",
    title: "بنية سحابية لبنك رقمي",
    client: "بنك رقمي إقليمي",
    category: "cloud",
    year: "2024",
    tagline: "بنية تحتية سحابية لـ2 مليون عميل",
    cover: "from-rose-500/40 via-pink-500/20 to-transparent",
    icon: Landmark,
    tone: "rose",
    summary: "تصميم وتنفيذ بنية سحابية متعددة المناطق مع أمان مصرفي وقابلية توسع تلقائي.",
    challenge: "دعم 2 مليون عميل مع كمون أقل من 100ms والامتثال لمعايير SAMA و PCI DSS.",
    solution: "AWS multi-region، Kubernetes، Service mesh، تشفير كامل، ومراقبة 24/7 مع SIEM.",
    results: [
      { value: "2M+", label: "عميل نشط" },
      { value: "<80ms", label: "كمون متوسط" },
      { value: "99.999%", label: "SLA" },
      { value: "PCI DSS", label: "معتمد" },
    ],
    stack: ["AWS", "Kubernetes", "Istio", "Terraform", "Datadog"],
    duration: "12 شهر",
    scope: ["Cloud Arch", "DevOps", "Security", "Monitoring"],
  },
  {
    slug: "logistic-track",
    title: "منصة تتبع الشحنات",
    client: "شركة لوجستيات كبرى",
    category: "systems",
    year: "2024",
    tagline: "تتبع لحظي لـ50 ألف شحنة يومياً",
    cover: "from-amber-500/40 via-orange-500/20 to-transparent",
    icon: Truck,
    tone: "amber",
    summary: "منصة تتبع لوجستي بالوقت الفعلي مع تحسين مسارات وإشعارات ذكية للعملاء.",
    challenge: "تتبع 3,000 مركبة و50 ألف شحنة يومياً مع تحسين المسارات في الوقت الفعلي.",
    solution: "WebSocket للتتبع اللحظي، خوارزميات تحسين مسارات، Kafka للأحداث، وتطبيق للسائقين.",
    results: [
      { value: "50K", label: "شحنة يومياً" },
      { value: "-32%", label: "تكلفة الوقود" },
      { value: "+28%", label: "الإنتاجية" },
      { value: "98%", label: "التسليم في الوقت" },
    ],
    stack: ["Node.js", "Kafka", "MongoDB", "React", "React Native"],
    duration: "7 أشهر",
    scope: ["Real-time", "Routing", "Mobile", "Dashboard"],
  },
  {
    slug: "shahiya-app",
    title: "شهيّة - تطبيق المطاعم",
    client: "سلسلة مطاعم",
    category: "mobile",
    year: "2025",
    tagline: "طلب وتوصيل لأكثر من 120 فرعاً",
    cover: "from-teal-500/40 via-emerald-500/20 to-transparent",
    icon: UtensilsCrossed,
    tone: "teal",
    summary: "تطبيق طلبات ذكي مع نظام ولاء، دفع سريع، وتتبع مباشر للطلب.",
    challenge: "توحيد تجربة الطلب عبر 120 فرعاً مع أوقات تحضير مختلفة وقوائم متغيرة.",
    solution: "React Native، نظام POS مربوط لحظياً، Loyalty engine، وخريطة تتبع مباشرة.",
    results: [
      { value: "1.2M", label: "تحميل" },
      { value: "120", label: "فرع نشط" },
      { value: "+180%", label: "طلبات التطبيق" },
      { value: "22 min", label: "متوسط التوصيل" },
    ],
    stack: ["React Native", "Node.js", "PostgreSQL", "Firebase"],
    duration: "5 أشهر",
    scope: ["Mobile", "POS Integration", "Loyalty", "Delivery"],
  },
];

export const TONE_MAP: Record<string, { bg: string; text: string; border: string }> = {
  blue: { bg: "bg-blue-500/10", text: "text-blue-500", border: "border-blue-500/30" },
  cyan: { bg: "bg-cyan-500/10", text: "text-cyan-500", border: "border-cyan-500/30" },
  violet: { bg: "bg-violet-500/10", text: "text-violet-500", border: "border-violet-500/30" },
  rose: { bg: "bg-rose-500/10", text: "text-rose-500", border: "border-rose-500/30" },
  amber: { bg: "bg-amber-500/10", text: "text-amber-500", border: "border-amber-500/30" },
  indigo: { bg: "bg-indigo-500/10", text: "text-indigo-500", border: "border-indigo-500/30" },
  teal: { bg: "bg-teal-500/10", text: "text-teal-500", border: "border-teal-500/30" },
  emerald: { bg: "bg-emerald-500/10", text: "text-emerald-500", border: "border-emerald-500/30" },
};
