// Instant invoice PDF download — renders styled HTML inside an isolated iframe,
// snapshots with html2canvas, embeds into a jsPDF A4 page, triggers direct download.

import html2canvas from "html2canvas";
import jsPDF from "jspdf";

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
  notes?: string | null;
  client?: { user?: { name?: string }; company?: string; vatNumber?: string; email?: string; phone?: string; address?: string } | null;
  project?: { title?: string } | null;
  items?: Array<{ description: string; qty?: number; unitPrice?: number | string; total?: number | string }>;
};

const fmtSAR = (n: number | string | undefined) =>
  new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n ?? 0));

const fmtDate = (d?: string | null) => {
  if (!d) return "—";
  try {
    return new Intl.DateTimeFormat("ar-SA-u-ca-gregory-nu-latn", { year: "numeric", month: "long", day: "numeric" }).format(new Date(d));
  } catch { return "—"; }
};

const statusMap: Record<string, { label: string; color: string; bg: string; border: string }> = {
  PAID:      { label: "مدفوعة",     color: "#065f46", bg: "#d1fae5", border: "#10b981" },
  UNPAID:    { label: "غير مدفوعة", color: "#92400e", bg: "#fef3c7", border: "#f59e0b" },
  OVERDUE:   { label: "متأخرة",     color: "#991b1b", bg: "#fee2e2", border: "#ef4444" },
  SENT:      { label: "مرسلة",      color: "#1e40af", bg: "#dbeafe", border: "#3b82f6" },
  DRAFT:     { label: "مسودة",      color: "#374151", bg: "#e5e7eb", border: "#9ca3af" },
  CANCELLED: { label: "ملغاة",      color: "#4b5563", bg: "#e5e7eb", border: "#9ca3af" },
};

