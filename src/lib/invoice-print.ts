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

// Convert integer to Arabic words (for amounts up to millions) — used for legal "amount in words"
function numToArabicWords(num: number): string {
  if (num === 0) return "صفر";
  const ones = ["","واحد","اثنان","ثلاثة","أربعة","خمسة","ستة","سبعة","ثمانية","تسعة","عشرة","أحد عشر","اثنا عشر","ثلاثة عشر","أربعة عشر","خمسة عشر","ستة عشر","سبعة عشر","ثمانية عشر","تسعة عشر"];
  const tens = ["","","عشرون","ثلاثون","أربعون","خمسون","ستون","سبعون","ثمانون","تسعون"];
  const hundreds = ["","مائة","مئتان","ثلاثمائة","أربعمائة","خمسمائة","ستمائة","سبعمائة","ثمانمائة","تسعمائة"];
  const below1000 = (n: number): string => {
    const h = Math.floor(n / 100), r = n % 100;
    const parts: string[] = [];
    if (h) parts.push(hundreds[h]);
    if (r < 20) { if (r) parts.push(ones[r]); }
    else { const t = Math.floor(r / 10), o = r % 10; if (o) parts.push(ones[o] + " و" + tens[t]); else parts.push(tens[t]); }
    return parts.join(" و");
  };
  const n = Math.floor(num);
  if (n < 1000) return below1000(n);
  const th = Math.floor(n / 1000), rest = n % 1000;
  let thPart = "";
  if (th === 1) thPart = "ألف";
  else if (th === 2) thPart = "ألفان";
  else if (th < 11) thPart = below1000(th) + " آلاف";
  else thPart = below1000(th) + " ألفاً";
  return rest ? `${thPart} و${below1000(rest)}` : thPart;
}

