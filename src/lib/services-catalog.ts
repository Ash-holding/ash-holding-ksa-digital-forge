import {
  Code2, Smartphone, Globe, ShoppingCart, Server, HardDrive, Cloud, Database,
  Megaphone, Search, Target, TrendingUp, Palette, PenTool, Layers, Sparkles,
  Zap, Shield, Rocket, Cpu, Boxes, GitBranch, Terminal, Bot, Brain, LineChart,
  Mail, MessageSquare, Share2, Video, Camera, Image as ImageIcon, Type,
  FileText, Presentation, Aperture, Wand2, Users, MonitorSmartphone, Lock,
  Network, Gauge, Workflow, KeyRound, ServerCog, CloudCog, Radio, Fingerprint,
  BarChart3, PieChart, Repeat, Send, Youtube, Instagram, Building2, Store,
  type LucideIcon,
} from "lucide-react";

export type CatalogItem = {
  icon: LucideIcon;
  title: string;
  desc: string;
  itemKey: string;
  highlights?: string[];
  from?: string;
};

export type CatalogCategory = {
  key: string;
  eyebrow: string;
  title: string;
  tagline: string;
  intro: string;
  gradient: string;
  ring: string;
  glow: string;
  accent: string;
  icon: LucideIcon;
  items: CatalogItem[];
  metrics: { value: string; label: string }[];
};

