
/* ---------- Proposal Builder (admin) ---------- */
function ProposalBuilder({
  requestId, existing, onSaved,
}: {
  requestId: string;
  existing: {
    amount: number | null; scope: string; durationDays: number | null; validUntil: string;
    sentAt: string | null; revisionNote: string | null; revisionCount: number;
    signedAt: string | null; signatureHash: string | null; linkedInvoiceId: string | null;
  };
  onSaved: () => void;
}) {
  const [amount, setAmount] = useState(existing.amount != null ? String(existing.amount) : "");
  const [scope, setScope] = useState(existing.scope);
  const [durationDays, setDurationDays] = useState(existing.durationDays != null ? String(existing.durationDays) : "");
  const [validUntil, setValidUntil] = useState(existing.validUntil);
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);

  const signed = !!existing.signedAt;

  async function send() {
    if (!amount || !scope || scope.length < 10 || !durationDays) {
      toast.error("أكمل قيمة العرض والنطاق والمدة");
      return;
    }
    setSending(true);
    try {
      await api.post(`/projects/requests/${requestId}/proposal`, {
        amount: Number(amount),
        scope,
        durationDays: Number(durationDays),
        validUntil: validUntil || null,
        note: note || null,
      });
      toast.success("تم إرسال العرض للعميل عبر واتساب");
      setNote("");
      onSaved();
    } catch (e) { toast.error(apiError(e)); }
    finally { setSending(false); }
  }

  return (
    <section className="rounded-2xl border border-electric/30 bg-gradient-to-br from-electric/5 via-card to-purple-accent/5 p-4 md:p-5 space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <div className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-electric to-purple-accent text-white shadow-glow">
          <Receipt className="h-4 w-4" />
        </div>
        <div>
          <h3 className="text-[13px] font-black">عرض السعر الرسمي</h3>
          <div className="text-[10px] text-muted-foreground">
            يُرسل للعميل عبر واتساب وينتقل الطلب لحالة «عرض مُرسَل».
          </div>
        </div>
        {existing.sentAt && (
          <span className="ms-auto rounded-full bg-cyan-500/15 px-2.5 py-1 text-[10px] font-bold text-cyan-400 ring-1 ring-cyan-500/30">
            آخر إرسال: {formatDate(existing.sentAt)}
          </span>
        )}
      </div>

      {existing.revisionNote && !signed && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-[12px] leading-relaxed">
          <div className="font-bold text-amber-500 mb-1 flex items-center gap-1.5">
            <MessageSquare className="h-3.5 w-3.5" /> طلب تعديل من العميل ({existing.revisionCount})
          </div>
          <div className="whitespace-pre-wrap text-amber-200/90">{existing.revisionNote}</div>
        </div>
      )}

      {signed ? (
        <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-[12px] leading-relaxed">
          <div className="font-bold text-emerald-400 mb-2 flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4" /> تم توقيع العرض رقمياً
          </div>
          <div className="grid grid-cols-2 gap-2 text-[11px] text-emerald-200/80">
            <div>تاريخ التوقيع: <span className="font-bold text-emerald-100">{formatDate(existing.signedAt)}</span></div>
            <div>الفاتورة: <span className="font-bold text-emerald-100" dir="ltr">{existing.linkedInvoiceId ? "صادرة ✓" : "—"}</span></div>
            <div className="col-span-2 truncate">بصمة التوقيع: <span className="font-mono text-[10px] text-emerald-100/70" dir="ltr">{existing.signatureHash?.slice(0, 32)}…</span></div>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Field label="قيمة العرض (ر.س)">
              <Input type="number" step="100" value={amount} onChange={(e) => setAmount(e.target.value)} dir="ltr" />
            </Field>
            <Field label="المدة (أيام)">
              <Input type="number" min={1} value={durationDays} onChange={(e) => setDurationDays(e.target.value)} dir="ltr" />
            </Field>
            <Field label="صالح حتى">
              <Input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
            </Field>
          </div>
          <Field label="نطاق العمل (يظهر للعميل)">
            <Textarea rows={5} value={scope} onChange={(e) => setScope(e.target.value)}
              placeholder="اذكر المخرجات، المراحل، ما يشمل وما لا يشمله العرض…" />
          </Field>
          <Field label="ملاحظة إدارية للعميل (اختياري)">
            <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="رسالة قصيرة ترسل مع العرض" />
          </Field>
          <div className="flex items-center gap-2 flex-wrap">
            <Button onClick={send} disabled={sending}
              className="gap-1.5 bg-gradient-to-r from-electric to-purple-accent shadow-glow">
              <Send className="h-4 w-4" /> {sending ? "جارٍ الإرسال…" : existing.sentAt ? "إعادة إرسال العرض" : "إرسال العرض للعميل"}
            </Button>
            {existing.amount && (
              <Button variant="outline" size="sm" className="gap-1.5"
                onClick={() => api.post(`/projects/requests/${requestId}/request-signature`)
                  .then(() => { toast.success("تم إرسال رمز التوقيع للعميل"); onSaved(); })
                  .catch((e) => toast.error(apiError(e)))}>
                <PenLine className="h-3.5 w-3.5" /> طلب توقيع نهائي
              </Button>
            )}
          </div>
        </>
      )}
    </section>
  );
}