function buildInvoiceNode(inv: InvoiceLike): HTMLDivElement {
  const total = Number(inv.total ?? 0);
  const taxAmountRaw = Number(inv.taxAmount ?? inv.tax ?? 0);
  const subtotalRaw = Number(inv.subtotal ?? (total ? total / 1.15 : 0));
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

  const wholeSAR = Math.floor(total);
  const fractionHalalah = Math.round((total - wholeSAR) * 100);
  const amountWords = `${numToArabicWords(wholeSAR)} ريال${fractionHalalah ? ` و${numToArabicWords(fractionHalalah)} هللة` : ""} فقط لا غير`;

  // ── Row cells
  const rowsHtml = items.map((it, i) => {
    const qty = itemQty(it);
    const unit = Number(it.unitPrice ?? it.total ?? 0);
    const line = Number(it.total ?? unit * qty);
    const desc = (it.description ?? "").toString().trim();
    return `
      <tr>
        <td style="padding:16px 14px;border-bottom:1px solid #ecebe4;color:#a89968;font-family:ui-monospace,monospace;font-size:11px;vertical-align:top;width:44px">${String(i + 1).padStart(2,"0")}</td>
        <td style="padding:16px 14px;border-bottom:1px solid #ecebe4;vertical-align:top">
          <div style="font-weight:800;font-size:13px;color:#111827;line-height:1.5">${itemLabel(it, projectTitle)}</div>
          ${desc && desc !== itemLabel(it, projectTitle) ? `<div style="font-size:11px;color:#6b7280;line-height:1.7;margin-top:3px">${desc}</div>` : ""}
        </td>
        <td style="padding:16px 14px;border-bottom:1px solid #ecebe4;text-align:center;color:#374151;font-size:12px;font-variant-numeric:tabular-nums;width:70px">${qty}</td>
        <td style="padding:16px 14px;border-bottom:1px solid #ecebe4;text-align:end;color:#374151;font-size:12px;font-variant-numeric:tabular-nums;width:120px" dir="ltr">${fmtSAR(unit)}</td>
        <td style="padding:16px 14px;border-bottom:1px solid #ecebe4;text-align:end;color:#111827;font-size:13px;font-weight:800;font-variant-numeric:tabular-nums;width:130px" dir="ltr">${fmtSAR(line)}</td>
      </tr>`;
  }).join("");

  const notes = inv.notes ?? "يُرجى تحويل المبلغ إلى الحساب البنكي أدناه أو السداد من خلال المحفظة الرقمية عبر بوابة العميل. لأي استفسار: billing@ash-holding.sa";

  const wrapper = document.createElement("div");
  wrapper.style.cssText = "position:fixed;left:-10000px;top:0;width:794px;background:#fbfaf5;color:#111827;direction:rtl;box-sizing:border-box;font-family:'Cairo','IBM Plex Sans Arabic','Segoe UI',Tahoma,sans-serif;overflow:hidden";
  wrapper.setAttribute("dir", "rtl");

  wrapper.innerHTML = `
    <!-- Vertical gold rule on the right edge (RTL leading) + subtle pattern -->
    <div style="position:relative;padding:0 0 0 0;background:
        radial-gradient(circle at 100% 0%, rgba(201,168,76,0.08), transparent 45%),
        radial-gradient(circle at 0% 100%, rgba(11,18,32,0.04), transparent 40%),
        #fbfaf5">
      <div style="position:absolute;top:0;bottom:0;right:0;width:6px;background:linear-gradient(180deg,#c9a84c 0%,#e8c97a 50%,#8a7233 100%)"></div>

      <!-- ══════════ HERO ══════════ -->
      <div style="padding:44px 44px 22px 38px;display:grid;grid-template-columns:1fr auto;gap:24px;align-items:end">
        <!-- Right (visually first in RTL): brand + tax invoice tag -->
        <div>
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:18px">
            <div style="width:46px;height:46px;border-radius:50%;background:radial-gradient(circle at 30% 30%,#e8c97a,#8a7233);display:flex;align-items:center;justify-content:center;font-weight:900;font-size:20px;color:#0b1220;font-family:'Cairo',sans-serif;box-shadow:0 2px 0 #6b5828, inset 0 1px 0 rgba(255,255,255,0.4)">ش</div>
            <div>
              <div style="font-size:16px;font-weight:900;color:#111827;letter-spacing:.3px">شركة علي صالح الشهري القابضة</div>
              <div style="font-size:10.5px;color:#8a7233;letter-spacing:2.4px;font-weight:700;margin-top:2px">ASH · HOLDING</div>
            </div>
          </div>
          <div style="display:inline-flex;align-items:center;gap:8px;padding:6px 14px;border:1px solid #d4c68a;border-radius:2px;background:#fefdf6">
            <span style="width:6px;height:6px;background:#c9a84c;border-radius:50%"></span>
            <span style="font-size:10px;font-weight:800;color:#6b5828;letter-spacing:2.6px">فاتورة ضريبية · TAX INVOICE</span>
          </div>
        </div>

        <!-- Left (visually): oversized invoice number in serif -->
        <div style="text-align:left;direction:ltr">
          <div style="font-size:10px;color:#a89968;letter-spacing:3px;font-weight:700;margin-bottom:4px">№ INVOICE</div>
          <div style="font-family:'Playfair Display','Cormorant Garamond',Georgia,serif;font-size:42px;font-weight:800;color:#0b1220;line-height:1;letter-spacing:-1px">${invNo}</div>
          <div style="margin-top:10px">
            <span style="display:inline-block;padding:5px 12px;border-radius:2px;font-weight:800;font-size:10.5px;background:${st.bg};color:${st.color};border:1px solid ${st.border};letter-spacing:1px">${st.label.toUpperCase()}</span>
          </div>
        </div>
      </div>

      <!-- thin hairline divider -->
      <div style="margin:0 38px 0 44px;height:1px;background:linear-gradient(90deg,transparent,#d4c68a 20%,#d4c68a 80%,transparent)"></div>

      <!-- ══════════ META STRIP ══════════ -->
      <div style="padding:20px 38px 20px 44px;display:grid;grid-template-columns:repeat(4,1fr);gap:20px">
        ${[
          ["تاريخ الإصدار", issueDate],
          ["تاريخ الاستحقاق", dueDate],
          ["المرجع", reqRef || invNo],
          ["العملة", `${currency} · ريال سعودي`],
        ].map(([k,v]) => `
          <div>
            <div style="font-size:9px;color:#a89968;font-weight:800;letter-spacing:2px;margin-bottom:5px">${k}</div>
            <div style="font-size:12.5px;font-weight:700;color:#111827;font-variant-numeric:tabular-nums">${v}</div>
          </div>`).join("")}
      </div>

      <!-- ══════════ PARTIES ══════════ -->
      <div style="margin:0 38px 22px 44px;display:grid;grid-template-columns:1fr 1fr;gap:0;border:1px solid #ecebe4;border-radius:4px;overflow:hidden;background:#ffffff">
        <div style="padding:18px 20px;border-inline-end:1px solid #ecebe4;background:linear-gradient(180deg,#fefdf6,#ffffff)">
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:10px">
            <span style="width:3px;height:12px;background:#c9a84c"></span>
            <span style="font-size:9.5px;color:#8a7233;font-weight:800;letter-spacing:2.4px">فاتورة إلى · BILL TO</span>
          </div>
          <div style="font-size:14.5px;font-weight:800;color:#111827;margin-bottom:4px">${clientName}</div>
          ${clientCompany ? `<div style="font-size:11.5px;color:#4b5563;line-height:1.9">${clientCompany}</div>` : ""}
          ${clientEmail ? `<div style="font-size:11.5px;color:#4b5563;line-height:1.9" dir="ltr">${clientEmail}</div>` : ""}
          ${clientPhone ? `<div style="font-size:11.5px;color:#4b5563;line-height:1.9" dir="ltr">${clientPhone}</div>` : ""}
        </div>
        <div style="padding:18px 20px">
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:10px">
            <span style="width:3px;height:12px;background:#0b1220"></span>
            <span style="font-size:9.5px;color:#374151;font-weight:800;letter-spacing:2.4px">من · FROM</span>
          </div>
          <div style="font-size:14.5px;font-weight:800;color:#111827;margin-bottom:4px">شركة علي صالح الشهري القابضة</div>
          <div style="font-size:11.5px;color:#4b5563;line-height:1.9">الرياض · المملكة العربية السعودية</div>
          <div style="font-size:11.5px;color:#4b5563;line-height:1.9">الرقم الضريبي: <span dir="ltr">300000000000003</span></div>
          <div style="font-size:11.5px;color:#4b5563;line-height:1.9" dir="ltr">billing@ash-holding.sa</div>
        </div>
      </div>

      <!-- ══════════ PROJECT LINE ══════════ -->
      <div style="margin:0 38px 8px 44px;padding:12px 16px;background:#0b1220;border-radius:4px;color:#f5f5f0;display:flex;justify-content:space-between;align-items:center;gap:12px">
        <div style="display:flex;align-items:center;gap:10px">
          <span style="font-size:9.5px;color:#c9a84c;letter-spacing:2px;font-weight:800">المشروع</span>
          <span style="font-size:13px;font-weight:700">${projectTitle}</span>
        </div>
        ${duration ? `<div style="font-size:11px;color:#cbb977"><span style="color:#94a3b8">المدة:</span> <strong style="color:#e8c97a">${duration} يوم</strong></div>` : ""}
      </div>

      <!-- ══════════ ITEMS ══════════ -->
      <div style="margin:14px 38px 0 44px">
        <table style="width:100%;border-collapse:collapse;font-size:12px;background:#ffffff;border:1px solid #ecebe4;border-radius:4px;overflow:hidden">
          <thead>
            <tr style="background:#fefdf6">
              <th style="padding:11px 14px;text-align:start;font-size:9.5px;color:#8a7233;font-weight:800;letter-spacing:2px;border-bottom:2px solid #d4c68a">#</th>
              <th style="padding:11px 14px;text-align:start;font-size:9.5px;color:#8a7233;font-weight:800;letter-spacing:2px;border-bottom:2px solid #d4c68a">الوصف · DESCRIPTION</th>
              <th style="padding:11px 14px;text-align:center;font-size:9.5px;color:#8a7233;font-weight:800;letter-spacing:2px;border-bottom:2px solid #d4c68a">الكمية</th>
              <th style="padding:11px 14px;text-align:end;font-size:9.5px;color:#8a7233;font-weight:800;letter-spacing:2px;border-bottom:2px solid #d4c68a">سعر الوحدة</th>
              <th style="padding:11px 14px;text-align:end;font-size:9.5px;color:#8a7233;font-weight:800;letter-spacing:2px;border-bottom:2px solid #d4c68a">الإجمالي (SAR)</th>
            </tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
        </table>
      </div>

      <!-- ══════════ SUMMARY + AMOUNT IN WORDS ══════════ -->
      <div style="margin:18px 38px 0 44px;display:grid;grid-template-columns:1fr 300px;gap:18px;align-items:stretch">
        <!-- Amount in words -->
        <div style="border:1px solid #d4c68a;border-radius:4px;padding:14px 18px;background:#fefdf6;display:flex;flex-direction:column;justify-content:center">
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:8px">
            <span style="width:3px;height:11px;background:#c9a84c"></span>
            <span style="font-size:9.5px;color:#8a7233;font-weight:800;letter-spacing:2.4px">المبلغ كتابةً · AMOUNT IN WORDS</span>
          </div>
          <div style="font-size:13px;font-weight:700;color:#111827;line-height:1.8">${amountWords}</div>
        </div>

        <!-- Totals card -->
        <div style="border:1px solid #ecebe4;border-radius:4px;background:#ffffff;overflow:hidden">
          <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 14px;font-size:11.5px;color:#4b5563;border-bottom:1px dashed #ecebe4">
            <span>المجموع الفرعي</span>
            <span dir="ltr" style="font-variant-numeric:tabular-nums;font-weight:700;color:#111827">${fmtSAR(subtotal)}</span>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 14px;font-size:11.5px;color:#4b5563;border-bottom:1px dashed #ecebe4">
            <span>ضريبة القيمة المضافة (${taxRate}%)</span>
            <span dir="ltr" style="font-variant-numeric:tabular-nums;font-weight:700;color:#111827">${fmtSAR(tax)}</span>
          </div>
          <div style="position:relative;padding:14px 16px;background:linear-gradient(135deg,#0b1220 0%,#1a2540 100%);color:#fefdf6">
            <div style="position:absolute;top:0;right:0;left:0;height:2px;background:linear-gradient(90deg,#c9a84c,#e8c97a,#c9a84c)"></div>
            <div style="font-size:9.5px;color:#c9a84c;letter-spacing:2.4px;font-weight:800;margin-bottom:2px">الإجمالي المستحق · TOTAL DUE</div>
            <div style="display:flex;justify-content:space-between;align-items:baseline">
              <span style="font-size:11px;color:#94a3b8" dir="ltr">${currency}</span>
              <span dir="ltr" style="font-family:'Playfair Display',Georgia,serif;font-size:26px;font-weight:800;font-variant-numeric:tabular-nums;letter-spacing:-.5px">${fmtSAR(total)}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- ══════════ PAYMENT ══════════ -->
      <div style="margin:18px 38px 0 44px;border:1px solid #ecebe4;border-radius:4px;background:#ffffff;overflow:hidden">
        <div style="padding:10px 16px;background:#fefdf6;border-bottom:1px solid #ecebe4;display:flex;align-items:center;gap:8px">
          <span style="width:3px;height:12px;background:#c9a84c"></span>
          <span style="font-size:10px;color:#8a7233;font-weight:800;letter-spacing:2.4px">تفاصيل الدفع · PAYMENT DETAILS</span>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;padding:14px 16px;gap:14px">
          <div style="font-size:11.5px;color:#4b5563;line-height:2">
            <div><span style="color:#8a7233;font-weight:800">المستفيد:</span> شركة علي صالح الشهري القابضة</div>
            <div><span style="color:#8a7233;font-weight:800">البنك:</span> بنك ساب (SAB)</div>
            <div dir="ltr" style="text-align:right;font-family:ui-monospace,monospace;margin-top:4px;padding:6px 10px;background:#fefdf6;border:1px dashed #d4c68a;border-radius:3px;font-size:12px;color:#0b1220;font-weight:700">SA37 4500 0000 2623 5939 1001</div>
          </div>
          <div style="font-size:11.5px;color:#4b5563;line-height:2">
            <div><span style="color:#8a7233;font-weight:800">شروط:</span> يستحق السداد خلال 7 أيام</div>
            <div><span style="color:#8a7233;font-weight:800">مرجع التحويل:</span> <span dir="ltr" style="font-family:ui-monospace,monospace;color:#111827;font-weight:700">${reqRef || invNo}</span></div>
            <div><span style="color:#8a7233;font-weight:800">أو:</span> الدفع الفوري عبر المحفظة الرقمية في بوابة العميل</div>
          </div>
        </div>
      </div>

      <!-- ══════════ NOTES ══════════ -->
      <div style="margin:14px 38px 0 44px;padding:12px 16px;background:transparent;border-inline-start:3px solid #c9a84c">
        <div style="font-size:9.5px;color:#8a7233;font-weight:800;letter-spacing:2.4px;margin-bottom:4px">ملاحظات · NOTES</div>
        <div style="font-size:11.5px;color:#4b5563;line-height:1.9">${notes}</div>
      </div>

      <!-- ══════════ FOOTER ══════════ -->
      <div style="margin-top:24px;padding:16px 38px 20px 44px;border-top:1px solid #ecebe4;display:grid;grid-template-columns:auto 1fr auto;gap:18px;align-items:center">
        <div style="width:40px;height:40px;border-radius:50%;background:radial-gradient(circle at 30% 30%,#e8c97a,#8a7233);display:flex;align-items:center;justify-content:center;font-weight:900;font-size:16px;color:#0b1220">ش</div>
        <div style="text-align:center;font-size:10px;color:#6b7280;line-height:1.8">
          فاتورة ضريبية إلكترونية صادرة وفق نظام هيئة الزكاة والضريبة والجمارك — لا تحتاج إلى توقيع أو ختم يدوي.
          <br><span style="color:#a89968">Electronic Tax Invoice · Compliant with ZATCA e-invoicing regulations</span>
        </div>
        <div style="text-align:left;direction:ltr;font-size:10px;color:#a89968;font-family:ui-monospace,monospace;line-height:1.6">
          <div style="color:#111827;font-weight:700">ash-holding.sa</div>
          <div>Page 1 / 1</div>
        </div>
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
