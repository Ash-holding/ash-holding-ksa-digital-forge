import { cn } from "@/lib/utils";

const MAP: Record<string, { label: string; cls: string }> = {
  // Client / User
  ACTIVE: { label: "نشط", cls: "bg-emerald-500/10 text-emerald-400 ring-emerald-500/20" },
  DISABLED: { label: "موقوف", cls: "bg-rose-500/10 text-rose-400 ring-rose-500/20" },
  PENDING: { label: "قيد الانتظار", cls: "bg-amber-500/10 text-amber-400 ring-amber-500/20" },
  // Project
  NEW: { label: "جديد", cls: "bg-slate-500/10 text-slate-300 ring-slate-500/20" },
  PLANNING: { label: "قيد التخطيط", cls: "bg-cyan-500/10 text-cyan-400 ring-cyan-500/20" },
  DESIGN: { label: "قيد التصميم", cls: "bg-violet-500/10 text-violet-400 ring-violet-500/20" },
  DEVELOPMENT: { label: "قيد التطوير", cls: "bg-electric/10 text-electric ring-electric/20" },
  WAITING_CLIENT: { label: "بانتظار العميل", cls: "bg-amber-500/10 text-amber-400 ring-amber-500/20" },
  TESTING: { label: "قيد الاختبار", cls: "bg-indigo-500/10 text-indigo-400 ring-indigo-500/20" },
  COMPLETED: { label: "مكتمل", cls: "bg-emerald-500/10 text-emerald-400 ring-emerald-500/20" },
  ON_HOLD: { label: "متوقف", cls: "bg-rose-500/10 text-rose-400 ring-rose-500/20" },
  // Invoice
  DRAFT: { label: "مسودة", cls: "bg-slate-500/10 text-slate-300 ring-slate-500/20" },
  UNPAID: { label: "غير مدفوعة", cls: "bg-amber-500/10 text-amber-400 ring-amber-500/20" },
  PAID: { label: "مدفوعة", cls: "bg-emerald-500/10 text-emerald-400 ring-emerald-500/20" },
  OVERDUE: { label: "متأخرة", cls: "bg-rose-500/10 text-rose-400 ring-rose-500/20" },
  CANCELLED: { label: "ملغاة", cls: "bg-slate-500/10 text-slate-400 ring-slate-500/20" },
  // Contract
  SENT: { label: "مرسل", cls: "bg-cyan-500/10 text-cyan-400 ring-cyan-500/20" },
  PENDING_SIGNATURE: { label: "بانتظار التوقيع", cls: "bg-amber-500/10 text-amber-400 ring-amber-500/20" },
  SIGNED: { label: "موقع", cls: "bg-emerald-500/10 text-emerald-400 ring-emerald-500/20" },
  // Ticket
  OPEN: { label: "مفتوحة", cls: "bg-cyan-500/10 text-cyan-400 ring-cyan-500/20" },
  IN_PROGRESS: { label: "قيد المعالجة", cls: "bg-electric/10 text-electric ring-electric/20" },
  CLOSED: { label: "مغلقة", cls: "bg-slate-500/10 text-slate-300 ring-slate-500/20" },
  // Priority
  LOW: { label: "منخفضة", cls: "bg-slate-500/10 text-slate-300 ring-slate-500/20" },
  NORMAL: { label: "متوسطة", cls: "bg-cyan-500/10 text-cyan-400 ring-cyan-500/20" },
  HIGH: { label: "عالية", cls: "bg-amber-500/10 text-amber-400 ring-amber-500/20" },
  URGENT: { label: "عاجلة", cls: "bg-rose-500/10 text-rose-400 ring-rose-500/20" },
  // Service
  SUSPENDED: { label: "موقوف", cls: "bg-rose-500/10 text-rose-400 ring-rose-500/20" },
  AWAITING_PAYMENT: { label: "بانتظار الدفع", cls: "bg-amber-500/10 text-amber-400 ring-amber-500/20" },
  EXPIRED: { label: "منتهي", cls: "bg-slate-500/10 text-slate-400 ring-slate-500/20" },
  // Payment
  SUCCESS: { label: "ناجحة", cls: "bg-emerald-500/10 text-emerald-400 ring-emerald-500/20" },
  FAILED: { label: "فاشلة", cls: "bg-rose-500/10 text-rose-400 ring-rose-500/20" },
  REFUNDED: { label: "مسترجعة", cls: "bg-cyan-500/10 text-cyan-400 ring-cyan-500/20" },
  // Role
  SUPER_ADMIN: { label: "مدير عام", cls: "bg-purple-accent/10 text-purple-accent ring-purple-accent/20" },
  ADMIN: { label: "مدير", cls: "bg-electric/10 text-electric ring-electric/20" },
  SUPPORT: { label: "دعم فني", cls: "bg-cyan-500/10 text-cyan-400 ring-cyan-500/20" },
  ACCOUNTANT: { label: "محاسب", cls: "bg-amber-500/10 text-amber-400 ring-amber-500/20" },
  CLIENT: { label: "عميل", cls: "bg-emerald-500/10 text-emerald-400 ring-emerald-500/20" },
};

export function StatusBadge({ value, className }: { value: string; className?: string }) {
  const it = MAP[value] || { label: value, cls: "bg-slate-500/10 text-slate-300 ring-slate-500/20" };
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 whitespace-nowrap", it.cls, className)}>
      {it.label}
    </span>
  );
}

export function statusLabel(value: string): string {
  return MAP[value]?.label ?? value;
}
