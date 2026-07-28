import { useState, useRef, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  MessageSquare, Send, Plus, Trash2, Layers, Calendar, Wallet,
  CheckCircle2, Clock, Ban, PlayCircle, Pencil, Lock, User as UserIcon,
  Sparkles, TrendingUp, ChevronRight,
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

const STAGE_META: Record<Stage["status"], { label: string; icon: typeof Clock; tone: string; dot: string; ring: string }> = {
  PENDING:     { label: "لم تبدأ",     icon: Clock,        tone: "bg-muted text-muted-foreground border-border",              dot: "bg-muted-foreground/40",  ring: "ring-border" },
  IN_PROGRESS: { label: "قيد التنفيذ", icon: PlayCircle,   tone: "bg-electric/10 text-electric border-electric/25",           dot: "bg-electric",             ring: "ring-electric/30" },
  BLOCKED:     { label: "متوقفة",      icon: Ban,          tone: "bg-destructive/10 text-destructive border-destructive/25",  dot: "bg-destructive",          ring: "ring-destructive/30" },
  DONE:        { label: "مكتملة",      icon: CheckCircle2, tone: "bg-emerald-500/10 text-emerald-600 border-emerald-500/25",  dot: "bg-emerald-500",          ring: "ring-emerald-500/30" },
  SKIPPED:     { label: "متجاوزة",     icon: Clock,        tone: "bg-muted text-muted-foreground border-border",              dot: "bg-muted-foreground/40",  ring: "ring-border" },
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
  const stagesList = stages.data ?? [];
  const doneCount = stagesList.filter(s => s.status === "DONE").length;
  const activeCount = stagesList.filter(s => s.status === "IN_PROGRESS").length;

  return (
    <div className="space-y-6 pb-10">
      {/* HERO */}
      {project.isLoading ? (
        <Skeleton className="h-52 rounded-3xl" />
      ) : p ? (
        <div className="relative overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
          {/* subtle decorative gradient */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,color-mix(in_oklab,var(--electric)_10%,transparent),transparent_60%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,color-mix(in_oklab,var(--cyan-accent)_8%,transparent),transparent_55%)]" />

          <div className="relative p-6 md:p-8">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap mb-3">
                  <Badge variant="outline" className="gap-1.5 bg-background/60 backdrop-blur">
                    <Layers className="h-3 w-3" />
                    <span className="font-mono text-[10px]">#{p.id.slice(0, 6).toUpperCase()}</span>
                  </Badge>
                  <StatusBadge value={p.status} />
                </div>

                <h1 className="text-2xl md:text-4xl font-bold tracking-tight text-foreground">
                  {p.title}
                </h1>

                {p.description && (
                  <p className="mt-3 text-sm md:text-base text-muted-foreground max-w-2xl leading-relaxed line-clamp-3">
                    {p.description}
                  </p>
                )}

                <div className="mt-5 flex flex-wrap gap-2">
                  <MetaPill icon={UserIcon} label={p.client.user.name} />
                  {p.dueDate && <MetaPill icon={Calendar} label={`التسليم ${formatDate(p.dueDate)}`} />}
                  {p.budget && (
                    <div className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/70 backdrop-blur px-3 py-1.5 text-xs font-medium">
                      <Wallet className="h-3.5 w-3.5 text-electric" />
                      <Money value={p.budget} />
                    </div>
                  )}
                </div>
              </div>

              {/* progress card */}
              <div className="lg:w-72 shrink-0 rounded-2xl border border-border bg-background/80 backdrop-blur p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-xs font-medium text-muted-foreground">التقدم الإجمالي</div>
                  <TrendingUp className="h-4 w-4 text-electric" />
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold tabular-nums bg-gradient-to-l from-electric to-cyan-accent bg-clip-text text-transparent">
                    {p.progress}
                  </span>
                  <span className="text-lg font-semibold text-muted-foreground">%</span>
                </div>
                <Progress value={p.progress} className="h-2 mt-3" />

                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                  <MiniStat label="المراحل" value={stagesList.length} />
                  <MiniStat label="نشطة" value={activeCount} tone="text-electric" />
                  <MiniStat label="مكتملة" value={doneCount} tone="text-emerald-600" />
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* BENTO: Stages + Chat */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* STAGES */}
        <section className="lg:col-span-3 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold flex items-center gap-2">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-electric/10 text-electric">
                  <Layers className="h-4 w-4" />
                </span>
                مراحل المشروع
              </h2>
              <p className="text-xs text-muted-foreground mt-1 pr-10">
                تتبّع كل مرحلة على حدة — التقدم يُحتسب تلقائياً وفق وزن كل مرحلة.
              </p>
            </div>
            {isAdmin && (
              <Button size="sm" onClick={() => { setEditStage(null); setStageOpen(true); }} className="gap-1.5 shrink-0">
                <Plus className="h-4 w-4" /> مرحلة
              </Button>
            )}
          </div>

          {stages.isLoading ? (
            <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-28 rounded-2xl" />)}</div>
          ) : !stagesList.length ? (
            <EmptyStages isAdmin={isAdmin} onAdd={() => setStageOpen(true)} />
          ) : (
            <ol className="space-y-3">
              {stagesList.map((s, i) => {
                const meta = STAGE_META[s.status];
                const Icon = meta.icon;
                const isLast = i === stagesList.length - 1;
                return (
                  <li key={s.id} className="relative">
                    {/* connector line */}
                    {!isLast && (
                      <span className="absolute top-11 right-[22px] h-[calc(100%-16px)] w-px bg-gradient-to-b from-border to-transparent" />
                    )}

                    <div className="flex gap-3">
                      {/* step marker */}
                      <div className={cn(
                        "relative shrink-0 h-11 w-11 rounded-2xl border bg-card flex items-center justify-center ring-4 ring-offset-0",
                        meta.ring
                      )}>
                        <span className="text-sm font-bold tabular-nums text-foreground">{i + 1}</span>
                        <span className={cn("absolute -bottom-1 -left-1 h-3 w-3 rounded-full border-2 border-card", meta.dot)} />
                      </div>

                      {/* card */}
                      <div className="flex-1 min-w-0 rounded-2xl border border-border bg-card hover:border-electric/40 hover:shadow-sm transition-all p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-semibold text-foreground">{s.title}</h3>
                              <Badge variant="outline" className={cn("gap-1 text-[10px] h-5", meta.tone)}>
                                <Icon className="h-3 w-3" /> {meta.label}
                              </Badge>
                            </div>
                            {s.dueDate && (
                              <div className="mt-1 text-[11px] text-muted-foreground flex items-center gap-1">
                                <Calendar className="h-3 w-3" /> استحقاق {formatDate(s.dueDate)}
                              </div>
                            )}
                            {s.description && (
                              <p className="mt-2 text-xs text-muted-foreground leading-relaxed">{s.description}</p>
                            )}
                          </div>
                          {isAdmin && (
                            <div className="flex items-center gap-0.5 shrink-0">
                              <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => { setEditStage(s); setStageOpen(true); }}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <ConfirmDialog
                                title="حذف المرحلة" description="سيتم حذف المرحلة نهائياً."
                                onConfirm={async () => { await delStage.mutateAsync(s.id); }}
                                trigger={<Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>}
                              />
                            </div>
                          )}
                        </div>

                        <div className="mt-3 flex items-center gap-3">
                          <Progress value={s.progress} className="h-1.5 flex-1" />
                          <span className="text-[11px] font-semibold tabular-nums w-10 text-left text-muted-foreground">{s.progress}%</span>
                        </div>

                        {isAdmin && (
                          <div className="mt-3 pt-3 border-t border-border/60 flex flex-wrap items-center gap-1.5">
                            <span className="text-[10px] text-muted-foreground ml-1">الحالة:</span>
                            {(["PENDING","IN_PROGRESS","BLOCKED","DONE"] as const).map(st => (
                              <Button key={st} size="sm" variant={s.status === st ? "default" : "outline"}
                                className="h-7 text-[11px] px-2.5"
                                onClick={() => advanceStage.mutate({ id: s.id, status: st, progress: st === "DONE" ? 100 : s.progress })}>
                                {STAGE_META[st].label}
                              </Button>
                            ))}
                            <div className="flex items-center gap-1 mr-auto">
                              <span className="text-[10px] text-muted-foreground">تقدم:</span>
                              {[25, 50, 75, 100].map(v => (
                                <Button key={v} size="sm" variant="ghost" className="h-7 text-[11px] px-2 hover:bg-electric/10 hover:text-electric"
                                  onClick={() => advanceStage.mutate({ id: s.id, status: v === 100 ? "DONE" : "IN_PROGRESS", progress: v })}>
                                  {v}%
                                </Button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
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
                  <option key={s} value={s}>{STAGE_META[s].label}</option>
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

function MetaPill({ icon: Icon, label }: { icon: typeof Clock; label: string }) {
  return (
    <div className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/70 backdrop-blur px-3 py-1.5 text-xs font-medium text-foreground">
      <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      {label}
    </div>
  );
}

function MiniStat({ label, value, tone }: { label: string; value: number; tone?: string }) {
  return (
    <div className="rounded-lg bg-muted/50 px-2 py-1.5">
      <div className={cn("text-base font-bold tabular-nums leading-none", tone ?? "text-foreground")}>{value}</div>
      <div className="text-[10px] text-muted-foreground mt-0.5">{label}</div>
    </div>
  );
}

function EmptyStages({ isAdmin, onAdd }: { isAdmin: boolean; onAdd: () => void }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card/50 p-10 text-center">
      <div className="mx-auto h-12 w-12 rounded-2xl bg-electric/10 flex items-center justify-center mb-3">
        <Sparkles className="h-6 w-6 text-electric" />
      </div>
      <div className="font-semibold">لا توجد مراحل بعد</div>
      <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
        قسّم المشروع إلى مراحل واضحة ليتابع العميل التقدم أولاً بأول.
      </p>
      {isAdmin && (
        <Button size="sm" className="mt-4 gap-1.5" onClick={onAdd}>
          <Plus className="h-4 w-4" /> إضافة أول مرحلة
          <ChevronRight className="h-4 w-4 rotate-180" />
        </Button>
      )}
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
    <div className="rounded-2xl border border-border bg-card shadow-sm flex flex-col h-[620px] sticky top-4">
      <div className="p-4 border-b border-border flex items-center gap-2">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-electric/10 text-electric">
          <MessageSquare className="h-4 w-4" />
        </span>
        <div>
          <div className="font-semibold text-sm leading-tight">محادثة المشروع</div>
          <div className="text-[10px] text-muted-foreground">تحديث مباشر • ردود فورية</div>
        </div>
        <Badge variant="secondary" className="mr-auto text-[10px] tabular-nums">{visible.length}</Badge>
      </div>

      <div ref={listRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-gradient-to-b from-muted/30 to-transparent">
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-14 w-3/4 rounded-2xl" />
            <Skeleton className="h-14 w-2/3 rounded-2xl mr-auto" />
            <Skeleton className="h-14 w-3/4 rounded-2xl" />
          </div>
        ) : !visible.length ? (
          <div className="h-full flex flex-col items-center justify-center text-center gap-3 py-8">
            <div className="h-14 w-14 rounded-2xl bg-electric/10 flex items-center justify-center">
              <MessageSquare className="h-7 w-7 text-electric" />
            </div>
            <div>
              <div className="text-sm font-semibold">ابدأ المحادثة</div>
              <div className="text-xs text-muted-foreground mt-1 max-w-[220px]">
                اسأل عن التقدم، اطلب تعديلات، أو شارك ملفات — كل شي في مكان واحد.
              </div>
            </div>
          </div>
        ) : visible.map((m) => {
          const mine = m.author.id === currentUserId;
          const isStaff = ["SUPER_ADMIN","ADMIN","SUPPORT","ACCOUNTANT"].includes(m.author.role);
          return (
            <div key={m.id} className={cn("flex gap-2", mine ? "flex-row-reverse" : "flex-row")}>
              <div className={cn(
                "shrink-0 h-8 w-8 rounded-full flex items-center justify-center text-[11px] font-bold",
                mine ? "bg-electric text-primary-foreground" :
                       isStaff ? "bg-cyan-accent/20 text-cyan-accent" : "bg-muted text-muted-foreground"
              )}>
                {m.author.name.charAt(0)}
              </div>
              <div className={cn("flex flex-col gap-1 min-w-0 max-w-[80%]", mine ? "items-end" : "items-start")}>
                <div className={cn(
                  "rounded-2xl px-3.5 py-2 text-sm leading-relaxed whitespace-pre-wrap break-words shadow-sm",
                  mine ? "bg-electric text-primary-foreground rounded-tr-sm" :
                         isStaff ? "bg-card border border-border rounded-tl-sm" :
                                   "bg-muted rounded-tl-sm",
                  m.isInternal && "ring-2 ring-orange-accent/50"
                )}>
                  {m.isInternal && (
                    <div className={cn("flex items-center gap-1 text-[10px] mb-1 font-semibold", mine ? "text-primary-foreground/80" : "text-orange-accent")}>
                      <Lock className="h-3 w-3" /> ملاحظة داخلية
                    </div>
                  )}
                  {m.content}
                </div>
                <div className="text-[10px] text-muted-foreground px-1">
                  {isStaff && !mine && <span className="text-cyan-accent font-medium">فريق ASH • </span>}
                  {m.author.name} • {new Date(m.createdAt).toLocaleString("ar-SA", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" })}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); if (content.trim()) send.mutate({ content: content.trim(), isInternal: internal }); }}
        className="p-3 border-t border-border bg-card space-y-2"
      >
        <Textarea
          value={content} onChange={(e) => setContent(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); if (content.trim()) send.mutate({ content: content.trim(), isInternal: internal }); } }}
          rows={2} placeholder="اكتب رسالتك... (Ctrl+Enter للإرسال)"
          className="resize-none text-sm border-border focus-visible:ring-electric/40"
        />
        <div className="flex items-center gap-2">
          {isAdmin && (
            <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground cursor-pointer select-none">
              <input type="checkbox" checked={internal} onChange={(e) => setInternal(e.target.checked)} className="accent-orange-accent" />
              <Lock className="h-3 w-3" /> ملاحظة داخلية
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
