// Instant invoice PDF download — renders styled HTML off-screen, snapshots with
// html2canvas, embeds into a jsPDF A4 page, and triggers a direct file download.
// No new tab, no print dialog. Arabic renders as image so no font embedding needed.

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
  client?: { user?: { name?: string }; company?: string; vatNumber?: string; email?: string; phone?: string } | null;
  project?: { title?: string } | null;
  items?: Array<{ description: string; qty?: number; unitPrice?: number | string; total?: number | string }>;
};

const fmtSAR = (n: number | string | undefined) =>
  new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n ?? 0));

const fmtDate = (d?: string | null) => {
  if (!d) return "—";
  try {
    // Latin digits for a formal invoice look
    return new Intl.DateTimeFormat("ar-SA-u-ca-gregory-nu-latn", { year: "numeric", month: "long", day: "numeric" }).format(new Date(d));
  } catch { return "—"; }
};

const statusMap: Record<string, { label: string; color: string; bg: string }> = {
  PAID:      { label: "مدفوعة",     color: "#065f46", bg: "#d1fae5" },
  UNPAID:    { label: "غير مدفوعة", color: "#92400e", bg: "#fef3c7" },
  OVERDUE:   { label: "متأخرة",     color: "#991b1b", bg: "#fee2e2" },
  SENT:      { label: "مرسلة",      color: "#1e40af", bg: "#dbeafe" },
  DRAFT:     { label: "مسودة",      color: "#374151", bg: "#e5e7eb" },
  CANCELLED: { label: "ملغاة",      color: "#4b5563", bg: "#e5e7eb" },
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
    : [{ description: projectTitle, qty: 1, unitPrice: subtotal, total: subtotal }];

  const rowsHtml = items.map((it, i) => `
    <tr>
      <td style="padding:14px 12px;border-bottom:1px solid #f1f5f9;text-align:center;color:#334155">${i + 1}</td>
      <td style="padding:14px 12px;border-bottom:1px solid #f1f5f9;font-weight:600;color:#0f172a">${it.description}</td>
      <td style="padding:14px 12px;border-bottom:1px solid #f1f5f9;text-align:center;color:#334155">${it.qty ?? 1}</td>
      <td style="padding:14px 12px;border-bottom:1px solid #f1f5f9;text-align:left;font-variant-numeric:tabular-nums;font-weight:600;color:#0f172a">${fmtSAR(it.unitPrice ?? it.total)} ر.س</td>
      <td style="padding:14px 12px;border-bottom:1px solid #f1f5f9;text-align:left;font-variant-numeric:tabular-nums;font-weight:600;color:#0f172a">${fmtSAR(it.total ?? Number(it.unitPrice ?? 0) * Number(it.qty ?? 1))} ر.س</td>
    </tr>`).join("");

  const wrapper = document.createElement("div");
  wrapper.style.cssText = "position:fixed;left:-10000px;top:0;width:794px;background:#fff;font-family:'IBM Plex Sans Arabic',system-ui,sans-serif;color:#0f172a;direction:rtl";
  wrapper.setAttribute("dir", "rtl");
  wrapper.innerHTML = `
    <div style="background:linear-gradient(135deg,#0f172a 0%,#1e1b4b 55%,#312e81 100%);color:#fff;padding:32px 36px;position:relative;overflow:hidden">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:24px">
        <div style="display:flex;align-items:center;gap:14px">
          <div style="width:56px;height:56px;border-radius:14px;background:linear-gradient(135deg,#00E5FF,#7C3AED);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:22px;color:#fff">ش</div>
          <div>
            <div style="font-size:20px;font-weight:700;letter-spacing:.2px">ASH HOLDING</div>
            <div style="font-size:12px;color:#c7d2fe;margin-top:2px">الشركة السعودية للحلول الرقمية</div>
          </div>
        </div>
        <div style="text-align:left;direction:ltr">
          <div style="font-size:11px;color:#a5b4fc;letter-spacing:2px">INVOICE</div>
          <div style="margin:4px 0 10px;font-weight:700;font-size:22px;font-family:ui-monospace,monospace">${invNo}</div>
          <span style="display:inline-block;padding:6px 14px;border-radius:999px;font-weight:600;font-size:12px;background:${st.bg};color:${st.color}">${st.label}</span>
        </div>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;padding:28px 36px;background:#f8fafc;border-bottom:1px solid #e2e8f0">
      <div>
        <div style="font-size:11px;letter-spacing:2px;color:#64748b;margin-bottom:8px">من</div>
        <div style="font-size:15px;font-weight:700;color:#0f172a;margin-bottom:6px">ASH HOLDING</div>
        <div style="font-size:12.5px;color:#475569;line-height:1.8">الرياض، المملكة العربية السعودية</div>
        <div style="font-size:12.5px;color:#475569;line-height:1.8">الرقم الضريبي: 300000000000003</div>
        <div style="font-size:12.5px;color:#475569;line-height:1.8">billing@ash-holding.sa</div>
      </div>
      <div>
        <div style="font-size:11px;letter-spacing:2px;color:#64748b;margin-bottom:8px">إلى</div>
        <div style="font-size:15px;font-weight:700;color:#0f172a;margin-bottom:6px">${clientName}</div>
        <div style="font-size:12.5px;color:#475569;line-height:1.8">${inv.client?.company ?? "—"}</div>
        <div style="font-size:12.5px;color:#475569;line-height:1.8">${inv.client?.email ?? ""}</div>
        <div style="font-size:12.5px;color:#475569;line-height:1.8">${inv.client?.phone ?? ""}</div>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;padding:20px 36px;border-bottom:1px solid #e2e8f0">
      <div style="padding:12px 14px;border-radius:12px;background:linear-gradient(135deg,#f8fafc,#eef2ff);border:1px solid #e0e7ff">
        <div style="font-size:10px;letter-spacing:1.5px;color:#6366f1;font-weight:600">تاريخ الإصدار</div>
        <div style="margin-top:4px;font-size:13.5px;font-weight:700;color:#0f172a">${issueDate}</div>
      </div>
      <div style="padding:12px 14px;border-radius:12px;background:linear-gradient(135deg,#f8fafc,#eef2ff);border:1px solid #e0e7ff">
        <div style="font-size:10px;letter-spacing:1.5px;color:#6366f1;font-weight:600">تاريخ الاستحقاق</div>
        <div style="margin-top:4px;font-size:13.5px;font-weight:700;color:#0f172a">${dueDate}</div>
      </div>
      <div style="padding:12px 14px;border-radius:12px;background:linear-gradient(135deg,#f8fafc,#eef2ff);border:1px solid #e0e7ff">
        <div style="font-size:10px;letter-spacing:1.5px;color:#6366f1;font-weight:600">المشروع</div>
        <div style="margin-top:4px;font-size:13.5px;font-weight:700;color:#0f172a">${projectTitle}</div>
      </div>
    </div>

    <table style="width:100%;border-collapse:collapse;font-size:13px">
      <thead>
        <tr>
          <th style="background:#0f172a;color:#fff;padding:14px 12px;text-align:center;font-weight:600;font-size:12px;width:48px">#</th>
          <th style="background:#0f172a;color:#fff;padding:14px 12px;text-align:right;font-weight:600;font-size:12px">الوصف</th>
          <th style="background:#0f172a;color:#fff;padding:14px 12px;text-align:center;font-weight:600;font-size:12px;width:70px">الكمية</th>
          <th style="background:#0f172a;color:#fff;padding:14px 12px;text-align:left;font-weight:600;font-size:12px;width:130px">سعر الوحدة</th>
          <th style="background:#0f172a;color:#fff;padding:14px 12px;text-align:left;font-weight:600;font-size:12px;width:140px">الإجمالي</th>
        </tr>
      </thead>
      <tbody>${rowsHtml}</tbody>
    </table>

    <div style="display:grid;grid-template-columns:1fr 320px;gap:20px;padding:24px 36px 32px;background:#fafbff">
      <div style="font-size:12px;color:#64748b;line-height:1.8;padding:14px;border-right:3px solid #7C3AED;background:#faf5ff;border-radius:8px">
        <strong style="color:#0f172a">شروط الدفع:</strong> يستحق السداد خلال 30 يومًا من تاريخ الإصدار. يرجى إرفاق رقم الفاتورة عند التحويل البنكي.<br/>
        <strong style="color:#0f172a">البنك:</strong> مصرف الراجحي — SA00 0000 0000 0000 0000 0000
      </div>
      <div style="display:flex;flex-direction:column;gap:8px">
        <div style="display:flex;justify-content:space-between;font-size:13px;padding:8px 14px;color:#475569">
          <span>المجموع الفرعي</span><span style="direction:ltr;font-variant-numeric:tabular-nums">${fmtSAR(subtotal)} ر.س</span>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:13px;padding:8px 14px;color:#475569">
          <span>ضريبة القيمة المضافة (15%)</span><span style="direction:ltr;font-variant-numeric:tabular-nums">${fmtSAR(tax)} ر.س</span>
        </div>
        <div style="display:flex;justify-content:space-between;padding:16px;font-weight:700;font-size:17px;color:#fff;background:linear-gradient(135deg,#00E5FF,#7C3AED);border-radius:12px;margin-top:6px">
          <span>الإجمالي المستحق</span><span style="direction:ltr;font-variant-numeric:tabular-nums">${fmtSAR(total)} ر.س</span>
        </div>
      </div>
    </div>

    <div style="padding:20px 36px;border-top:2px dashed #e2e8f0;display:flex;justify-content:space-between;font-size:11.5px;color:#64748b">
      <div><strong style="color:#0f172a">شكراً لثقتكم بنا</strong> — نتطلع لخدمتكم دائمًا.</div>
      <div>www.ash-holding.sa · +966 11 000 0000</div>
    </div>
    <div style="padding:16px 36px;text-align:center;font-size:11px;color:#94a3b8;letter-spacing:1px">تم إنشاء هذه الفاتورة إلكترونيًا ولا تحتاج إلى توقيع.</div>
  `;
  return wrapper;
}

export async function downloadInvoicePDF(inv: InvoiceLike): Promise<void> {
  // Render inside an isolated iframe so app-wide CSS (oklch/color-mix) can't
  // break html2canvas — it only sees the plain inline styles we set.
  const iframe = document.createElement("iframe");
  iframe.style.cssText = "position:fixed;left:-10000px;top:0;width:820px;height:1200px;border:0;visibility:hidden";
  document.body.appendChild(iframe);
  try {
    const doc = iframe.contentDocument!;
    doc.open();
    doc.write('<!DOCTYPE html><html dir="rtl"><head><meta charset="utf-8"><style>html,body{margin:0;padding:0;background:#fff;font-family:system-ui,-apple-system,"Segoe UI",Tahoma,Arial,sans-serif}</style></head><body></body></html>');
    doc.close();
    const node = buildInvoiceNode(inv);
    node.style.position = "static";
    node.style.left = "0";
    doc.body.appendChild(node);
    // Let fonts/layout settle
    await new Promise((r) => setTimeout(r, 60));

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

