import { useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Loader2, Calculator as CalcIcon, Info, ArrowLeft, FileCheck2 } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useNavigate } from "@tanstack/react-router";
import { api, apiError } from "@/lib/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

type Product = {
  id: string; code: string; nameAr: string; customerType: "INDIVIDUAL" | "BUSINESS";
  minAmount: number; maxAmount: number; minDownPaymentPct: number;
  minTermMonths: number; maxTermMonths: number;
  allowedTermsMonths: number[]; ratePct: number; rateBasis: string;
};

type Quote = {
  amount: number; downPayment: number; financedAmount: number; termMonths: number;
  installment: number; totalInterest: number; totalFees: number; totalVat: number;
  totalPayable: number; aprPct: number; firstDueDate: string; lastDueDate: string;
  schedule: { n: number; dueDate: string; total: number; principal: number; interest: number; balance: number }[];
  disclaimerAr: string;
};

const money = (n: number) =>
  new Intl.NumberFormat("ar-SA", { style: "currency", currency: "SAR", maximumFractionDigits: 2 }).format(n || 0);

function AnimatedNumber({ value, className }: { value: number; className?: string }) {
  const reduce = useReducedMotion();
  const [display, setDisplay] = useState(value);
  useEffect(() => {
    if (reduce) { setDisplay(value); return; }
    const start = display, delta = value - start, dur = 400, t0 = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / dur);
      setDisplay(start + delta * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return <span className={className}>{money(display)}</span>;
}

export function FinancingCalculator() {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [productId, setProductId] = useState<string>("");
  const [amount, setAmount] = useState(50000);
  const [downPayment, setDownPayment] = useState(0);
  const [term, setTerm] = useState(24);
  const [loading, setLoading] = useState(false);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [productsErr, setProductsErr] = useState<string | null>(null);

  useEffect(() => {
    api.get<{ items: Product[] }>("/financing/products")
      .then((r) => {
        setProducts(r.data.items);
        if (r.data.items[0]) setProductId(r.data.items[0].id);
      })
      .catch((e) => setProductsErr(apiError(e)));
  }, []);

  const product = useMemo(() => products.find((p) => p.id === productId) || null, [products, productId]);

  useEffect(() => {
    if (!product) return;
    setAmount((a) => Math.min(product.maxAmount, Math.max(product.minAmount, a || product.minAmount)));
    setTerm((t) => {
      if (product.allowedTermsMonths.length) {
        return product.allowedTermsMonths.includes(t) ? t : product.allowedTermsMonths[0];
      }
      return Math.min(product.maxTermMonths, Math.max(product.minTermMonths, t));
    });
    setDownPayment((d) => Math.max(d, Math.ceil((product.minDownPaymentPct / 100) * amount)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product?.id]);

  // Debounced live quote
  useEffect(() => {
    if (!product) return;
    const h = setTimeout(async () => {
      setLoading(true);
      try {
        const r = await api.post<{ quote: Quote }>(`/financing/products/${product.id}/quote`, {
          amount, downPayment, termMonths: term,
        });
        setQuote(r.data.quote);
      } catch (e) {
        setQuote(null);
        // silent — most likely out-of-range while user drags
        console.warn(apiError(e));
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(h);
  }, [product, amount, downPayment, term]);

  if (productsErr) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-800">
        تعذر تحميل منتجات التمويل الآن: {productsErr}
      </div>
    );
  }

  if (!products.length) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center text-slate-600">
        <Info className="mx-auto mb-3 h-8 w-8 text-slate-400" />
        <p className="text-sm">
          لا توجد منتجات تمويل منشورة حاليًا. يعمل النظام في «بيئة تجريبية»؛ سيتم إتاحة المنتجات فور
          استكمال الاعتمادات اللازمة.
        </p>
      </div>
    );
  }

  const termOptions =
    product?.allowedTermsMonths?.length
      ? product.allowedTermsMonths
      : Array.from({ length: (product?.maxTermMonths ?? 36) - (product?.minTermMonths ?? 6) + 1 }, (_, i) => (product?.minTermMonths ?? 6) + i);

  const continueApplication = () => {
    if (!product) {
      toast.error("اختر منتج التمويل أولاً");
      return;
    }
    navigate({
      to: "/client/financing/apply/$productId",
      params: { productId: product.id },
      search: { amount, down: downPayment, term },
    });
  };

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      {/* Inputs */}
      <div className="lg:col-span-3 space-y-6 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-blue-50 text-blue-600">
            <CalcIcon className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">حاسبة تمويل خدمات ASH</h2>
            <p className="text-xs text-slate-500">حساب فوري من الخادم — بدون قرارات آلية</p>
          </div>
        </div>

        <div>
          <label className="mb-2 block text-xs font-semibold text-slate-600">نوع العميل / المنتج</label>
          <div className="grid gap-2 sm:grid-cols-2">
            {products.map((p) => (
              <button
                key={p.id}
                onClick={() => setProductId(p.id)}
                className={`rounded-2xl border p-3 text-right text-sm transition ${
                  productId === p.id
                    ? "border-blue-600 bg-blue-50/60 shadow-sm"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <div className="font-bold text-slate-900">{p.nameAr}</div>
                <div className="mt-1 text-[11px] text-slate-500">
                  {p.customerType === "INDIVIDUAL" ? "أفراد" : "منشآت"} •{" "}
                  {money(p.minAmount)} — {money(p.maxAmount)}
                </div>
              </button>
            ))}
          </div>
        </div>

        {product && (
          <>
            <SliderField
              label="مبلغ التمويل"
              value={amount}
              min={product.minAmount}
              max={product.maxAmount}
              step={500}
              onChange={setAmount}
              suffix="ريال"
            />
            <SliderField
              label="الدفعة الأولى"
              value={downPayment}
              min={0}
              max={Math.round(amount * 0.9)}
              step={500}
              onChange={setDownPayment}
              suffix="ريال"
              hint={product.minDownPaymentPct > 0 ? `الحد الأدنى ${product.minDownPaymentPct}%` : undefined}
            />
            <div>
              <label className="mb-2 block text-xs font-semibold text-slate-600">مدة السداد (شهر)</label>
              <div className="flex flex-wrap gap-2">
                {termOptions.map((t) => (
                  <button
                    key={t}
                    onClick={() => setTerm(t)}
                    className={`min-w-[64px] rounded-xl border px-3 py-2 text-sm transition ${
                      term === t
                        ? "border-blue-600 bg-blue-600 text-white shadow-sm"
                        : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Output */}
      <motion.aside
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="lg:col-span-2 space-y-4 rounded-3xl bg-gradient-to-br from-slate-900 to-slate-800 p-6 text-white shadow-lg"
      >
        <div className="flex items-center justify-between">
          <div className="text-xs text-slate-300">القسط الشهري التقديري</div>
          {loading && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}
        </div>
        <AnimatedNumber value={quote?.installment ?? 0} className="block text-3xl font-black tabular-nums" />
        <div className="grid gap-3 pt-3">
          <Row label="مبلغ التمويل" value={quote?.financedAmount ?? 0} />
          <Row label="إجمالي التكلفة" value={(quote?.totalInterest ?? 0) + (quote?.totalFees ?? 0)} />
          <Row label="إجمالي المستحق" value={quote?.totalPayable ?? 0} bold />
          {quote && (
            <div className="text-[11px] text-slate-400">
              أول قسط: {quote.firstDueDate} • آخر قسط: {quote.lastDueDate}
            </div>
          )}
        </div>
        <div className="mt-4 rounded-2xl bg-white/5 p-3 text-[11px] leading-6 text-slate-300 ring-1 ring-white/10">
          {quote?.disclaimerAr ??
            "النتيجة تقديرية ولا تمثل موافقة. يخضع القرار النهائي لدراسة ائتمانية داخلية."}
        </div>
        {product ? (
          <Button
            type="button"
            onClick={continueApplication}
            className="group mt-2 h-auto w-full rounded-2xl bg-white p-4 text-slate-900 shadow-lg ring-1 ring-white transition hover:bg-white hover:shadow-xl hover:ring-white/80"
          >
            <div className="flex w-full items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 text-white">
                <FileCheck2 className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1 text-right">
                <div className="text-sm font-bold">متابعة — استكمال بيانات الطلب</div>
                <div className="text-[11px] text-slate-500">
                  الهوية • كشف الحساب • تقرير سمة • الموافقات
                </div>
              </div>
              <ArrowLeft className="h-4 w-4 text-slate-500 transition group-hover:-translate-x-1" />
            </div>
          </Button>
        ) : (
          <div className="mt-2 block w-full rounded-2xl bg-white/10 py-3 text-center text-sm text-slate-400 ring-1 ring-white/15">
            اختر منتجاً أولاً
          </div>
        )}
      </motion.aside>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: number; bold?: boolean }) {
  return (
    <div className={`flex items-center justify-between border-t border-white/10 pt-3 ${bold ? "text-white" : "text-slate-300"}`}>
      <span className="text-xs">{label}</span>
      <AnimatedNumber value={value} className={`tabular-nums ${bold ? "text-base font-bold text-white" : "text-sm"}`} />
    </div>
  );
}

function SliderField({
  label, value, min, max, step, onChange, suffix, hint,
}: {
  label: string; value: number; min: number; max: number; step: number;
  onChange: (v: number) => void; suffix?: string; hint?: string;
}) {
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <label className="text-xs font-semibold text-slate-600">{label}</label>
        <div className="text-sm font-bold tabular-nums text-slate-900">
          {new Intl.NumberFormat("ar-SA").format(value)} <span className="text-xs text-slate-500">{suffix}</span>
        </div>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-blue-600"
      />
      <div className="mt-1 flex justify-between text-[11px] text-slate-400">
        <span>{new Intl.NumberFormat("ar-SA").format(min)}</span>
        <span>{new Intl.NumberFormat("ar-SA").format(max)}</span>
      </div>
      {hint && <div className="mt-1 text-[11px] text-slate-500">{hint}</div>}
    </div>
  );
}
