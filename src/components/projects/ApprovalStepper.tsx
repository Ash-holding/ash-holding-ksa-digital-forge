import { motion } from "framer-motion";
import { Check, Circle, FileText, Send, MessageSquare, PenLine, ShieldCheck, Rocket, Package, Flag } from "lucide-react";
import { cn } from "@/lib/utils";

export type ApprovalStatus =
  | "PENDING" | "UNDER_REVIEW" | "PROPOSAL_SENT" | "CLIENT_REVISION"
  | "AWAITING_SIGNATURE" | "SIGNED" | "IN_PROGRESS" | "DELIVERED" | "COMPLETED"
  | "APPROVED" | "REJECTED" | "CONVERTED";

const STEPS: { key: ApprovalStatus; label: string; hint: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: "PENDING",           label: "استلام الطلب",       hint: "تم استلام طلبك", icon: FileText },
  { key: "UNDER_REVIEW",      label: "قيد الدراسة",         hint: "الفريق يراجع التفاصيل", icon: Send },
  { key: "PROPOSAL_SENT",     label: "عرض السعر",           hint: "تم إرسال عرض رسمي", icon: MessageSquare },
  { key: "AWAITING_SIGNATURE",label: "التوقيع الرقمي",     hint: "بانتظار موافقتك الرسمية", icon: PenLine },
  { key: "SIGNED",            label: "توثيق الموافقة",      hint: "تم توقيع العقد وإصدار الفاتورة", icon: ShieldCheck },
  { key: "IN_PROGRESS",       label: "قيد التنفيذ",         hint: "بدأنا العمل على مشروعك", icon: Rocket },
  { key: "DELIVERED",         label: "التسليم",             hint: "المشروع جاهز للاستلام", icon: Package },
  { key: "COMPLETED",         label: "الإكمال",             hint: "اكتمل التسليم النهائي", icon: Flag },
];

const ORDER: Record<string, number> = Object.fromEntries(STEPS.map((s, i) => [s.key, i]));

export function ApprovalStepper({
  status, revisionCount = 0,
}: { status: ApprovalStatus; revisionCount?: number }) {
  const effective: ApprovalStatus = status === "CLIENT_REVISION" ? "PROPOSAL_SENT"
    : status === "APPROVED" || status === "CONVERTED" ? "SIGNED"
    : status;
  const activeIndex = ORDER[effective] ?? 0;
  const rejected = status === "REJECTED";

  return (
    <div className="relative rounded-3xl border border-border bg-gradient-to-br from-card via-card to-electric/5 p-4 md:p-6 overflow-hidden" dir="rtl">
      <div className="pointer-events-none absolute -top-24 -end-24 h-64 w-64 rounded-full bg-electric/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -start-24 h-64 w-64 rounded-full bg-purple-accent/10 blur-3xl" />

      <div className="relative flex items-center justify-between flex-wrap gap-2 mb-5">
        <div className="text-[13px] font-black tracking-tight">مسار الموافقة والتنفيذ</div>
        {status === "CLIENT_REVISION" && (
          <span className="rounded-full bg-amber-500/15 px-3 py-1 text-[11px] font-bold text-amber-500 ring-1 ring-amber-500/30">
            بانتظار عرض معدّل · {revisionCount} تعديل
          </span>
        )}
        {rejected && (
          <span className="rounded-full bg-rose-500/15 px-3 py-1 text-[11px] font-bold text-rose-400 ring-1 ring-rose-500/30">
            تم رفض الطلب
          </span>
        )}
      </div>

      {/* Horizontal on desktop, vertical on mobile */}
      <ol className="relative flex md:flex-row flex-col md:items-start gap-3 md:gap-0">
        {STEPS.map((s, i) => {
          const done = i < activeIndex;
          const active = i === activeIndex && !rejected;
          const Icon = s.icon;
          return (
            <li key={s.key} className="relative flex md:flex-1 md:flex-col items-center gap-3 md:gap-2">
              {/* connector */}
              {i > 0 && (
                <span
                  className={cn(
                    "absolute md:top-5 md:end-1/2 md:h-0.5 md:w-full md:translate-y-0",
                    "top-0 end-4 h-full w-0.5 -translate-y-1/2 md:translate-x-0",
                    done || active ? "bg-gradient-to-l from-electric to-purple-accent" : "bg-border/60",
                  )}
                />
              )}
              <motion.div
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: i * 0.05 }}
                className={cn(
                  "relative z-10 grid h-10 w-10 md:h-11 md:w-11 place-items-center rounded-full ring-2 shrink-0",
                  done && "bg-gradient-to-br from-electric to-purple-accent text-white ring-electric/40 shadow-glow",
                  active && "bg-background text-electric ring-electric animate-pulse",
                  !done && !active && "bg-muted/40 text-muted-foreground ring-border",
                )}
              >
                {done ? <Check className="h-5 w-5" /> : active ? <Icon className="h-5 w-5" /> : <Circle className="h-4 w-4" />}
              </motion.div>
              <div className="md:text-center min-w-0 flex-1">
                <div className={cn("text-[12px] font-bold truncate", (done || active) ? "text-foreground" : "text-muted-foreground")}>
                  {s.label}
                </div>
                <div className="text-[10px] text-muted-foreground truncate">{s.hint}</div>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
