import { useState, useRef, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  MessageSquare, Send, Plus, Trash2, Layers, Calendar, Wallet,
  CheckCircle2, Clock, Ban, PlayCircle, GripVertical, Pencil, Lock, User as UserIcon,
} from "lucide-react";
import { api, apiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { ConfirmDialog } from "@/components/dashboard/ConfirmDialog";
import { FormSheet } from "@/components/dashboard/FormSheet";
import { Money } from "@/components/ui/money";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

type Stage = {
  id: string; title: string; description?: string | null;
  status: "PENDING" | "IN_PROGRESS" | "BLOCKED" | "DONE" | "SKIPPED";
  progress: number; weight: number; orderIndex: number;
  dueDate?: string | null; startedAt?: string | null; completedAt?: string | null;
};

type Message = {
  id: string; content: string; isInternal: boolean; createdAt: string;
  author: { id: string; name: string; role: string; avatarUrl?: string | null };
};

type ProjectData = {
  id: string; title: string; description?: string | null; status: string;
  progress: number; budget?: string | null; startDate?: string | null;
  dueDate?: string | null; createdAt: string;
  client: { id: string; user: { name: string; email: string } };
};

const STAGE_STATUS_META: Record<Stage["status"], { label: string; icon: typeof Clock; className: string }> = {
  PENDING:     { label: "لم تبدأ",     icon: Clock,       className: "bg-slate-500/15 text-slate-300 border-slate-500/30" },
  IN_PROGRESS: { label: "قيد التنفيذ", icon: PlayCircle,  className: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30" },
  BLOCKED:     { label: "متوقفة",     icon: Ban,         className: "bg-rose-500/15 text-rose-300 border-rose-500/30" },
  DONE:        { label: "مكتملة",     icon: CheckCircle2,className: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" },
  SKIPPED:     { label: "متجاوزة",    icon: Clock,       className: "bg-zinc-500/15 text-zinc-300 border-zinc-500/30" },
};

export function ProjectDetailView({ projectId, isAdmin }: { projectId: string; isAdmin: boolean }) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [stageOpen, setStageOpen] = useState(false);
  const [editStage, setEditStage] = useState<Stage | null>(null);

  const project = useQuery({
    queryKey: ["project", projectId],
    queryFn: async () => (await api.get(`/projects/${projectId}`)).data.project as ProjectData,
    refetchInterval: 20000,
  });

  const stages = useQuery({
    queryKey: ["project", projectId, "stages"],
    queryFn: async () => (await api.get(`/projects/${projectId}/stages`)).data.rows as Stage[],
    refetchInterval: 15000,
  });

  const messages = useQuery({
    queryKey: ["project", projectId, "messages"],
    queryFn: async () => (await api.get(`/projects/${projectId}/messages`)).data.rows as Message[],
    refetchInterval: 8000,
  });

  const saveStage = useMutation({
    mutationFn: async (payload: { id?: string; data: Record<string, unknown> }) => {
      if (payload.id) return api.patch(`/projects/${projectId}/stages/${payload.id}`, payload.data);
      return api.post(`/projects/${projectId}/stages`, payload.data);
    },
    onSuccess: () => {
      toast.success("تم الحفظ");
      qc.invalidateQueries({ queryKey: ["project", projectId] });
      setStageOpen(false); setEditStage(null);
    },
    onError: (e) => toast.error(apiError(e)),
  });

  const delStage = useMutation({
    mutationFn: (id: string) => api.delete(`/projects/${projectId}/stages/${id}`),
    onSuccess: () => { toast.success("تم الحذف"); qc.invalidateQueries({ queryKey: ["project", projectId] }); },
    onError: (e) => toast.error(apiError(e)),
  });

  const advanceStage = useMutation({
    mutationFn: (payload: { id: string; status: Stage["status"]; progress?: number }) =>
      api.patch(`/projects/${projectId}/stages/${payload.id}`, { status: payload.status, progress: payload.progress }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["project", projectId] }),
    onError: (e) => toast.error(apiError(e)),
  });

  const p = project.data;

  return (
    <div className="space-y-6 pb-10">
      {/* HERO */}
      {project.isLoading ? (
        <Skeleton className="h-40 rounded-2xl" />
      ) : p ? (
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900/80 via-slate-900/60 to-blue-950/40 p-6">
          <div className="absolute -top-16 -left-16 h-48 w-48 rounded-full bg-cyan-500/10 blur-3xl" />
          <div className="relative flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                <Layers className="h-3.5 w-3.5" />
                <span>مشروع #{p.id.slice(0, 6).toUpperCase()}</span>
                <span>•</span>
                <StatusBadge value={p.status} />
              </div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{p.title}</h1>
              {p.description && <p className="mt-2 text-sm text-muted-foreground max-w-2xl leading-relaxed">{p.description}</p>}
              <div className="mt-4 flex flex-wrap gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5"><UserIcon className="h-3.5 w-3.5" />{p.client.user.name}</span>
                {p.dueDate && <span className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" />التسليم: {formatDate(p.dueDate)}</span>}
                {p.budget && <span className="flex items-center gap-1.5"><Wallet className="h-3.5 w-3.5" /><Money value={p.budget} /></span>}
              </div>
            </div>
            <div className="shrink-0 min-w-[180px]">
              <div className="text-xs text-muted-foreground mb-1">التقدم الإجمالي</div>
              <div className="text-3xl font-bold tabular-nums">{p.progress}%</div>
              <Progress value={p.progress} className="h-2 mt-2" />
            </div>
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* STAGES */}
        <section className="lg:col-span-3 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Layers className="h-5 w-5 text-cyan-400" /> مراحل المشروع
            </h2>
            {isAdmin && (
              <Button size="sm" onClick={() => { setEditStage(null); setStageOpen(true); }} className="gap-1.5">
                <Plus className="h-4 w-4" /> مرحلة جديدة
              </Button>
            )}
          </div>

          {stages.isLoading ? (
            <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
          ) : !stages.data?.length ? (
            <div className="rounded-xl border border-dashed border-white/10 p-8 text-center text-sm text-muted-foreground">
              لم يتم تعريف مراحل لهذا المشروع بعد.
              {isAdmin && <div className="mt-3"><Button size="sm" onClick={() => setStageOpen(true)}>ابدأ بتعريف المراحل</Button></div>}
            </div>
          ) : (
            <ol className="relative space-y-3 before:content-[''] before:absolute before:top-2 before:bottom-2 before:right-4 before:w-px before:bg-white/10">
              {stages.data.map((s, i) => {
                const meta = STAGE_STATUS_META[s.status];
                const Icon = meta.icon;
                return (
                  <li key={s.id} className="relative pr-10">
                    <div className={cn(
                      "absolute right-2 top-3 h-5 w-5 rounded-full ring-2 ring-slate-950 flex items-center justify-center",
                      s.status === "DONE" ? "bg-emerald-500" :
                      s.status === "IN_PROGRESS" ? "bg-cyan-500 animate-pulse" :
                      s.status === "BLOCKED" ? "bg-rose-500" : "bg-slate-600"
                    )}>
                      <span className="text-[10px] font-bold text-white">{i+1}</span>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-slate-900/40 hover:bg-slate-900/60 transition-colors p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold">{s.title}</h3>
                            <Badge variant="outline" className={cn("gap-1 text-[10px]", meta.className)}>
                              <Icon className="h-3 w-3" /> {meta.label}
                            </Badge>
                            {s.dueDate && <span className="text-[11px] text-muted-foreground">استحقاق {formatDate(s.dueDate)}</span>}
                          </div>
                          {s.description && <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">{s.description}</p>}
                          <div className="mt-3 flex items-center gap-3">
                            <Progress value={s.progress} className="h-1.5 flex-1" />
                            <span className="text-[11px] font-semibold tabular-nums w-9 text-right">{s.progress}%</span>
                          </div>
                        </div>
                        {isAdmin && (
                          <div className="flex items-center gap-1 shrink-0">
                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => { setEditStage(s); setStageOpen(true); }}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <ConfirmDialog
                              title="حذف المرحلة" description="سيتم حذف المرحلة نهائياً."
                              onConfirm={async () => { await delStage.mutateAsync(s.id); }}
                              trigger={<Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-rose-400"><Trash2 className="h-3.5 w-3.5" /></Button>}
                            />
                          </div>
                        )}
                      </div>

                      {isAdmin && (
                        <div className="mt-3 pt-3 border-t border-white/5 flex flex-wrap gap-1.5">
                          {(["PENDING","IN_PROGRESS","BLOCKED","DONE","SKIPPED"] as const).map(st => (
                            <Button key={st} size="sm" variant={s.status === st ? "default" : "outline"}
                              className="h-7 text-[11px] px-2"
                              onClick={() => advanceStage.mutate({ id: s.id, status: st })}>
                              {STAGE_STATUS_META[st].label}
                            </Button>
                          ))}
                          <div className="flex items-center gap-1 mr-auto">
                            {[25, 50, 75, 100].map(v => (
                              <Button key={v} size="sm" variant="outline" className="h-7 text-[11px] px-2"
                                onClick={() => advanceStage.mutate({ id: s.id, status: v === 100 ? "DONE" : s.status, progress: v })}>
                                {v}%
                              </Button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </section>

        {/* CHAT */}
        <section className="lg:col-span-2">
          <ProjectChat
            projectId={projectId}
            isAdmin={isAdmin}
            currentUserId={user?.id}
            messages={messages.data ?? []}
            loading={messages.isLoading}
          />
        </section>
      </div>

      {/* Stage form sheet */}
      <FormSheet
        open={stageOpen} onOpenChange={(v) => { setStageOpen(v); if (!v) setEditStage(null); }}
        title={editStage ? "تعديل المرحلة" : "مرحلة جديدة"}
        submitText={editStage ? "حفظ" : "إضافة"}
        onSubmit={async (e) => {
          const fd = new FormData(e.currentTarget);
          const raw = Object.fromEntries(fd.entries()) as Record<string, string>;
          await saveStage.mutateAsync({
            id: editStage?.id,
            data: {
              title: raw.title,
              description: raw.description || null,
              status: raw.status || "PENDING",
              progress: Number(raw.progress || 0),
              weight: Number(raw.weight || 1),
              dueDate: raw.dueDate || null,
            },
          });
        }}
      >
        <div className="space-y-3">
          <div className="space-y-1.5"><Label>عنوان المرحلة *</Label>
            <Input name="title" required defaultValue={editStage?.title} /></div>
          <div className="space-y-1.5"><Label>الوصف</Label>
            <Textarea name="description" rows={3} defaultValue={editStage?.description ?? ""} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>الحالة</Label>
              <select name="status" defaultValue={editStage?.status ?? "PENDING"}
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
                {(["PENDING","IN_PROGRESS","BLOCKED","DONE","SKIPPED"] as const).map(s => (
                  <option key={s} value={s}>{STAGE_STATUS_META[s].label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5"><Label>التقدم %</Label>
              <Input name="progress" type="number" min={0} max={100} defaultValue={editStage?.progress ?? 0} /></div>
            <div className="space-y-1.5"><Label>الوزن (أهمية)</Label>
              <Input name="weight" type="number" min={1} max={100} defaultValue={editStage?.weight ?? 1} /></div>
            <div className="space-y-1.5"><Label>الاستحقاق</Label>
              <Input name="dueDate" type="date" defaultValue={editStage?.dueDate?.slice(0,10) ?? ""} /></div>
          </div>
        </div>
      </FormSheet>
    </div>
  );
}

function ProjectChat({ projectId, isAdmin, currentUserId, messages, loading }: {
  projectId: string; isAdmin: boolean; currentUserId?: string; messages: Message[]; loading: boolean;
}) {
  const qc = useQueryClient();
  const [content, setContent] = useState("");
  const [internal, setInternal] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  const visible = useMemo(() => messages, [messages]);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [visible.length]);

  const send = useMutation({
    mutationFn: (data: { content: string; isInternal?: boolean }) =>
      api.post(`/projects/${projectId}/messages`, data),
    onSuccess: () => {
      setContent("");
      qc.invalidateQueries({ queryKey: ["project", projectId, "messages"] });
    },
    onError: (e) => toast.error(apiError(e)),
  });

  return (
    <div className="rounded-xl border border-white/10 bg-slate-900/40 flex flex-col h-[560px]">
      <div className="p-3 border-b border-white/10 flex items-center gap-2">
        <MessageSquare className="h-4 w-4 text-cyan-400" />
        <div className="font-semibold text-sm">محادثة المشروع</div>
        <Badge variant="outline" className="mr-auto text-[10px]">{visible.length} رسالة</Badge>
      </div>

      <div ref={listRef} className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {loading ? (
          [1,2,3].map(i => <Skeleton key={i} className="h-16 rounded-lg" />)
        ) : !visible.length ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-xs text-muted-foreground gap-2">
            <MessageSquare className="h-8 w-8 opacity-30" />
            <div>لا توجد رسائل بعد — ابدأ المحادثة الآن.</div>
          </div>
        ) : visible.map((m) => {
          const mine = m.author.id === currentUserId;
          const isStaff = ["SUPER_ADMIN","ADMIN","SUPPORT","ACCOUNTANT"].includes(m.author.role);
          return (
            <div key={m.id} className={cn("flex flex-col gap-1", mine ? "items-end" : "items-start")}>
              <div className={cn(
                "max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap break-words",
                mine ? "bg-cyan-600/25 border border-cyan-500/30" :
                       isStaff ? "bg-blue-600/15 border border-blue-500/25" : "bg-slate-800/60 border border-white/5",
                m.isInternal && "ring-1 ring-amber-500/40"
              )}>
                {m.isInternal && (
                  <div className="flex items-center gap-1 text-[10px] text-amber-400 mb-1">
                    <Lock className="h-3 w-3" /> ملاحظة داخلية
                  </div>
                )}
                {m.content}
              </div>
              <div className="text-[10px] text-muted-foreground px-1">
                {m.author.name} • {new Date(m.createdAt).toLocaleString("ar-SA", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" })}
              </div>
            </div>
          );
        })}
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); if (content.trim()) send.mutate({ content: content.trim(), isInternal: internal }); }}
        className="p-3 border-t border-white/10 space-y-2"
      >
        <Textarea
          value={content} onChange={(e) => setContent(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); if (content.trim()) send.mutate({ content: content.trim(), isInternal: internal }); } }}
          rows={2} placeholder="اكتب رسالتك... (Ctrl+Enter للإرسال)"
          className="resize-none text-sm"
        />
        <div className="flex items-center gap-2">
          {isAdmin && (
            <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground cursor-pointer">
              <input type="checkbox" checked={internal} onChange={(e) => setInternal(e.target.checked)} className="accent-amber-500" />
              ملاحظة داخلية (لا يراها العميل)
            </label>
          )}
          <Button type="submit" size="sm" disabled={!content.trim() || send.isPending} className="mr-auto gap-1.5">
            <Send className="h-3.5 w-3.5" /> إرسال
          </Button>
        </div>
      </form>
    </div>
  );
}
