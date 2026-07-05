import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { PageShell, PageHero } from "@/components/site/PageShell";
import { Mail, Phone, MapPin, Send, MessageSquare, Clock } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/contact")({
  component: ContactPage,
  head: () => ({
    meta: [
      { title: "تواصل معنا | ASH HOLDING" },
      { name: "description", content: "ابدأ مشروعك أو اطلب استشارة مجانية مع فريق ASH HOLDING." },
    ],
  }),
});

function ContactVisual() {
  return (
    <div className="relative h-[420px] w-full grid place-items-center">
      <motion.div
        animate={{ scale: [1, 1.2, 1] }}
        transition={{ duration: 3, repeat: Infinity }}
        className="absolute h-72 w-72 rounded-full bg-electric/10 blur-3xl"
      />
      {/* radiating rings */}
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="absolute rounded-full border-2 border-electric/30"
          initial={{ width: 100, height: 100, opacity: 1 }}
          animate={{ width: 350, height: 350, opacity: 0 }}
          transition={{ duration: 3, repeat: Infinity, delay: i * 1 }}
        />
      ))}
      <motion.div
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
        className="relative grid h-32 w-32 place-items-center rounded-3xl bg-gradient-to-br from-electric to-cyan-accent text-white shadow-glow"
      >
        <Send className="h-14 w-14" />
      </motion.div>
    </div>
  );
}

function ContactPage() {
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", message: "" });
  const info = [
    { icon: Mail, t: "البريد الإلكتروني", d: "contact@ashholding.com" },
    { icon: Phone, t: "الهاتف", d: "+966 55 123 4567" },
    { icon: MapPin, t: "المقر", d: "الرياض، المملكة العربية السعودية" },
    { icon: Clock, t: "ساعات العمل", d: "الأحد - الخميس، 9ص - 6م" },
  ];
  return (
    <PageShell>
      <PageHero
        eyebrow="تواصل معنا"
        title="لنبدأ العمل"
        gradient="على مشروعك"
        description="نحن هنا للاستماع إليك. أخبرنا عن مشروعك أو فكرتك، وسنرد عليك خلال 24 ساعة بمقترح مبدئي واستشارة مجانية."
        visual={<ContactVisual />}
      />

      <section className="py-16 md:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 md:px-8">
          <div className="grid gap-8 lg:grid-cols-5">
            {/* Form */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="lg:col-span-3 rounded-3xl border border-border bg-card p-6 md:p-10 shadow-card"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-electric/10 text-electric">
                  <MessageSquare className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">أرسل رسالتك</h2>
                  <p className="text-sm text-muted-foreground">سنرد خلال 24 ساعة</p>
                </div>
              </div>
              {sent ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-16"
                >
                  <div className="grid h-20 w-20 mx-auto place-items-center rounded-full bg-electric/10 text-electric mb-4">
                    <Send className="h-10 w-10" />
                  </div>
                  <h3 className="text-2xl font-bold mb-2">تم استلام رسالتك</h3>
                  <p className="text-muted-foreground">سنتواصل معك قريباً على البريد المسجل</p>
                </motion.div>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    setSent(true);
                  }}
                  className="space-y-4"
                >
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm font-semibold mb-2">الاسم الكامل</label>
                      <input
                        required
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        className="w-full rounded-xl border border-border bg-background px-4 py-3 outline-none focus:border-electric transition"
                        placeholder="محمد أحمد"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-2">البريد الإلكتروني</label>
                      <input
                        required
                        type="email"
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        className="w-full rounded-xl border border-border bg-background px-4 py-3 outline-none focus:border-electric transition"
                        placeholder="you@example.com"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2">رقم الهاتف</label>
                    <input
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      className="w-full rounded-xl border border-border bg-background px-4 py-3 outline-none focus:border-electric transition"
                      placeholder="+966 5X XXX XXXX"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2">تفاصيل المشروع</label>
                    <textarea
                      required
                      rows={5}
                      value={form.message}
                      onChange={(e) => setForm({ ...form, message: e.target.value })}
                      className="w-full rounded-xl border border-border bg-background px-4 py-3 outline-none focus:border-electric transition resize-none"
                      placeholder="أخبرنا عن مشروعك، أهدافك، والميزانية التقديرية..."
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-electric to-purple-accent text-white px-6 py-4 font-bold shadow-glow hover:scale-[1.02] transition"
                  >
                    <Send className="h-5 w-5" />
                    إرسال الرسالة
                  </button>
                </form>
              )}
            </motion.div>

            {/* Info */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="lg:col-span-2 space-y-4"
            >
              {info.map((it, i) => (
                <motion.div
                  key={it.t}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="group flex items-start gap-4 rounded-2xl border border-border bg-card p-5 hover:shadow-glow hover:border-electric/40 transition"
                >
                  <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-electric/10 text-electric group-hover:scale-110 transition">
                    <it.icon className="h-6 w-6" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm text-muted-foreground mb-1">{it.t}</div>
                    <div className="font-bold text-base break-words">{it.d}</div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