export const CATALOG: CatalogCategory[] = [
  {
    key: "dev",
    eyebrow: "Engineering",
    title: "البرمجة والتطوير",
    tagline: "منصات ويب وتطبيقات جوال بأداء استثنائي وبنية قابلة للتوسع.",
    intro: "فريق هندسي متكامل يبني منتجات رقمية أصيلة — من الواجهات الفائقة السرعة إلى الأنظمة الخلفية الموثوقة وأتمتة الذكاء الاصطناعي — بمعايير عالمية وممارسات DevOps حديثة.",
    gradient: "from-sky-500 via-blue-500 to-indigo-600",
    ring: "ring-sky-500/30",
    glow: "shadow-[0_30px_80px_-30px_rgba(56,189,248,0.55)]",
    accent: "text-sky-400",
    icon: Code2,
    metrics: [
      { value: "99.9%", label: "وقت التشغيل" },
      { value: "<1.5s", label: "زمن الاستجابة" },
      { value: "100", label: "Lighthouse" },
    ],
    items: [
      { icon: Globe, title: "مواقع مؤسسية", desc: "واجهات SSR فائقة السرعة", itemKey: "website", highlights: ["SEO تقني", "أداء 100/100", "لوحة تحكم"], from: "من 4,900 ر.س" },
      { icon: Store, title: "صفحات هبوط تحويلية", desc: "Landing Pages بمعدلات تحويل عالية", itemKey: "landing", highlights: ["A/B Testing", "Pixel + GA4"], from: "من 1,900 ر.س" },
      { icon: Smartphone, title: "تطبيقات iOS / Android", desc: "تجربة أصيلة عبر React Native", itemKey: "mobile", highlights: ["iOS + Android", "Push Notifications"], from: "من 18,000 ر.س" },
      { icon: MonitorSmartphone, title: "تطبيقات ويب PWA", desc: "تعمل أوفلاين وتُثبَّت كتطبيق", itemKey: "pwa", highlights: ["Offline First", "قابلة للتثبيت"], from: "من 7,500 ر.س" },
      { icon: ShoppingCart, title: "متاجر إلكترونية", desc: "مدفوعات محلية وتكامل شحن", itemKey: "store", highlights: ["مدى/Apple Pay", "تكامل شحن"], from: "من 9,900 ر.س" },
      { icon: Code2, title: "APIs مخصصة", desc: "REST / GraphQL موثّقة بالكامل", itemKey: "api", highlights: ["OpenAPI", "Rate Limiting"], from: "من 6,500 ر.س" },
      { icon: Database, title: "قواعد بيانات وتحسينها", desc: "PostgreSQL / MySQL / Mongo", itemKey: "database", highlights: ["Indexing", "Replication"], from: "من 3,500 ر.س" },
      { icon: Brain, title: "حلول الذكاء الاصطناعي", desc: "LLM Chatbots وتوصية ذكية", itemKey: "ai", highlights: ["OpenAI/Gemini", "RAG جاهز"], from: "من 8,900 ر.س" },
      { icon: Bot, title: "بوتات واتساب وتليجرام", desc: "أتمتة محادثات ومبيعات", itemKey: "bot", highlights: ["WhatsApp Cloud", "Telegram Bot"], from: "من 2,900 ر.س" },
      { icon: Workflow, title: "أتمتة سير العمل", desc: "n8n / Zapier / Make", itemKey: "automation", highlights: ["500+ تكامل"], from: "من 2,500 ر.س" },
      { icon: Cpu, title: "أنظمة SaaS متعددة المستأجرين", desc: "Multi-tenant بمعزل بيانات كامل", itemKey: "saas", highlights: ["Billing جاهز"], from: "من 24,000 ر.س" },
      { icon: Boxes, title: "Microservices", desc: "معمارية خدمات مصغّرة", itemKey: "microservices", highlights: ["Docker + K8s"], from: "من 15,000 ر.س" },
      { icon: GitBranch, title: "CI/CD ونشر آلي", desc: "GitHub Actions + Deployments", itemKey: "cicd", highlights: ["Zero Downtime"], from: "من 2,200 ر.س" },
      { icon: Terminal, title: "مراجعة كود وتدقيق تقني", desc: "Code Review + Audit", itemKey: "review", highlights: ["تقرير احترافي"], from: "من 1,500 ر.س" },
      { icon: Rocket, title: "منتج MVP كامل", desc: "من الفكرة إلى الإطلاق في 6-8 أسابيع", itemKey: "mvp", highlights: ["Full-Stack", "بنية قابلة للتوسع"], from: "من 29,900 ر.س" },
    ],
  },
  {
    key: "systems",
    eyebrow: "Infrastructure",
    title: "الأنظمة والبنية التحتية",
    tagline: "أنظمة إدارية سحابية، خوادم مخصصة، وحلول تشغيل مؤسسية.",
    intro: "منظومة تشغيل مؤسسية متكاملة — من ERP وCRM إلى الاستضافة السحابية والحماية السيبرانية — مع مراقبة 24/7 واتفاقيات مستوى خدمة موثّقة.",
    gradient: "from-emerald-500 via-teal-500 to-cyan-600",
    ring: "ring-emerald-500/30",
    glow: "shadow-[0_30px_80px_-30px_rgba(16,185,129,0.55)]",
    accent: "text-emerald-400",
    icon: Server,
    metrics: [
      { value: "24/7", label: "مراقبة" },
      { value: "SLA", label: "99.95%" },
      { value: "ISO", label: "معايير" },
    ],
    items: [
      { icon: Database, title: "أنظمة ERP", desc: "تخطيط موارد المؤسسة كاملاً", itemKey: "erp", highlights: ["محاسبة + مخازن", "تقارير لحظية"], from: "من 24,000 ر.س" },
      { icon: Users, title: "أنظمة CRM", desc: "إدارة علاقات العملاء", itemKey: "crm", highlights: ["Pipeline مبيعات"], from: "من 12,000 ر.س" },
      { icon: Building2, title: "أنظمة إدارة الموارد البشرية", desc: "HRMS + حضور + رواتب", itemKey: "hrms", highlights: ["GOSI + مدد"], from: "من 9,900 ر.س" },
      { icon: Cloud, title: "استضافة سحابية مُدارة", desc: "AWS / Azure / GCP", itemKey: "hosting", highlights: ["Auto Scaling"], from: "من 490 ر.س/شهر" },
      { icon: HardDrive, title: "سيرفرات VPS ومخصصة", desc: "أداء عالي وحماية متقدمة", itemKey: "vps", highlights: ["NVMe + DDoS"], from: "من 190 ر.س/شهر" },
      { icon: ServerCog, title: "إدارة خوادم Linux/Windows", desc: "Server Administration", itemKey: "sysadmin", highlights: ["24/7 مراقبة"], from: "من 950 ر.س/شهر" },
      { icon: CloudCog, title: "هجرة سحابية", desc: "نقل بنيتك للسحابة بأمان", itemKey: "migration", highlights: ["صفر توقف"], from: "من 6,900 ر.س" },
      { icon: Shield, title: "جدران نارية WAF", desc: "حماية طبقة التطبيق", itemKey: "waf", highlights: ["OWASP Top 10"], from: "من 2,400 ر.س" },
      { icon: Lock, title: "شهادات SSL وتشفير", desc: "SSL A+ ووايلد كارد", itemKey: "ssl", highlights: ["HSTS + TLS 1.3"], from: "من 490 ر.س" },
      { icon: Fingerprint, title: "اختبار اختراق Pen-Test", desc: "تدقيق أمني شامل", itemKey: "pentest", highlights: ["تقرير معتمد"], from: "من 8,900 ر.س" },
      { icon: KeyRound, title: "SSO وإدارة الهويات", desc: "Okta / Azure AD / Keycloak", itemKey: "sso", highlights: ["SAML + OIDC"], from: "من 5,500 ر.س" },
      { icon: Network, title: "شبكات وربط فروع VPN", desc: "Site-to-Site VPN", itemKey: "network", highlights: ["MPLS بديل"], from: "من 3,900 ر.س" },
      { icon: Gauge, title: "مراقبة وأداء Observability", desc: "Grafana + Prometheus", itemKey: "monitoring", highlights: ["تنبيهات فورية"], from: "من 2,900 ر.س" },
      { icon: Repeat, title: "نسخ احتياطية واسترجاع كوارث", desc: "Backup + DR Plan", itemKey: "backup", highlights: ["RPO ≤ 15 دقيقة"], from: "من 1,900 ر.س" },
      { icon: Boxes, title: "حاويات Docker وKubernetes", desc: "Container Orchestration", itemKey: "k8s", highlights: ["Helm + Istio"], from: "من 7,900 ر.س" },
    ],
  },
  {
    key: "marketing",
    eyebrow: "Growth",
    title: "التسويق الرقمي",
    tagline: "حملات مدفوعة، سيو، وأتمتة نمو تدفع أعمالك للأمام بأرقام قابلة للقياس.",
    intro: "فريق نمو أداء يعمل على قمع تحويل متكامل — من الاستهداف الدقيق والإعلانات المدفوعة إلى السيو التقني والأتمتة التسويقية — مع تقارير أسبوعية وقياس ROAS شفاف.",
    gradient: "from-rose-500 via-pink-500 to-fuchsia-600",
    ring: "ring-rose-500/30",
    glow: "shadow-[0_30px_80px_-30px_rgba(244,63,94,0.55)]",
    accent: "text-rose-400",
    icon: Megaphone,
    metrics: [
      { value: "×4.2", label: "متوسط ROAS" },
      { value: "+180%", label: "نمو عضوي" },
      { value: "A/B", label: "اختبارات مستمرة" },
    ],
    items: [
      { icon: Target, title: "إعلانات Google Ads", desc: "Search / Display / YouTube", itemKey: "google-ads", highlights: ["إدارة كاملة"], from: "من 2,900 ر.س/شهر" },
      { icon: Instagram, title: "إعلانات Meta (Facebook + IG)", desc: "استهداف دقيق وROAS مرتفع", itemKey: "meta-ads", highlights: ["Pixel + CAPI"], from: "من 2,900 ر.س/شهر" },
      { icon: Video, title: "إعلانات TikTok وSnapchat", desc: "محتوى فيديو تفاعلي", itemKey: "tiktok-ads", highlights: ["Spark Ads"], from: "من 2,400 ر.س/شهر" },
      { icon: Search, title: "SEO تقني وشامل", desc: "تحسين محركات البحث", itemKey: "seo", highlights: ["Core Web Vitals"], from: "من 3,900 ر.س/شهر" },
      { icon: FileText, title: "SEO محلي (خرائط Google)", desc: "Local SEO + GBP", itemKey: "local-seo", highlights: ["Google Business"], from: "من 1,500 ر.س/شهر" },
      { icon: Mail, title: "التسويق بالبريد", desc: "Email Marketing احترافي", itemKey: "email", highlights: ["Mailchimp/Klaviyo"], from: "من 1,900 ر.س/شهر" },
      { icon: MessageSquare, title: "تسويق واتساب المؤسسي", desc: "WhatsApp Business API", itemKey: "wa-marketing", highlights: ["قوالب معتمدة"], from: "من 1,200 ر.س/شهر" },
      { icon: Send, title: "أتمتة تسويقية Marketing Automation", desc: "HubSpot / ActiveCampaign", itemKey: "mkt-automation", highlights: ["Lead Scoring"], from: "من 3,500 ر.س/شهر" },
      { icon: Share2, title: "إدارة سوشيال ميديا", desc: "محتوى وتفاعل يومي", itemKey: "social", highlights: ["4 منصات"], from: "من 2,400 ر.س/شهر" },
      { icon: Sparkles, title: "استراتيجية محتوى", desc: "خطة تحريرية شهرية", itemKey: "content-strategy", highlights: ["Calendar"], from: "من 1,800 ر.س/شهر" },
      { icon: Users, title: "تسويق المؤثرين", desc: "Influencer Marketing", itemKey: "influencer", highlights: ["اختيار + تفعيل"], from: "من 4,900 ر.س" },
      { icon: LineChart, title: "تحليلات وGA4/Tag Manager", desc: "إعداد قياس متقدم", itemKey: "analytics", highlights: ["Server-Side GTM"], from: "من 2,200 ر.س" },
      { icon: BarChart3, title: "لوحات تحكم BI", desc: "Looker Studio + Metabase", itemKey: "bi", highlights: ["تقارير لحظية"], from: "من 3,200 ر.س" },
      { icon: TrendingUp, title: "استراتيجية نمو Growth", desc: "قمع تحويل متكامل", itemKey: "growth", highlights: ["AARRR"], from: "من 5,900 ر.س" },
      { icon: PieChart, title: "تحسين معدلات التحويل CRO", desc: "A/B Testing احترافي", itemKey: "cro", highlights: ["Hotjar + Test"], from: "من 3,900 ر.س/شهر" },
    ],
  },
  {
    key: "design",
    eyebrow: "Design Studio",
    title: "التصميم والهوية",
    tagline: "هويات بصرية، تصميم واجهات UX/UI، ومحتوى إبداعي بمعايير عالمية.",
    intro: "استوديو تصميم يجمع بين حرفية العلامة التجارية وأبحاث تجربة المستخدم — نبني هويات، واجهات، ومحتوى بصري بلغة عالمية ومعايير Awwwards.",
    gradient: "from-violet-500 via-purple-500 to-fuchsia-600",
    ring: "ring-violet-500/30",
    glow: "shadow-[0_30px_80px_-30px_rgba(139,92,246,0.55)]",
    accent: "text-violet-400",
    icon: Palette,
    metrics: [
      { value: "Awwwards", label: "معايير" },
      { value: "4K", label: "تسليمات" },
      { value: "RTL", label: "متكامل" },
    ],
    items: [
      { icon: PenTool, title: "الهوية البصرية الكاملة", desc: "شعار ودليل علامة", itemKey: "brand", highlights: ["Brand Book"], from: "من 3,900 ر.س" },
      { icon: Type, title: "إعادة تصميم الشعار", desc: "Logo Redesign", itemKey: "logo", highlights: ["3 اتجاهات"], from: "من 1,500 ر.س" },
      { icon: Layers, title: "تصميم UX/UI للتطبيقات", desc: "تجارب سلسة تركز على المستخدم", itemKey: "uiux", highlights: ["Figma + Prototype"], from: "من 6,900 ر.س" },
      { icon: MonitorSmartphone, title: "تصميم UX/UI للويب", desc: "Design System + Pages", itemKey: "web-ui", highlights: ["Design Tokens"], from: "من 4,900 ر.س" },
      { icon: Wand2, title: "أبحاث المستخدم", desc: "User Research + Personas", itemKey: "ux-research", highlights: ["Interviews"], from: "من 3,200 ر.س" },
      { icon: Sparkles, title: "موشن جرافيك 2D", desc: "فيديوهات ترويجية متحركة", itemKey: "motion-2d", highlights: ["حتى 60 ثانية"], from: "من 2,400 ر.س" },
      { icon: Aperture, title: "موشن جرافيك 3D", desc: "Blender / Cinema 4D", itemKey: "motion-3d", highlights: ["Photorealistic"], from: "من 4,900 ر.س" },
      { icon: Video, title: "مونتاج فيديو احترافي", desc: "Video Editing", itemKey: "video", highlights: ["4K + Sound"], from: "من 990 ر.س" },
      { icon: Camera, title: "تصوير منتجات", desc: "Product Photography", itemKey: "product-photo", highlights: ["استوديو مجهّز"], from: "من 1,500 ر.س" },
      { icon: ImageIcon, title: "محتوى سوشيال إبداعي", desc: "منشورات وريلز شهرية", itemKey: "social-content", highlights: ["30 قطعة/شهر"], from: "من 2,400 ر.س/شهر" },
      { icon: FileText, title: "ملفات تعريفية Company Profile", desc: "بروفايل شركة فاخر", itemKey: "profile", highlights: ["PDF + مطبوع"], from: "من 1,900 ر.س" },
      { icon: Presentation, title: "عروض تقديمية Pitch Deck", desc: "Investor / Sales Decks", itemKey: "pitch", highlights: ["PowerPoint/Keynote"], from: "من 1,500 ر.س" },
      { icon: Palette, title: "تصميم مطبوعات", desc: "بروشور، كتيب، مطويّة", itemKey: "print", highlights: ["جاهزة للطباعة"], from: "من 890 ر.س" },
      { icon: Youtube, title: "إعلانات فيديو قصيرة", desc: "Reels / TikTok Ads", itemKey: "short-ads", highlights: ["Hook + CTA"], from: "من 1,200 ر.س" },
      { icon: Sparkles, title: "رسوم توضيحية Illustrations", desc: "رسومات مخصصة", itemKey: "illustration", highlights: ["أسلوب حصري"], from: "من 1,400 ر.س" },
    ],
  },
];

export function getCatalogCategory(key: string) {
  return CATALOG.find((c) => c.key === key);
}