function buildInvoiceNode(inv: InvoiceLike): HTMLDivElement {
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
    : [
        { description: projectTitle, qty: 1, unitPrice: subtotal, total: subtotal },
      ];

  // Cell base styles — NOTE: never apply letter-spacing on Arabic text (breaks shaping)
  const cellBase = "padding:12px 14px;border-bottom:1px solid #e2e8f0;border-left:1px solid #e2e8f0;font-size:12.5px";
  const cellFirst = "padding:12px 14px;border-bottom:1px solid #e2e8f0;font-size:12.5px";

  const rowsHtml = items.map((it, i) => `
    <tr style="background:${i % 2 === 0 ? "#ffffff" : "#f8fafc"}">
      <td style="${cellFirst};text-align:center;color:#475569;font-weight:600;width:40px">${i + 1}</td>
      <td style="${cellBase};color:#0f172a;font-weight:600">${it.description}</td>
      <td style="${cellBase};text-align:center;color:#334155;width:70px">${it.qty ?? 1}</td>
      <td style="${cellBase};text-align:left;font-variant-numeric:tabular-nums;color:#0f172a;width:130px">${fmtSAR(it.unitPrice ?? it.total)} <span style="color:#64748b;font-size:11px">ر.س</span></td>
      <td style="${cellBase};text-align:left;font-variant-numeric:tabular-nums;color:#0f172a;font-weight:700;width:140px">${fmtSAR(it.total ?? Number(it.unitPrice ?? 0) * Number(it.qty ?? 1))} <span style="color:#64748b;font-size:11px">ر.س</span></td>
    </tr>`).join("");

  const notes = inv.notes ?? "يرجى مراجعة بنود الفاتورة والتأكد من صحتها قبل السداد. لأي استفسار، تواصلوا مع قسم الحسابات على البريد billing@ash-holding.sa خلال أوقات العمل الرسمية.";

  const wrapper = document.createElement("div");
  wrapper.style.cssText = "position:fixed;left:-10000px;top:0;width:794px;background:#fff;color:#0f172a;direction:rtl;border:1px solid #cbd5e1;box-sizing:border-box";
  wrapper.setAttribute("dir", "rtl");
  wrapper.innerHTML = `
    <!-- Official Header -->
    <div style="background:linear-gradient(135deg,#0f172a 0%,#1e1b4b 55%,#312e81 100%);color:#fff;padding:26px 32px;border-bottom:4px solid #7C3AED">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:24px">
        <div style="display:flex;align-items:center;gap:14px">
          <div style="width:54px;height:54px;border-radius:12px;background:linear-gradient(135deg,#00E5FF,#7C3AED);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:22px;color:#fff;border:2px solid rgba(255,255,255,.2)">ش</div>
          <div>
            <div style="font-size:19px;font-weight:800">ASH HOLDING</div>
            <div style="font-size:12px;color:#c7d2fe;margin-top:3px">الشركة السعودية للحلول الرقمية</div>
            <div style="font-size:11px;color:#a5b4fc;margin-top:2px">سجل تجاري: 1010000000 · الرقم الضريبي: 300000000000003</div>
          </div>
        </div>
        <div style="text-align:left;direction:ltr;border-right:1px solid rgba(255,255,255,.15);padding-right:24px">
          <div style="font-size:11px;color:#a5b4fc;font-weight:600">TAX INVOICE / فاتورة ضريبية</div>
          <div style="margin:6px 0 10px;font-weight:800;font-size:22px;font-family:ui-monospace,monospace">${invNo}</div>
          <span style="display:inline-block;padding:6px 14px;border-radius:999px;font-weight:700;font-size:12px;background:${st.bg};color:${st.color};border:1px solid ${st.border}">${st.label}</span>
        </div>
      </div>
    </div>

    <!-- Parties Block -->
    <div style="display:grid;grid-template-columns:1fr 1fr;padding:0;background:#f8fafc;border-bottom:1px solid #cbd5e1">
      <div style="padding:20px 32px;border-left:1px solid #cbd5e1">
        <div style="font-size:11px;color:#64748b;margin-bottom:8px;font-weight:700">من / From</div>
        <div style="font-size:15px;font-weight:800;color:#0f172a;margin-bottom:6px">ASH HOLDING</div>
        <div style="font-size:12.5px;color:#475569;line-height:1.9">الرياض، المملكة العربية السعودية</div>
        <div style="font-size:12.5px;color:#475569;line-height:1.9">الرقم الضريبي: 300000000000003</div>
        <div style="font-size:12.5px;color:#475569;line-height:1.9">billing@ash-holding.sa · +966 11 000 0000</div>
      </div>
      <div style="padding:20px 32px">
        <div style="font-size:11px;color:#64748b;margin-bottom:8px;font-weight:700">إلى / To</div>
        <div style="font-size:15px;font-weight:800;color:#0f172a;margin-bottom:6px">${clientName}</div>
        <div style="font-size:12.5px;color:#475569;line-height:1.9">${inv.client?.company ?? "—"}</div>
        ${inv.client?.address ? `<div style="font-size:12.5px;color:#475569;line-height:1.9">${inv.client.address}</div>` : ""}
        <div style="font-size:12.5px;color:#475569;line-height:1.9">${inv.client?.email ?? ""}</div>
        <div style="font-size:12.5px;color:#475569;line-height:1.9">${inv.client?.phone ?? ""}</div>
      </div>
    </div>

    <!-- Meta Row -->
    <div style="display:grid;grid-template-columns:repeat(3,1fr);border-bottom:1px solid #cbd5e1">
      <div style="padding:16px 20px;border-left:1px solid #e2e8f0;background:#fff">
        <div style="font-size:10.5px;color:#6366f1;font-weight:700;margin-bottom:4px">تاريخ الإصدار</div>
        <div style="font-size:13.5px;font-weight:700;color:#0f172a">${issueDate}</div>
      </div>
      <div style="padding:16px 20px;border-left:1px solid #e2e8f0;background:#fff">
        <div style="font-size:10.5px;color:#6366f1;font-weight:700;margin-bottom:4px">تاريخ الاستحقاق</div>
        <div style="font-size:13.5px;font-weight:700;color:#0f172a">${dueDate}</div>
      </div>
      <div style="padding:16px 20px;background:#fff">
        <div style="font-size:10.5px;color:#6366f1;font-weight:700;margin-bottom:4px">المشروع</div>
        <div style="font-size:13.5px;font-weight:700;color:#0f172a">${projectTitle}</div>
      </div>
    </div>

    <!-- Items Table -->
    <div style="padding:20px 24px 8px">
      <div style="font-size:13px;font-weight:700;color:#0f172a;margin-bottom:10px;padding-right:8px;border-right:3px solid #7C3AED">بنود الفاتورة</div>
      <table style="width:100%;border-collapse:collapse;font-size:12.5px;border:1px solid #cbd5e1;border-radius:8px;overflow:hidden">
        <thead>
          <tr>
            <th style="background:#0f172a;color:#fff;padding:12px 14px;text-align:center;font-weight:700;font-size:12px;border-left:1px solid #1e293b">#</th>
            <th style="background:#0f172a;color:#fff;padding:12px 14px;text-align:right;font-weight:700;font-size:12px;border-left:1px solid #1e293b">الوصف</th>
            <th style="background:#0f172a;color:#fff;padding:12px 14px;text-align:center;font-weight:700;font-size:12px;border-left:1px solid #1e293b">الكمية</th>
            <th style="background:#0f172a;color:#fff;padding:12px 14px;text-align:left;font-weight:700;font-size:12px;border-left:1px solid #1e293b">سعر الوحدة</th>
            <th style="background:#0f172a;color:#fff;padding:12px 14px;text-align:left;font-weight:700;font-size:12px">الإجمالي</th>
          </tr>
        </thead>
        <tbody>${rowsHtml}</tbody>
      </table>
    </div>

    <!-- Totals + Payment Info -->
    <div style="display:grid;grid-template-columns:1fr 320px;gap:16px;padding:16px 24px 20px">
      <div style="border:1px solid #e2e8f0;border-radius:10px;padding:14px 16px;background:#fafbff">
        <div style="font-size:12px;font-weight:700;color:#0f172a;margin-bottom:8px;padding-right:8px;border-right:3px solid #7C3AED">تفاصيل الدفع</div>
        <div style="font-size:12px;color:#475569;line-height:1.9">
          <div><strong style="color:#0f172a">شروط الدفع:</strong> يستحق السداد خلال 30 يومًا من تاريخ الإصدار.</div>
          <div><strong style="color:#0f172a">البنك:</strong> مصرف الراجحي</div>
          <div style="direction:ltr;text-align:right;font-family:ui-monospace,monospace"><strong style="color:#0f172a">IBAN:</strong> SA00 0000 0000 0000 0000 0000</div>
          <div><strong style="color:#0f172a">المرجع:</strong> ${invNo}</div>
        </div>
      </div>
      <div style="border:1px solid #e2e8f0;border-radius:10px;overflow:hidden">
        <div style="display:flex;justify-content:space-between;font-size:12.5px;padding:10px 14px;color:#475569;border-bottom:1px solid #e2e8f0;background:#fff">
          <span>المجموع الفرعي</span><span style="direction:ltr;font-variant-numeric:tabular-nums;font-weight:600;color:#0f172a">${fmtSAR(subtotal)} ر.س</span>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:12.5px;padding:10px 14px;color:#475569;border-bottom:1px solid #e2e8f0;background:#fff">
          <span>ضريبة القيمة المضافة (15%)</span><span style="direction:ltr;font-variant-numeric:tabular-nums;font-weight:600;color:#0f172a">${fmtSAR(tax)} ر.س</span>
        </div>
        <div style="display:flex;justify-content:space-between;padding:14px 16px;font-weight:800;font-size:15px;color:#fff;background:linear-gradient(135deg,#00E5FF,#7C3AED)">
          <span>الإجمالي المستحق</span><span style="direction:ltr;font-variant-numeric:tabular-nums">${fmtSAR(total)} ر.س</span>
        </div>
      </div>
    </div>

    <!-- Notes -->
    <div style="margin:0 24px 20px;border:1px dashed #cbd5e1;border-radius:10px;padding:14px 16px;background:#fffdf7">
      <div style="font-size:12px;font-weight:700;color:#0f172a;margin-bottom:6px;padding-right:8px;border-right:3px solid #f59e0b">ملاحظات</div>
      <div style="font-size:12px;color:#475569;line-height:1.9">${notes}</div>
    </div>

    <!-- Official Footer -->
    <div style="border-top:2px solid #0f172a;background:#f8fafc">
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;padding:16px 24px;gap:16px">
        <div>
          <div style="font-size:10.5px;color:#64748b;font-weight:700;margin-bottom:4px">الشركة</div>
          <div style="font-size:11.5px;color:#0f172a;line-height:1.8;font-weight:600">ASH HOLDING</div>
          <div style="font-size:11px;color:#64748b;line-height:1.8">الرياض، المملكة العربية السعودية</div>
        </div>
        <div>
          <div style="font-size:10.5px;color:#64748b;font-weight:700;margin-bottom:4px">التواصل</div>
          <div style="font-size:11px;color:#0f172a;line-height:1.8">billing@ash-holding.sa</div>
          <div style="font-size:11px;color:#0f172a;line-height:1.8;direction:ltr;text-align:right">+966 11 000 0000</div>
        </div>
        <div>
          <div style="font-size:10.5px;color:#64748b;font-weight:700;margin-bottom:4px">المعرفات</div>
          <div style="font-size:11px;color:#0f172a;line-height:1.8">الرقم الضريبي: 300000000000003</div>
          <div style="font-size:11px;color:#0f172a;line-height:1.8">سجل تجاري: 1010000000</div>
        </div>
      </div>
      <div style="padding:10px 24px;text-align:center;font-size:10.5px;color:#64748b;background:#0f172a;color:#cbd5e1">
        هذه فاتورة ضريبية صادرة إلكترونيًا وفق نظام هيئة الزكاة والضريبة والجمارك — لا تحتاج إلى توقيع أو ختم.
      </div>
    </div>
  `;
  return wrapper;
}

