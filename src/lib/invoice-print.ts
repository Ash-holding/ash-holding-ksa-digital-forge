// Instant invoice preview & print (browser → Save as PDF)
// No external dependency — opens a print-ready RTL Arabic invoice in a new window.

type InvoiceLike = {
  invoiceNumber?: string;
  status?: string;
  total?: string | number;
  subtotal?: string | number;
  tax?: string | number;
  dueAt?: string | null;
  issueDate?: string | null;
  issuedAt?: string | null;
  createdAt?: string | null;
  client?: { user?: { name?: string }; company?: string; vatNumber?: string; email?: string; phone?: string } | null;
  project?: { title?: string } | null;
  items?: Array<{ description: string; qty?: number; unitPrice?: number | string; total?: number | string }>;
};

const fmtSAR = (n: number | string | undefined) =>
  new Intl.NumberFormat("ar-SA", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n ?? 0));

const fmtDate = (d?: string | null) => {
  if (!d) return "—";
  try {
    return new Intl.DateTimeFormat("ar-SA-u-ca-gregory", { year: "numeric", month: "long", day: "numeric" }).format(new Date(d));
  } catch { return "—"; }
};

const statusMap: Record<string, { label: string; color: string; bg: string }> = {
  PAID:      { label: "مدفوعة",  color: "#065f46", bg: "#d1fae5" },
  UNPAID:    { label: "غير مدفوعة", color: "#92400e", bg: "#fef3c7" },
  OVERDUE:   { label: "متأخرة",  color: "#991b1b", bg: "#fee2e2" },
  SENT:      { label: "مرسلة",   color: "#1e40af", bg: "#dbeafe" },
  DRAFT:     { label: "مسودة",   color: "#374151", bg: "#e5e7eb" },
  CANCELLED: { label: "ملغاة",   color: "#4b5563", bg: "#e5e7eb" },
};

