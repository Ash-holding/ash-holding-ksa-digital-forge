import { motion, useReducedMotion } from "framer-motion";
import { ShieldAlert } from "lucide-react";

/**
 * Regulatory disclaimer bar — MUST appear on every financing page.
 * The message is deliberately conservative and never claims regulator approval.
 */
export function DisclaimerBar({ variant = "default" }: { variant?: "default" | "compact" }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? {} : { opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      role="note"
      className={`flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50/70 px-4 py-3 text-amber-900 ${
        variant === "compact" ? "text-xs" : "text-sm"
      }`}
    >
      <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
      <p className="leading-6">
        النتيجة المعروضة تقديرية ولا تمثل موافقة أو عرضًا نهائيًا. يخضع كل طلب لدراسة ائتمانية داخلية،
        ولا يُصرف أي مبلغ نقدًا للعميل — يُحتسب الرصيد داخل المحفظة الخدمية لشراء خدمات ASH فقط.
      </p>
    </motion.div>
  );
}
