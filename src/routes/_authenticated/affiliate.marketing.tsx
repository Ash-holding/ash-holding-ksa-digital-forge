import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Copy, Megaphone, Download } from "lucide-react";
import { toast } from "sonner";
import { api, fileUrl } from "@/lib/api";

export const Route = createFileRoute("/_authenticated/affiliate/marketing")({
  component: MarketingCenter,
});

type Material = {
  id: string; title: string; type: string; category?: string | null;
  content: string; filePath?: string | null; tags: string[];
};

const TYPE_LABELS: Record<string, string> = {
  TEXT: "نصوص", WHATSAPP: "واتساب", SOCIAL: "سوشيال",
  EMAIL: "إيميل", LANDING_LINK: "روابط", PROFILE: "بروفايل",
  OFFER: "عروض", LOGO: "شعارات", GUIDE: "أدلة",
};

function MarketingCenter() {
  const [filter, setFilter] = useState<string>("ALL");
  const { data, isLoading } = useQuery({
    queryKey: ["affiliate-marketing"],
    queryFn: async () => (await api.get("/affiliate/marketing")).data as { items: Material[]; code: string },
  });

  const items = data?.items || [];
  const types = Array.from(new Set(items.map(i => i.type)));
  const shown = filter === "ALL" ? items : items.filter(i => i.type === filter);

  const personalize = (content: string) =>
    content.replaceAll("{{code}}", data?.code || "").replaceAll("{{link}}", `${window.location.origin}/?ref=${data?.code || ""}`);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">المركز التسويقي</h1>
        <p className="text-sm text-muted-foreground">قوالب جاهزة وأصول تسويقية معتمدة من ASH لمشاركتها مع جمهورك.</p>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2">
        <button onClick={() => setFilter("ALL")}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap ${filter === "ALL" ? "bg-amber-500 text-white" : "bg-muted text-muted-foreground"}`}>
          الكل
        </button>
        {types.map(t => (
          <button key={t} onClick={() => setFilter(t)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap ${filter === t ? "bg-amber-500 text-white" : "bg-muted text-muted-foreground"}`}>
            {TYPE_LABELS[t] || t}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="grid gap-3 md:grid-cols-2">{[1,2,3,4].map(i => <div key={i} className="h-40 rounded-xl bg-muted/40 animate-pulse" />)}</div>
      ) : !shown.length ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center">
          <Megaphone className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <div className="font-semibold">لا توجد مواد تسويقية بعد</div>
          <div className="text-sm text-muted-foreground mt-1">فريق ASH سيضيف قوالب قريباً</div>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {shown.map((m) => {
            const text = personalize(m.content);
            return (
              <div key={m.id} className="rounded-xl border border-border bg-card/40 p-4 flex flex-col">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="font-bold">{m.title}</div>
                    <div className="text-[10px] text-muted-foreground">{TYPE_LABELS[m.type] || m.type} {m.category && `· ${m.category}`}</div>
                  </div>
                </div>
                <div className="flex-1 rounded-lg bg-muted/30 p-3 text-sm whitespace-pre-wrap leading-loose max-h-40 overflow-auto mb-3">
                  {text}
                </div>
                {m.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {m.tags.map(t => <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-muted">{t}</span>)}
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <button onClick={() => { navigator.clipboard.writeText(text); toast.success("تم نسخ النص"); }}
                    className="flex-1 rounded-lg bg-amber-500/10 text-amber-500 px-3 py-2 text-xs font-bold flex items-center justify-center gap-1">
                    <Copy className="h-3 w-3" /> نسخ
                  </button>
                  {m.filePath && (
                    <a href={fileUrl(m.filePath)} download target="_blank" rel="noreferrer"
                      className="rounded-lg border border-border px-3 py-2 text-xs font-bold flex items-center gap-1">
                      <Download className="h-3 w-3" /> تنزيل
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
