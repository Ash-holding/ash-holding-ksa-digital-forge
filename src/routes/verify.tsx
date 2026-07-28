import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { PageShell, PageHero } from "@/components/site/PageShell";
import { ShieldCheck, ScanLine, Search, FileCheck2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/verify")({
  component: VerifyLanding,
  head: () => ({
    meta: [
      { title: "التحقق من الإيصال | ASH HOLDING" },
      { name: "description", content: "تحقق من صحة إيصالات السداد والفواتير الصادرة عن شركة علي صالح الشهري القابضة عبر رقم الإيصال أو مسح رمز QR." },
      { property: "og:title", content: "التحقق من الإيصال | ASH HOLDING" },
      { property: "og:description", content: "بوابة رسمية للتحقق من صحة الإيصالات والفواتير." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function VerifyLanding() {
  const nav = useNavigate();
  const [code, setCode] = useState("");
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const scannerRef = useRef<any>(null);

  function goTo(raw: string) {
    const clean = raw.trim().toUpperCase().replace(/\s+/g, "").replace(/\//g, "-");
    if (!clean) return;
    nav({ to: "/verify/receipt/$code", params: { code: clean } });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    goTo(code);
  }

  // Extract a receipt/invoice code from a scanned URL or plain text
  function extractCode(text: string): string | null {
    if (!text) return null;
    try {
      const url = new URL(text);
      const m = url.pathname.match(/verify\/receipt\/([^/?#]+)/i);
      if (m) return decodeURIComponent(m[1]);
    } catch {/* not a URL */}
    const m = text.match(/(RCP|INV)-?\d{4}-?\d{3,6}/i);
    return m ? m[0] : text.trim();
  }

  async function startScan() {
    setScanError(null);
    setScanning(true);
    try {
      const mod: any = await import("html5-qrcode");
      const Html5Qrcode = mod.Html5Qrcode;
      // wait for the div to mount
      await new Promise((r) => setTimeout(r, 60));
      const el = document.getElementById("ash-qr-reader");
      if (!el) throw new Error("scanner mount failed");
      const scanner = new Html5Qrcode("ash-qr-reader");
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        (decoded: string) => {
          const found = extractCode(decoded);
          if (found) {
            stopScan();
            goTo(found);
          }
        },
        () => {}
      );
    } catch (err: any) {
      setScanError(err?.message || "تعذّر تشغيل الكاميرا. تحقّق من الأذونات.");
      setScanning(false);
    }
  }

  async function stopScan() {
    try {
      const s = scannerRef.current;
      if (s) { await s.stop(); await s.clear(); }
    } catch {/* ignore */}
    scannerRef.current = null;
    setScanning(false);
  }

  useEffect(() => () => { stopScan(); }, []);

  return (
    <PageShell>
      <PageHero
        eyebrow="بوابة التحقق الرسمية"
        title="تحقق من صحة الإيصال"
        subtitle="أدخل رقم الإيصال (RCP-YYYY-NNNN) أو الفاتورة (INV-YYYY-NNNN) — أو امسح رمز QR الموجود أعلى الإيصال الرسمي — للاطلاع على حالة السداد والتحقق من صحته."
        visual={<VerifyVisual />}
      />

      <section className="mx-auto max-w-3xl px-4 pb-24 -mt-8">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="rounded-3xl border border-border bg-card/95 backdrop-blur p-6 sm:p-10 shadow-card"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-electric to-purple-accent text-white shadow-glow">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold">التحقق اليدوي</h2>
              <p className="text-sm text-muted-foreground">اكتب الرقم كاملاً كما ورد في المستند.</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="مثال: RCP-2026-0003"
              dir="ltr"
              className="text-center font-mono text-lg h-14 tracking-widest"
              autoFocus
            />
            <Button type="submit" size="lg" className="h-14 gap-2 px-8">
              <Search className="h-5 w-5" /> تحقق الآن
            </Button>
          </form>

          <div className="relative my-8 flex items-center gap-4">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground font-semibold">أو</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <div className="flex items-center gap-3 mb-4">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-500/10 text-emerald-600">
              <ScanLine className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold">مسح رمز QR</h2>
              <p className="text-sm text-muted-foreground">وجّه كاميرا الجهاز نحو رمز QR المطبوع على الإيصال.</p>
            </div>
            {!scanning ? (
              <Button variant="outline" onClick={startScan} className="gap-2">
                <ScanLine className="h-4 w-4" /> بدء المسح
              </Button>
            ) : (
              <Button variant="destructive" onClick={stopScan} className="gap-2">
                <X className="h-4 w-4" /> إيقاف
              </Button>
            )}
          </div>

          {scanning && (
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-2xl overflow-hidden border-2 border-electric/40 bg-black/90 aspect-square max-w-sm mx-auto"
            >
              <div id="ash-qr-reader" className="w-full h-full [&_video]:w-full [&_video]:h-full [&_video]:object-cover" />
            </motion.div>
          )}
          {scanError && (
            <p className="mt-4 rounded-xl bg-red-500/10 border border-red-500/30 p-4 text-sm text-red-700 dark:text-red-300">
              {scanError}
            </p>
          )}

          <div className="mt-8 grid sm:grid-cols-3 gap-3 text-xs text-muted-foreground">
            {[
              { icon: FileCheck2, t: "تحقق فوري", d: "قاعدة بيانات مباشرة" },
              { icon: ShieldCheck, t: "توثيق رسمي", d: "مطابق للسجلات" },
              { icon: ScanLine, t: "QR آمن", d: "توقيع مضمّن" },
            ].map((x) => (
              <div key={x.t} className="rounded-xl border border-border bg-surface/50 p-3 flex items-center gap-3">
                <x.icon className="h-4 w-4 text-electric shrink-0" />
                <div>
                  <div className="font-semibold text-foreground">{x.t}</div>
                  <div>{x.d}</div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          للاستفسار عن إيصال أو فاتورة — <Link to="/contact" className="text-electric font-semibold hover:underline">تواصل معنا</Link>
        </p>
      </section>
    </PageShell>
  );
}

function VerifyVisual() {
  return (
    <div className="relative h-[420px] w-full grid place-items-center">
      <motion.div
        animate={{ scale: [1, 1.15, 1], opacity: [0.25, 0.5, 0.25] }}
        transition={{ duration: 3, repeat: Infinity }}
        className="absolute h-64 w-64 rounded-full bg-electric/20 blur-3xl"
      />
      <motion.div
        animate={{ y: [0, -14, 0] }}
        transition={{ duration: 4, repeat: Infinity }}
        className="relative grid h-40 w-40 place-items-center rounded-3xl bg-gradient-to-br from-electric to-purple-accent text-white shadow-glow"
      >
        <ShieldCheck className="h-20 w-20" />
      </motion.div>
      <motion.div
        animate={{ scaleX: [0.2, 1, 0.2], opacity: [0, 1, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
        className="absolute h-1 w-40 bg-emerald-400 rounded-full shadow-[0_0_20px_rgba(52,211,153,0.9)]"
      />
    </div>
  );
}
