import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { ShieldAlert, Eye, RotateCcw, XCircle, FileEdit, MessageSquare } from "lucide-react";
import { api, apiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

type RiskAction = {
  id: string; type: "WATCHLIST" | "RESTRUCTURE" | "RESCHEDULE" | "WRITE_OFF" | "RECOVERY_NOTE";
  reasonAr: string; createdAt: string;
};

type EarlyRequest = {
  id: string; status: "REQUESTED" | "APPROVED" | "REJECTED" | "SETTLED" | "CANCELLED";
  totalPayoff: string | number; clientNote?: string | null; adminNote?: string | null; createdAt: string;
};

const money = (v: unknown) => Number(v ?? 0).toLocaleString("ar-SA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const TYPES: Array<{ v: RiskAction["type"]; label: string; icon: typeof Eye; color: string }> = [
  { v: "WATCHLIST", label: "قائمة المراقبة", icon: Eye, color: "amber" },
  { v: "RESCHEDULE", label: "إعادة جدولة", icon: RotateCcw, color: "sky" },
  { v: "RESTRUCTURE", label: "إعادة هيكلة (إغلاق وإصدار جديد)", icon: FileEdit, color: "violet" },
  { v: "WRITE_OFF", label: "شطب العقد", icon: XCircle, color: "rose" },
  { v: "RECOVERY_NOTE", label: "ملاحظة تحصيل", icon: MessageSquare, color: "slate" },
];

export function AdminRiskPanel({ contractId }: { contractId: string }) {
  const qc = useQueryClient();
  const [type, setType] = useState<RiskAction["type"]>("WATCHLIST");
  const [reason, setReason] = useState("");

  const actions = useQuery({
    queryKey: ["fin-risk-actions", contractId],
    queryFn: () => api.get<{ actions: RiskAction[] }>(`/financing/admin/contracts/${contractId}/risk-actions`).then((r) => r.data.actions),
  });

  const early = useQuery({
    queryKey: ["fin-payoff-requests-admin", contractId],
    queryFn: () => api.get<{ requests: EarlyRequest[] }>(`/financing/contracts/${contractId}/early-settlement`).then((r) => r.data.requests),
  });

  const submit = useMutation({
    mutationFn: () => api.post(`/financing/admin/contracts/${contractId}/risk-action`, { type, reasonAr: reason.trim() }),
    onSuccess: () => {
      toast.success("تم تسجيل الإجراء");
      setReason("");
      qc.invalidateQueries({ queryKey: ["fin-risk-actions", contractId] });
      qc.invalidateQueries({ queryKey: ["admin-fin-contract", contractId] });
    },
    onError: (e) => toast.error(apiError(e) || "تعذر التسجيل"),
  });

  const approveEarly = useMutation({
    mutationFn: (reqId: string) => api.post(`/financing/admin/early-settlement/${reqId}/approve`, {}),
    onSuccess: () => {
      toast.success("✅ تم تنفيذ السداد وإغلاق العقد");
      qc.invalidateQueries({ queryKey: ["fin-payoff-requests-admin", contractId] });
      qc.invalidateQueries({ queryKey: ["admin-fin-contract", contractId] });
    },
    onError: (e) => toast.error(apiError(e) || "تعذر التنفيذ (ربما لا يوجد رصيد كافٍ)"),
  });

  const rejectEarly = useMutation({
    mutationFn: (args: { id: string; note: string }) =>
      api.post(`/financing/admin/early-settlement/${args.id}/reject`, { adminNote: args.note }),
    onSuccess: () => {
      toast.success("تم رفض الطلب");
      qc.invalidateQueries({ queryKey: ["fin-payoff-requests-admin", contractId] });
    },
    onError: (e) => toast.error(apiError(e) || "تعذر الرفض"),
  });

  const pendingEarly = early.data?.find((r) => r.status === "REQUESTED");

  return (
    <div className="space-y-4">
      {/* Pending early settlement */}
      {pendingEarly && (
        <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 space-y-3">
          <div className="flex items-center gap-2 font-bold text-amber-300 text-sm">
            <ShieldAlert className="h-4 w-4" /> طلب سداد مبكر بانتظار الاعتماد
          </div>
          <div className="text-xs">
            المبلغ: <b className="tabular-nums">{money(pendingEarly.totalPayoff)} ر.س</b>
            {pendingEarly.clientNote && <div className="mt-1 text-slate-300">ملاحظة العميل: {pendingEarly.clientNote}</div>}
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => approveEarly.mutate(pendingEarly.id)} disabled={approveEarly.isPending}>
              اعتماد وخصم من المحفظة
            </Button>
            <Button size="sm" variant="outline" onClick={() => {
              const note = window.prompt("سبب الرفض:");
              if (note && note.trim().length >= 3) rejectEarly.mutate({ id: pendingEarly.id, note: note.trim() });
            }}>
              رفض
            </Button>
          </div>
        </div>
      )}

      {/* Risk action form */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
        <div className="flex items-center gap-2 font-bold text-sm">
          <ShieldAlert className="h-4 w-4 text-rose-400" /> إجراء مخاطر / حوكمة
        </div>
        <div className="grid gap-2 md:grid-cols-2">
          <Select value={type} onValueChange={(v) => setType(v as RiskAction["type"])}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {TYPES.map((t) => (
                <SelectItem key={t.v} value={t.v}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="text-[11px] text-muted-foreground self-center">
            {type === "WRITE_OFF" && "⚠️ سيتم شطب العقد وإعفاء الأقساط المتبقية."}
            {type === "RESTRUCTURE" && "⚠️ سيتم إغلاق العقد وإعفاء الأقساط للسماح بإصدار عقد جديد."}
            {type === "WATCHLIST" && "وسم العقد للمتابعة الدورية."}
            {type === "RESCHEDULE" && "تسجيل نية إعادة الجدولة (بدون تغيير الحالة)."}
            {type === "RECOVERY_NOTE" && "ملاحظة تحصيل داخلية."}
          </div>
        </div>
        <Textarea rows={2} placeholder="السبب / التفاصيل (إلزامي)" value={reason} onChange={(e) => setReason(e.target.value)} />
        <Button size="sm" onClick={() => submit.mutate()} disabled={submit.isPending || reason.trim().length < 3}>
          تسجيل الإجراء
        </Button>
      </div>

      {/* History */}
      {actions.data && actions.data.length > 0 && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="text-xs font-bold mb-2">سجل الإجراءات ({actions.data.length})</div>
          <ul className="space-y-2 text-xs">
            {actions.data.map((a) => {
              const meta = TYPES.find((t) => t.v === a.type);
              return (
                <li key={a.id} className="border-r-2 border-rose-500/40 pr-3">
                  <div className="font-semibold">{meta?.label || a.type}</div>
                  <div className="text-muted-foreground">{a.reasonAr}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">{new Date(a.createdAt).toLocaleString("ar-SA")}</div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