export async function downloadInvoicePDF(inv: InvoiceLike): Promise<void> {
  const iframe = document.createElement("iframe");
  iframe.style.cssText = "position:fixed;left:-10000px;top:0;width:820px;height:1400px;border:0;visibility:hidden";
  document.body.appendChild(iframe);
  try {
    const doc = iframe.contentDocument!;
    doc.open();
    doc.write(`<!DOCTYPE html><html dir="rtl"><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>
html,body{margin:0;padding:0;background:#fff;font-family:"Cairo","Segoe UI",Tahoma,Arial,sans-serif}
*{font-family:inherit !important;letter-spacing:normal !important;word-spacing:normal !important;box-sizing:border-box}
</style>
</head><body></body></html>`);
    doc.close();
    const node = buildInvoiceNode(inv);
    node.style.position = "static";
    node.style.left = "0";
    doc.body.appendChild(node);

    try {
      await (doc as any).fonts?.ready;
      await Promise.all([
        (doc as any).fonts?.load('400 14px "Cairo"'),
        (doc as any).fonts?.load('600 14px "Cairo"'),
        (doc as any).fonts?.load('700 18px "Cairo"'),
        (doc as any).fonts?.load('800 22px "Cairo"'),
      ]);
    } catch { /* fonts API unavailable */ }
    await new Promise((r) => setTimeout(r, 350));

    const canvas = await html2canvas(node, {
      scale: 2,
      backgroundColor: "#ffffff",
      useCORS: true,
      logging: false,
      windowWidth: 820,
      windowHeight: node.scrollHeight,
    });
    const imgData = canvas.toDataURL("image/jpeg", 0.95);
    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const imgW = pageW;
    const imgH = (canvas.height * imgW) / canvas.width;
    let heightLeft = imgH;
    let position = 0;
    pdf.addImage(imgData, "JPEG", 0, position, imgW, imgH, undefined, "FAST");
    heightLeft -= pageH;
    while (heightLeft > 0) {
      position = heightLeft - imgH;
      pdf.addPage();
      pdf.addImage(imgData, "JPEG", 0, position, imgW, imgH, undefined, "FAST");
      heightLeft -= pageH;
    }
    pdf.save(`${inv.invoiceNumber ?? "invoice"}.pdf`);
  } finally {
    iframe.remove();
  }
}
