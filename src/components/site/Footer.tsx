export function Footer() {
  const cols = [
    { title: "الشركة", links: ["من نحن", "لماذا ASH", "آلية العمل", "الأسئلة الشائعة", "تواصل معنا"] },
    { title: "الخدمات", links: ["تطوير المواقع والمنصات", "تطبيقات الجوال", "الأنظمة ولوحات التحكم", "الذكاء الاصطناعي", "التصميم والهوية"] },
    { title: "الاستضافة والسيرفرات", links: ["الاستضافة المشتركة", "VPS", "السيرفرات المخصصة", "إدارة السيرفرات", "SMTP والبريد", "الحماية والمراقبة"] },
    { title: "التسويق الرقمي", links: ["SEO", "الحملات الإعلانية", "إدارة المحتوى", "الهوية البصرية", "السوشيال ميديا", "التقارير والتحليلات"] },
    { title: "الدعم", links: ["مركز المساعدة", "تواصل معنا", "حالة الخدمة", "الأدلة والوثائق"] },
    { title: "قانوني", links: ["الشروط والأحكام", "سياسة الخصوصية", "اتفاقية الاستخدام", "SLA"] },
  ];
  return (
    <footer className="bg-dark text-primary-foreground relative overflow-hidden">
      <div className="absolute inset-0 opacity-30 pointer-events-none">
        <div className="absolute -top-20 right-20 h-72 w-72 rounded-full bg-electric/30 blur-3xl" />
        <div className="absolute bottom-0 left-10 h-72 w-72 rounded-full bg-purple-accent/20 blur-3xl" />
      </div>
      <div className="relative mx-auto max-w-7xl px-4 md:px-8 pt-20 pb-8">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
          <div className="xl:col-span-2">
            <div className="flex items-center gap-2">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand shadow-glow">
                <span className="text-base font-bold">A</span>
              </div>
              <div>
                <div className="text-base font-bold">ASH HOLDING</div>
                <div className="text-[11px] text-white/60">شركة علي صالح الشهري القابضة</div>
              </div>
            </div>
            <p className="mt-4 text-sm leading-7 text-white/70">
              ASH HOLDING شركة سعودية لبناء وتشغيل الحلول الرقمية، من المواقع
              والتطبيقات إلى الأنظمة، الاستضافة، التسويق، والدعم التشغيلي.
            </p>
          </div>
          {cols.map((c) => (
            <div key={c.title}>
              <div className="mb-4 text-sm font-bold">{c.title}</div>
              <ul className="space-y-2 text-sm text-white/65">
                {c.links.map((l) => (
                  <li key={l}><a href="#" className="hover:text-white transition">{l}</a></li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-12 flex flex-col md:flex-row items-center justify-between gap-4 border-t border-white/10 pt-6 text-xs text-white/50">
          <div>© 2026 ASH HOLDING. جميع الحقوق محفوظة.</div>
          <div className="flex gap-4">
            <a href="#" className="hover:text-white">تويتر</a>
            <a href="#" className="hover:text-white">لينكدإن</a>
            <a href="#" className="hover:text-white">إنستغرام</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