export function openInvoicePrint(inv: InvoiceLike) {
  const total = Number(inv.total ?? 0);
  const subtotal = Number(inv.subtotal ?? (total ? total / 1.15 : 0));
  const tax = Number(inv.tax ?? (total - subtotal));
  const st = statusMap[inv.status ?? ""] ?? statusMap.DRAFT;
  const clientName = inv.client?.user?.name ?? "عميل";
  const projectTitle = inv.project?.title ?? "خدمات مهنية";
  const issueDate = fmtDate(inv.issueDate ?? inv.issuedAt ?? inv.createdAt);
  const dueDate = fmtDate(inv.dueAt);
  const invNo = inv.invoiceNumber ?? "INV-DRAFT";

  const items = inv.items?.length
    ? inv.items
    : [{ description: projectTitle, qty: 1, unitPrice: subtotal, total: subtotal }];

  const rowsHtml = items.map((it, i) => `
    <tr>
      <td class="c">${i + 1}</td>
      <td class="desc">${it.description}</td>
      <td class="c">${it.qty ?? 1}</td>
      <td class="l">${fmtSAR(it.unitPrice ?? it.total)} ر.س</td>
      <td class="l">${fmtSAR(it.total ?? Number(it.unitPrice ?? 0) * Number(it.qty ?? 1))} ر.س</td>
    </tr>`).join("");

  const html = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
<meta charset="utf-8" />
<title>فاتورة ${invNo}</title>
<meta name="viewport" content="width=device-width,initial-scale=1" />
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
  *,*::before,*::after{box-sizing:border-box}
  html,body{margin:0;padding:0;font-family:"IBM Plex Sans Arabic",system-ui,sans-serif;color:#0f172a;background:#f1f5f9;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .toolbar{position:sticky;top:0;z-index:10;display:flex;gap:8px;justify-content:center;padding:12px;background:rgba(15,23,42,.92);backdrop-filter:blur(8px)}
  .toolbar button{border:0;padding:10px 18px;border-radius:10px;font:600 14px "IBM Plex Sans Arabic";cursor:pointer;transition:transform .1s}
  .toolbar button:hover{transform:translateY(-1px)}
  .btn-primary{background:linear-gradient(135deg,#00E5FF,#7C3AED);color:#fff;box-shadow:0 6px 20px -4px rgba(124,58,237,.6)}
  .btn-ghost{background:#334155;color:#fff}
  .page{max-width:820px;margin:24px auto;background:#fff;box-shadow:0 20px 60px -20px rgba(15,23,42,.35);border-radius:16px;overflow:hidden}
  .top{position:relative;padding:32px 36px;background:linear-gradient(135deg,#0f172a 0%,#1e1b4b 55%,#312e81 100%);color:#fff;overflow:hidden}
  .top::before{content:"";position:absolute;inset:auto -30% -60% auto;width:420px;height:420px;background:radial-gradient(circle,rgba(0,229,255,.35),transparent 60%);}
  .top::after{content:"";position:absolute;inset:-40% auto auto -20%;width:340px;height:340px;background:radial-gradient(circle,rgba(124,58,237,.35),transparent 60%);}
  .top-inner{position:relative;display:flex;justify-content:space-between;align-items:flex-start;gap:24px;flex-wrap:wrap}
  .brand{display:flex;align-items:center;gap:14px}
  .logo{width:56px;height:56px;border-radius:14px;background:linear-gradient(135deg,#00E5FF,#7C3AED);display:grid;place-items:center;font:800 22px "IBM Plex Sans Arabic";color:#fff;box-shadow:0 8px 24px -6px rgba(0,229,255,.55)}
  .brand h1{margin:0;font-size:20px;font-weight:700;letter-spacing:.2px}
  .brand p{margin:2px 0 0;font-size:12px;color:#c7d2fe;opacity:.9}
  .invmeta{text-align:left;direction:ltr}
  .invmeta .label{font-size:11px;color:#a5b4fc;text-transform:uppercase;letter-spacing:2px}
  .invmeta .num{margin:4px 0 10px;font:700 22px ui-monospace,monospace}
  .status{display:inline-block;padding:6px 14px;border-radius:999px;font:600 12px "IBM Plex Sans Arabic";background:${st.bg};color:${st.color}}
  .parties{display:grid;grid-template-columns:1fr 1fr;gap:20px;padding:28px 36px;background:#f8fafc;border-bottom:1px solid #e2e8f0}
  .party h3{margin:0 0 8px;font-size:11px;letter-spacing:2px;color:#64748b;text-transform:uppercase}
  .party .name{font-size:15px;font-weight:700;color:#0f172a;margin-bottom:6px}
  .party .line{font-size:12.5px;color:#475569;line-height:1.8}
  .dates{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;padding:20px 36px;border-bottom:1px solid #e2e8f0}
  .date-box{padding:12px 14px;border-radius:12px;background:linear-gradient(135deg,#f8fafc,#eef2ff);border:1px solid #e0e7ff}
  .date-box .k{font-size:10px;letter-spacing:1.5px;color:#6366f1;text-transform:uppercase;font-weight:600}
  .date-box .v{margin-top:4px;font-size:13.5px;font-weight:700;color:#0f172a}
  table{width:100%;border-collapse:collapse;font-size:13px}
  thead th{background:linear-gradient(135deg,#0f172a,#312e81);color:#fff;font:600 12px "IBM Plex Sans Arabic";padding:14px 12px;text-align:right;letter-spacing:.5px}
  thead th.l{text-align:left}thead th.c{text-align:center}
  tbody td{padding:14px 12px;border-bottom:1px solid #f1f5f9;color:#334155}
  tbody td.c{text-align:center}tbody td.l{text-align:left;font-variant-numeric:tabular-nums;font-weight:600;color:#0f172a}
  tbody tr:hover{background:#f8fafc}
  .desc{font-weight:600;color:#0f172a}
  .totals{display:grid;grid-template-columns:1fr 320px;gap:20px;padding:24px 36px 32px;background:#fafbff}
  .notes{font-size:12px;color:#64748b;line-height:1.8;padding:14px;border-right:3px solid #7C3AED;background:#faf5ff;border-radius:8px}
  .sum{display:flex;flex-direction:column;gap:8px}
  .sum-row{display:flex;justify-content:space-between;font-size:13px;padding:8px 14px;color:#475569}
  .sum-row.grand{margin-top:6px;padding:16px;font:700 17px "IBM Plex Sans Arabic";color:#fff;background:linear-gradient(135deg,#00E5FF,#7C3AED);border-radius:12px;box-shadow:0 10px 30px -10px rgba(124,58,237,.5)}
  .sum-row .amt{font-variant-numeric:tabular-nums;direction:ltr}
  .footer{padding:20px 36px;border-top:2px dashed #e2e8f0;display:flex;justify-content:space-between;flex-wrap:wrap;gap:12px;font-size:11.5px;color:#64748b}
  .footer strong{color:#0f172a}
  .stamp{position:relative;padding:16px 36px;text-align:center;font-size:11px;color:#94a3b8;letter-spacing:1px}
  @media print{
    .toolbar{display:none}
    body{background:#fff}
    .page{margin:0;box-shadow:none;border-radius:0;max-width:none}
  }
  @page{size:A4;margin:12mm}
</style>
</head>
<body>
  <div class="toolbar">
    <button class="btn-primary" onclick="window.print()">⬇ حفظ كـ PDF / طباعة</button>
    <button class="btn-ghost" onclick="window.close()">إغلاق</button>
  </div>
  <div class="page">
    <div class="top">
      <div class="top-inner">
        <div class="brand">
          <div class="logo">ش</div>
          <div>
            <h1>ASH HOLDING</h1>
            <p>الشركة السعودية للحلول الرقمية</p>
          </div>
        </div>
        <div class="invmeta">
          <div class="label">INVOICE</div>
          <div class="num">${invNo}</div>
          <span class="status">${st.label}</span>
        </div>
      </div>
    </div>

    <div class="parties">
      <div class="party">
        <h3>من</h3>
        <div class="name">ASH HOLDING</div>
        <div class="line">الرياض، المملكة العربية السعودية</div>
        <div class="line">الرقم الضريبي: 300000000000003</div>
        <div class="line">billing@ash-holding.sa</div>
      </div>
      <div class="party">
        <h3>إلى</h3>
        <div class="name">${clientName}</div>
        <div class="line">${inv.client?.company ?? "—"}</div>
        <div class="line">${inv.client?.email ?? ""}</div>
        <div class="line">${inv.client?.phone ?? ""}</div>
      </div>
    </div>

    <div class="dates">
      <div class="date-box"><div class="k">تاريخ الإصدار</div><div class="v">${issueDate}</div></div>
      <div class="date-box"><div class="k">تاريخ الاستحقاق</div><div class="v">${dueDate}</div></div>
      <div class="date-box"><div class="k">المشروع</div><div class="v">${projectTitle}</div></div>
    </div>

    <table>
      <thead>
        <tr>
          <th class="c" style="width:48px">#</th>
          <th>الوصف</th>
          <th class="c" style="width:70px">الكمية</th>
          <th class="l" style="width:130px">سعر الوحدة</th>
          <th class="l" style="width:140px">الإجمالي</th>
        </tr>
      </thead>
      <tbody>${rowsHtml}</tbody>
    </table>

    <div class="totals">
      <div class="notes">
        <strong>شروط الدفع:</strong> يستحق السداد خلال 30 يومًا من تاريخ الإصدار. يرجى إرفاق رقم الفاتورة عند التحويل البنكي.
        <br/><strong>البنك:</strong> مصرف الراجحي — SA00 0000 0000 0000 0000 0000
      </div>
      <div class="sum">
        <div class="sum-row"><span>المجموع الفرعي</span><span class="amt">${fmtSAR(subtotal)} ر.س</span></div>
        <div class="sum-row"><span>ضريبة القيمة المضافة (15%)</span><span class="amt">${fmtSAR(tax)} ر.س</span></div>
        <div class="sum-row grand"><span>الإجمالي المستحق</span><span class="amt">${fmtSAR(total)} ر.س</span></div>
      </div>
    </div>

    <div class="footer">
      <div><strong>شكراً لثقتكم بنا</strong> — نتطلع لخدمتكم دائمًا.</div>
      <div>www.ash-holding.sa · +966 11 000 0000</div>
    </div>
    <div class="stamp">تم إنشاء هذه الفاتورة إلكترونيًا ولا تحتاج إلى توقيع.</div>
  </div>
  <script>
    // Auto-focus for keyboard shortcut Ctrl/Cmd+P
    window.addEventListener('load', () => { setTimeout(() => window.focus(), 100); });
  </script>
</body>
</html>`;

  const w = window.open("", "_blank", "width=900,height=1000");
  if (!w) return false;
  w.document.open();
  w.document.write(html);
  w.document.close();
  return true;
}
