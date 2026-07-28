// Instant invoice PDF download — renders styled HTML in an isolated iframe,
// snapshots with html2canvas, embeds into a jsPDF A4 page.
// Redesign: RTL-tuned Arabic typography, request/project reference in header,
// tolerant field mapping (accepts Prisma InvoiceItem shape or legacy shape).

import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { api } from "@/lib/api";

type InvoiceItemLike = {
  // Prisma shape
  title?: string;
  description?: string | null;
  quantity?: number;
  // legacy / view shape
  qty?: number;
  unitPrice?: number | string;
  total?: number | string;
};

type LinkedRequestLike = {
  id?: string;
  title?: string;
  category?: string | null;
  proposalScope?: string | null;
  proposalDuration?: number | null;
} | null;

type InvoiceLike = {
  id?: string;
  invoiceNumber?: string;
  status?: string;
  total?: string | number;
  subtotal?: string | number;
  tax?: string | number;
  taxAmount?: string | number;
  taxRate?: string | number;
  currency?: string;
  dueAt?: string | null;
  issueDate?: string | null;
  issuedAt?: string | null;
  createdAt?: string | null;
  notes?: string | null;
  client?: { user?: { name?: string; email?: string; phone?: string } | null; company?: string | null; vatNumber?: string | null; email?: string | null; phone?: string | null; address?: string | null } | null;
  project?: { title?: string } | null;
  linkedRequest?: LinkedRequestLike;
  requestRef?: string | null;
  items?: InvoiceItemLike[];
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

// Fetch full invoice from API when only a summary object is passed
async function ensureFullInvoice(inv: InvoiceLike): Promise<InvoiceLike> {
  const hasItems = Array.isArray(inv.items) && inv.items.length > 0;
  const hasRequest = !!inv.linkedRequest || !!inv.requestRef;
  if (hasItems && hasRequest) return inv;
  if (!inv.id) return inv;
  try {
    const { data } = await api.get(`/invoices/${inv.id}`);
    return data?.invoice ?? inv;
  } catch { return inv; }
}

function itemLabel(it: InvoiceItemLike, fallback: string): string {
  const t = (it.title ?? "").toString().trim();
  const d = (it.description ?? "").toString().trim();
  if (t && d) return `${t} — ${d}`;
  return t || d || fallback;
}
const itemQty = (it: InvoiceItemLike) => Number(it.quantity ?? it.qty ?? 1);

function buildInvoiceNode(inv: InvoiceLike): HTMLDivElement {
  const total = Number(inv.total ?? 0);
  const taxAmountRaw = Number(inv.taxAmount ?? inv.tax ?? 0);
  const subtotalRaw = Number(inv.subtotal ?? (total ? total / 1.15 : 0));
  // Recompute if inconsistent to avoid double-tax display
  const subtotal = subtotalRaw || +(total / 1.15).toFixed(2);
  const tax = taxAmountRaw || +(total - subtotal).toFixed(2);
  const taxRate = Number(inv.taxRate ?? 15);

  const st = statusMap[inv.status ?? ""] ?? statusMap.DRAFT;
  const clientName = inv.client?.user?.name ?? "عميل";
  const clientPhone = inv.client?.user?.phone ?? inv.client?.phone ?? "";
  const clientEmail = inv.client?.user?.email ?? inv.client?.email ?? "";
  const clientCompany = inv.client?.company ?? "";
  const projectTitle = inv.linkedRequest?.title ?? inv.project?.title ?? "خدمات مهنية";
  const issueDate = fmtDate(inv.issueDate ?? inv.issuedAt ?? inv.createdAt);
  const dueDate = fmtDate(inv.dueAt);
  const invNo = inv.invoiceNumber ?? "INV-DRAFT";
  const currency = inv.currency ?? "SAR";
  const reqRef = inv.requestRef ?? "";
  const duration = inv.linkedRequest?.proposalDuration;

  const items: InvoiceItemLike[] = inv.items?.length
    ? inv.items
    : [{ title: projectTitle, description: inv.linkedRequest?.proposalScope ?? null, quantity: 1, unitPrice: subtotal, total: subtotal }];

  // Cell base — no letter-spacing for Arabic shaping
  const cellBase = "padding:11px 12px;border-bottom:1px solid #e5e7eb;border-inline-end:1px solid #e5e7eb;font-size:12px;vertical-align:top";
  const cellFirst = "padding:11px 12px;border-bottom:1px solid #e5e7eb;font-size:12px;vertical-align:top";

  const rowsHtml = items.map((it, i) => {
    const qty = itemQty(it);
    const unit = Number(it.unitPrice ?? it.total ?? 0);
    const line = Number(it.total ?? unit * qty);
    return `
    <tr style="background:${i % 2 === 0 ? "#ffffff" : "#f9fafb"}">
      <td style="${cellFirst};text-align:center;color:#6b7280;font-weight:700;width:40px">${i + 1}</td>
      <td style="${cellBase};color:#0f172a">
        <div style="font-weight:700;font-size:12.5px">${itemLabel(it, projectTitle)}</div>
      </td>
      <td style="${cellBase};text-align:center;color:#334155;width:60px;font-variant-numeric:tabular-nums">${qty}</td>
      <td style="${cellBase};text-align:end;font-variant-numeric:tabular-nums;color:#0f172a;width:130px" dir="ltr">${fmtSAR(unit)} <span style="color:#64748b;font-size:10.5px">SAR</span></td>
      <td style="${cellBase};text-align:end;font-variant-numeric:tabular-nums;color:#0f172a;font-weight:800;width:140px;border-inline-end:0" dir="ltr">${fmtSAR(line)} <span style="color:#64748b;font-size:10.5px">SAR</span></td>
    </tr>`;
  }).join("");

  const notes = inv.notes ?? "يُرجى تحويل المبلغ إلى الحساب البنكي أدناه أو السداد من خلال المحفظة الرقمية عبر بوابة العميل. لأي استفسار، تواصلوا مع قسم الحسابات على billing@ash-holding.sa.";

  const wrapper = document.createElement("div");
  wrapper.style.cssText = "position:fixed;left:-10000px;top:0;width:794px;background:#fff;color:#0f172a;direction:rtl;box-sizing:border-box;font-family:'Cairo','IBM Plex Sans Arabic','Segoe UI',Tahoma,sans-serif";
  wrapper.setAttribute("dir", "rtl");

  wrapper.innerHTML = `
    <!-- Refined header: monochrome navy, gold accent bar, right-side identity -->
    <div style="position:relative;background:#0b1220;color:#f8fafc;padding:28px 34px 22px">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:20px">
        <!-- Left (visually) = LTR invoice meta -->
        <div style="direction:ltr;text-align:left;min-width:220px">
          <div style="font-size:10.5px;letter-spacing:2px;color:#94a3b8;font-weight:700">TAX INVOICE</div>
          <div style="margin:8px 0 10px;font-weight:800;font-size:22px;font-family:ui-monospace,'SF Mono',Menlo,monospace;color:#fff">${invNo}</div>
          <span style="display:inline-block;padding:5px 12px;border-radius:999px;font-weight:800;font-size:11px;background:${st.bg};color:${st.color};border:1px solid ${st.border}">${st.label}</span>
          ${reqRef ? `<div style="margin-top:10px;font-size:10.5px;color:#94a3b8">Ref: <span style="color:#e2e8f0;font-family:ui-monospace,monospace">${reqRef}</span></div>` : ""}
        </div>
        <!-- Right (visually) = RTL company identity -->
        <div style="display:flex;align-items:flex-start;gap:14px;text-align:right">
          <div>
            <div style="font-size:18px;font-weight:800;letter-spacing:.5px">ASH HOLDING</div>
            <div style="font-size:12px;color:#cbd5e1;margin-top:3px">الشركة السعودية للحلول الرقمية</div>
            <div style="font-size:10.5px;color:#94a3b8;margin-top:4px">فاتورة ضريبية رسمية · صادرة إلكترونيًا</div>
          </div>
          <div style="width:52px;height:52px;border-radius:12px;background:linear-gradient(135deg,#c9a84c,#e8c97a);display:flex;align-items:center;justify-content:center;font-weight:900;font-size:22px;color:#0b1220;box-shadow:0 6px 16px rgba(201,168,76,.35)">ش</div>
        </div>
      </div>
      <!-- gold accent bar -->
      <div style="position:absolute;left:0;right:0;bottom:0;height:3px;background:linear-gradient(90deg,#c9a84c 0%,#e8c97a 50%,#c9a84c 100%)"></div>
    </div>

    <!-- Parties -->
    <div style="display:grid;grid-template-columns:1fr 1fr;background:#f8fafc;border-bottom:1px solid #e5e7eb">
      <div style="padding:18px 28px;border-inline-end:1px solid #e5e7eb">
        <div style="font-size:10px;color:#6b7280;margin-bottom:6px;font-weight:800;letter-spacing:1.5px">فاتورة إلى · BILL TO</div>
        <div style="font-size:14.5px;font-weight:800;color:#0f172a;margin-bottom:3px">${clientName}</div>
        ${clientCompany ? `<div style="font-size:12px;color:#475569;line-height:1.9">${clientCompany}</div>` : ""}
        ${clientEmail ? `<div style="font-size:12px;color:#475569;line-height:1.9" dir="ltr">${clientEmail}</div>` : ""}
        ${clientPhone ? `<div style="font-size:12px;color:#475569;line-height:1.9" dir="ltr">${clientPhone}</div>` : ""}
      </div>
      <div style="padding:18px 28px">
        <div style="font-size:10px;color:#6b7280;margin-bottom:6px;font-weight:800;letter-spacing:1.5px">من · FROM</div>
        <div style="font-size:14.5px;font-weight:800;color:#0f172a;margin-bottom:3px">ASH HOLDING</div>
        <div style="font-size:12px;color:#475569;line-height:1.9">الرياض، المملكة العربية السعودية</div>
        <div style="font-size:12px;color:#475569;line-height:1.9">الرقم الضريبي: <span dir="ltr">300000000000003</span></div>
        <div style="font-size:12px;color:#475569;line-height:1.9" dir="ltr">billing@ash-holding.sa · +966 11 000 0000</div>
      </div>
    </div>

    <!-- Meta strip -->
    <div style="display:grid;grid-template-columns:repeat(4,1fr);border-bottom:1px solid #e5e7eb;background:#fff">
      <div style="padding:14px 18px;border-inline-end:1px solid #eef2f7">
        <div style="font-size:9.5px;color:#6b7280;font-weight:800;letter-spacing:1.2px;margin-bottom:4px">تاريخ الإصدار</div>
        <div style="font-size:13px;font-weight:700;color:#0f172a">${issueDate}</div>
      </div>
      <div style="padding:14px 18px;border-inline-end:1px solid #eef2f7">
        <div style="font-size:9.5px;color:#6b7280;font-weight:800;letter-spacing:1.2px;margin-bottom:4px">تاريخ الاستحقاق</div>
        <div style="font-size:13px;font-weight:700;color:#0f172a">${dueDate}</div>
      </div>
      <div style="padding:14px 18px;border-inline-end:1px solid #eef2f7">
        <div style="font-size:9.5px;color:#6b7280;font-weight:800;letter-spacing:1.2px;margin-bottom:4px">المشروع</div>
        <div style="font-size:13px;font-weight:700;color:#0f172a;line-height:1.4">${projectTitle}</div>
      </div>
      <div style="padding:14px 18px">
        <div style="font-size:9.5px;color:#6b7280;font-weight:800;letter-spacing:1.2px;margin-bottom:4px">المرجع</div>
        <div style="font-size:13px;font-weight:700;color:#0f172a;font-family:ui-monospace,monospace" dir="ltr">${reqRef || invNo}</div>
      </div>
    </div>

    <!-- Items -->
    <div style="padding:22px 26px 8px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
        <div style="font-size:13px;font-weight:800;color:#0f172a;padding-inline-end:8px;border-inline-end:3px solid #c9a84c">بنود الفاتورة</div>
        ${duration ? `<div style="font-size:11px;color:#6b7280">المدة المقترحة: <strong style="color:#0f172a">${duration} يوم</strong></div>` : ""}
      </div>
      <table style="width:100%;border-collapse:collapse;font-size:12px;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden">
        <thead>
          <tr>
            <th style="background:#0b1220;color:#f8fafc;padding:11px 12px;text-align:center;font-weight:700;font-size:11px;border-inline-end:1px solid #1e293b;letter-spacing:.5px">#</th>
            <th style="background:#0b1220;color:#f8fafc;padding:11px 12px;text-align:start;font-weight:700;font-size:11px;border-inline-end:1px solid #1e293b;letter-spacing:.5px">الوصف</th>
            <th style="background:#0b1220;color:#f8fafc;padding:11px 12px;text-align:center;font-weight:700;font-size:11px;border-inline-end:1px solid #1e293b;letter-spacing:.5px">الكمية</th>
            <th style="background:#0b1220;color:#f8fafc;padding:11px 12px;text-align:end;font-weight:700;font-size:11px;border-inline-end:1px solid #1e293b;letter-spacing:.5px">سعر الوحدة</th>
            <th style="background:#0b1220;color:#f8fafc;padding:11px 12px;text-align:end;font-weight:700;font-size:11px;letter-spacing:.5px">الإجمالي</th>
          </tr>
        </thead>
        <tbody>${rowsHtml}</tbody>
      </table>
    </div>

    <!-- Totals + payment info -->
    <div style="display:grid;grid-template-columns:1fr 320px;gap:16px;padding:14px 26px 22px">
      <div style="border:1px solid #e5e7eb;border-radius:12px;padding:14px 16px;background:#fafbff">
        <div style="font-size:12px;font-weight:800;color:#0f172a;margin-bottom:8px;padding-inline-end:8px;border-inline-end:3px solid #c9a84c">تفاصيل الدفع</div>
        <div style="font-size:12px;color:#475569;line-height:2">
          <div><strong style="color:#0f172a">شروط الدفع:</strong> يستحق السداد خلال 7 أيام من تاريخ الإصدار.</div>
          <div><strong style="color:#0f172a">المستفيد:</strong> شركة علي صالح الشهري القابضة</div>
          <div><strong style="color:#0f172a">البنك:</strong> بنك ساب (SAB)</div>
          <div style="direction:ltr;text-align:right;font-family:ui-monospace,monospace"><strong style="color:#0f172a">IBAN:</strong> SA3745000000262359391001</div>
          <div><strong style="color:#0f172a">المرجع في التحويل:</strong> <span dir="ltr">${reqRef || invNo}</span></div>
        </div>
      </div>
      <div style="border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;background:#fff">
        <div style="display:flex;justify-content:space-between;font-size:12px;padding:10px 14px;color:#475569;border-bottom:1px solid #eef2f7">
          <span>المجموع الفرعي</span><span dir="ltr" style="font-variant-numeric:tabular-nums;font-weight:700;color:#0f172a">${fmtSAR(subtotal)} SAR</span>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:12px;padding:10px 14px;color:#475569;border-bottom:1px solid #eef2f7">
          <span>ضريبة القيمة المضافة (${taxRate}%)</span><span dir="ltr" style="font-variant-numeric:tabular-nums;font-weight:700;color:#0f172a">${fmtSAR(tax)} SAR</span>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;padding:14px 16px;font-weight:800;font-size:15px;color:#f8fafc;background:linear-gradient(135deg,#0b1220 0%,#1e293b 100%);border-top:2px solid #c9a84c">
          <span>الإجمالي المستحق</span><span dir="ltr" style="font-variant-numeric:tabular-nums;font-size:17px">${fmtSAR(total)} ${currency}</span>
        </div>
      </div>
    </div>

    <!-- Notes -->
    <div style="margin:0 26px 20px;border:1px dashed #cbd5e1;border-radius:10px;padding:12px 14px;background:#fffdf5">
      <div style="font-size:11.5px;font-weight:800;color:#0f172a;margin-bottom:5px;padding-inline-end:8px;border-inline-end:3px solid #f59e0b">ملاحظات</div>
      <div style="font-size:11.5px;color:#475569;line-height:2">${notes}</div>
    </div>

    <!-- Footer -->
    <div style="border-top:2px solid #0b1220">
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;padding:14px 26px;gap:16px;background:#f8fafc">
        <div>
          <div style="font-size:10px;color:#6b7280;font-weight:800;margin-bottom:4px;letter-spacing:1.2px">الشركة</div>
          <div style="font-size:11px;color:#0f172a;line-height:1.8;font-weight:700">ASH HOLDING</div>
          <div style="font-size:10.5px;color:#6b7280;line-height:1.8">الرياض، المملكة العربية السعودية</div>
        </div>
        <div>
          <div style="font-size:10px;color:#6b7280;font-weight:800;margin-bottom:4px;letter-spacing:1.2px">التواصل</div>
          <div style="font-size:10.5px;color:#0f172a;line-height:1.8" dir="ltr">billing@ash-holding.sa</div>
          <div style="font-size:10.5px;color:#0f172a;line-height:1.8" dir="ltr">+966 11 000 0000</div>
        </div>
        <div>
          <div style="font-size:10px;color:#6b7280;font-weight:800;margin-bottom:4px;letter-spacing:1.2px">المعرفات</div>
          <div style="font-size:10.5px;color:#0f172a;line-height:1.8">الرقم الضريبي: <span dir="ltr">300000000000003</span></div>
          <div style="font-size:10.5px;color:#0f172a;line-height:1.8">سجل تجاري: <span dir="ltr">1010000000</span></div>
        </div>
      </div>
      <div style="padding:9px 26px;text-align:center;font-size:10px;background:#0b1220;color:#94a3b8;letter-spacing:.3px">
        فاتورة ضريبية إلكترونية وفق نظام هيئة الزكاة والضريبة والجمارك — لا تحتاج إلى توقيع أو ختم يدوي.
      </div>
    </div>
  `;
  return wrapper;
}

export async function downloadInvoicePDF(input: InvoiceLike): Promise<void> {
  const inv = await ensureFullInvoice(input);
  const iframe = document.createElement("iframe");
  iframe.style.cssText = "position:fixed;left:-10000px;top:0;width:820px;height:1400px;border:0;visibility:hidden";
  document.body.appendChild(iframe);
  try {
    const doc = iframe.contentDocument!;
    doc.open();
    doc.write(`<!DOCTYPE html><html dir="rtl"><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
html,body{margin:0;padding:0;background:#fff;font-family:"Cairo","IBM Plex Sans Arabic","Segoe UI",Tahoma,Arial,sans-serif;-webkit-font-smoothing:antialiased}
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
        (doc as any).fonts?.load('900 22px "Cairo"'),
      ]);
    } catch { /* fonts API unavailable */ }
    await new Promise((r) => setTimeout(r, 400));

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
