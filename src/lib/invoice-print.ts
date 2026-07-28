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

  // ── Design tokens (locked)
  const C = {
    white: "#FFFFFF",
    ink: "#0A2540",       // deep navy
    blue: "#0E4C92",      // corporate blue
    soft: "#E6EEF7",      // soft blue rows
    line: "#D8E1EC",      // hairline
    muted: "#5B6B7A",
    dim: "#8A99AB",
  };

  const rowsHtml = items.map((it, i) => {
    const qty = itemQty(it);
    const unit = Number(it.unitPrice ?? it.total ?? 0);
    const line = Number(it.total ?? unit * qty);
    const desc = (it.description ?? "").toString().trim();
    const zebra = i % 2 === 1 ? C.soft : C.white;
    return `
      <tr style="background:${zebra}">
        <td style="padding:14px 14px;border-bottom:1px solid ${C.line};color:${C.dim};font-family:'DM Serif Display',Georgia,serif;font-size:14px;vertical-align:top;width:48px" dir="ltr">${String(i + 1).padStart(2,"0")}</td>
        <td style="padding:14px 14px;border-bottom:1px solid ${C.line};vertical-align:top">
          <div style="font-weight:700;font-size:13px;color:${C.ink};line-height:1.6">${itemLabel(it, projectTitle)}</div>
          ${desc && desc !== itemLabel(it, projectTitle) ? `<div style="font-size:11px;color:${C.muted};line-height:1.8;margin-top:4px;font-weight:400">${desc}</div>` : ""}
        </td>
        <td style="padding:14px 14px;border-bottom:1px solid ${C.line};text-align:center;color:${C.ink};font-size:12px;font-variant-numeric:tabular-nums;width:70px">${qty}</td>
        <td style="padding:14px 14px;border-bottom:1px solid ${C.line};text-align:end;color:${C.ink};font-size:12px;font-variant-numeric:tabular-nums;width:120px" dir="ltr">${fmtSAR(unit)}</td>
        <td style="padding:14px 14px;border-bottom:1px solid ${C.line};text-align:end;color:${C.ink};font-size:13px;font-weight:800;font-variant-numeric:tabular-nums;width:130px" dir="ltr">${fmtSAR(line)}</td>
      </tr>`;
  }).join("");

  const notes = inv.notes ?? "يُرجى تحويل المبلغ إلى الحساب البنكي أدناه أو السداد من خلال المحفظة الرقمية عبر بوابة العميل. لأي استفسار: billing@ash-holding.sa";

  const wrapper = document.createElement("div");
  wrapper.style.cssText = `position:fixed;left:-10000px;top:0;width:794px;background:${C.white};color:${C.ink};direction:rtl;box-sizing:border-box;font-family:'Fira Sans','IBM Plex Sans Arabic','Noto Sans Arabic','Cairo','Segoe UI',Tahoma,sans-serif;overflow:hidden`;
  wrapper.setAttribute("dir", "rtl");

  wrapper.innerHTML = `
    <div style="position:relative;background:${C.white}">
      <!-- Top corporate blue rule -->
      <div style="height:4px;background:${C.blue}"></div>

      <!-- ══════════ HERO — magazine masthead ══════════ -->
      <div style="padding:36px 44px 20px 44px;display:grid;grid-template-columns:1fr auto;gap:24px;align-items:end">
        <!-- Right (RTL leading): brand -->
        <div>
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:14px">
            <div style="width:44px;height:44px;border-radius:6px;background:${C.blue};display:flex;align-items:center;justify-content:center;font-weight:900;font-size:20px;color:${C.white};font-family:'Fira Sans',sans-serif;letter-spacing:0">ش</div>
            <div>
              <div style="font-size:16px;font-weight:700;color:${C.ink};letter-spacing:.2px">شركة علي صالح الشهري القابضة</div>
              <div style="font-size:10.5px;color:${C.blue};letter-spacing:3px;font-weight:600;margin-top:3px" dir="ltr">ASH · HOLDING</div>
            </div>
          </div>
          <div style="display:inline-flex;align-items:center;gap:8px;padding:5px 12px;background:${C.soft};border-radius:3px">
            <span style="width:5px;height:5px;background:${C.blue};border-radius:50%"></span>
            <span style="font-size:10px;font-weight:700;color:${C.blue};letter-spacing:2.4px">فاتورة ضريبية · TAX INVOICE</span>
          </div>
        </div>

        <!-- Left: editorial invoice number -->
        <div style="text-align:left;direction:ltr">
          <div style="font-size:9.5px;color:${C.muted};letter-spacing:3.5px;font-weight:700;margin-bottom:2px;font-family:'Fira Sans',sans-serif">INVOICE №</div>
          <div style="font-family:'DM Serif Display',Georgia,serif;font-size:44px;font-weight:400;color:${C.ink};line-height:1;letter-spacing:-.5px">${invNo}</div>
          <div style="margin-top:10px">
            <span style="display:inline-block;padding:5px 12px;border-radius:2px;font-weight:800;font-size:10.5px;background:${st.bg};color:${st.color};border:1px solid ${st.border};letter-spacing:1px">${st.label.toUpperCase()}</span>
          </div>
        </div>
      </div>

      <!-- Hairline -->
      <div style="margin:0 44px;height:1px;background:${C.line}"></div>

      <!-- ══════════ META STRIP ══════════ -->
      <div style="padding:18px 44px 22px 44px;display:grid;grid-template-columns:repeat(4,1fr);gap:20px">
        ${[
          ["تاريخ الإصدار", issueDate],
          ["تاريخ الاستحقاق", dueDate],
          ["المرجع", reqRef || invNo],
          ["العملة", `${currency} · ريال سعودي`],
        ].map(([k,v]) => `
          <div style="border-inline-start:2px solid ${C.blue};padding-inline-start:10px">
            <div style="font-size:9px;color:${C.muted};font-weight:700;letter-spacing:2px;margin-bottom:5px">${k}</div>
            <div style="font-size:13px;font-weight:700;color:${C.ink};font-variant-numeric:tabular-nums">${v}</div>
          </div>`).join("")}
      </div>

      <!-- ══════════ PARTIES ══════════ -->
      <div style="margin:0 44px 22px 44px;display:grid;grid-template-columns:1fr 1fr;gap:0;border:1px solid ${C.line};border-radius:4px;overflow:hidden;background:${C.white}">
        <div style="padding:18px 20px;border-inline-end:1px solid ${C.line};background:${C.soft}">
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:10px">
            <span style="width:3px;height:12px;background:${C.blue}"></span>
            <span style="font-size:9.5px;color:${C.blue};font-weight:800;letter-spacing:2.4px">فاتورة إلى · BILL TO</span>
          </div>
          <div style="font-size:15px;font-weight:800;color:${C.ink};margin-bottom:4px">${clientName}</div>
          ${clientCompany ? `<div style="font-size:11.5px;color:${C.muted};line-height:1.9">${clientCompany}</div>` : ""}
          ${clientEmail ? `<div style="font-size:11.5px;color:${C.muted};line-height:1.9" dir="ltr">${clientEmail}</div>` : ""}
          ${clientPhone ? `<div style="font-size:11.5px;color:${C.muted};line-height:1.9" dir="ltr">${clientPhone}</div>` : ""}
        </div>
        <div style="padding:18px 20px;background:${C.white}">
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:10px">
            <span style="width:3px;height:12px;background:${C.ink}"></span>
            <span style="font-size:9.5px;color:${C.ink};font-weight:800;letter-spacing:2.4px">من · FROM</span>
          </div>
          <div style="font-size:15px;font-weight:800;color:${C.ink};margin-bottom:4px">شركة علي صالح الشهري القابضة</div>
          <div style="font-size:11.5px;color:${C.muted};line-height:1.9">الرياض · المملكة العربية السعودية</div>
          <div style="font-size:11.5px;color:${C.muted};line-height:1.9">الرقم الضريبي: <span dir="ltr">300000000000003</span></div>
          <div style="font-size:11.5px;color:${C.muted};line-height:1.9" dir="ltr">billing@ash-holding.sa</div>
        </div>
      </div>

      <!-- ══════════ PROJECT BANNER (deep navy) ══════════ -->
      <div style="margin:0 44px 10px 44px;padding:14px 18px;background:${C.ink};border-radius:4px;color:${C.white};display:flex;justify-content:space-between;align-items:center;gap:12px">
        <div style="display:flex;align-items:center;gap:12px">
          <span style="font-size:9.5px;color:${C.soft};letter-spacing:2.4px;font-weight:700;padding-inline-end:12px;border-inline-end:1px solid rgba(255,255,255,.18)">المشروع</span>
          <span style="font-size:14px;font-weight:700;color:${C.white}">${projectTitle}</span>
        </div>
        ${duration ? `<div style="font-size:11px;color:${C.soft}"><span style="opacity:.7">المدة:</span> <strong style="color:${C.white}">${duration} يوم</strong></div>` : ""}
      </div>

      <!-- ══════════ ITEMS ══════════ -->
      <div style="margin:14px 44px 0 44px">
        <table style="width:100%;border-collapse:collapse;font-size:12px;background:${C.white};border:1px solid ${C.line};border-radius:4px;overflow:hidden">
          <thead>
            <tr style="background:${C.white}">
              <th style="padding:12px 14px;text-align:start;font-size:9.5px;color:${C.blue};font-weight:800;letter-spacing:2px;border-bottom:2px solid ${C.blue}">#</th>
              <th style="padding:12px 14px;text-align:start;font-size:9.5px;color:${C.blue};font-weight:800;letter-spacing:2px;border-bottom:2px solid ${C.blue}">الوصف · DESCRIPTION</th>
              <th style="padding:12px 14px;text-align:center;font-size:9.5px;color:${C.blue};font-weight:800;letter-spacing:2px;border-bottom:2px solid ${C.blue}">الكمية</th>
              <th style="padding:12px 14px;text-align:end;font-size:9.5px;color:${C.blue};font-weight:800;letter-spacing:2px;border-bottom:2px solid ${C.blue}">سعر الوحدة</th>
              <th style="padding:12px 14px;text-align:end;font-size:9.5px;color:${C.blue};font-weight:800;letter-spacing:2px;border-bottom:2px solid ${C.blue}">الإجمالي (SAR)</th>
            </tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
        </table>
      </div>

      <!-- ══════════ SUMMARY + AMOUNT IN WORDS ══════════ -->
      <div style="margin:18px 44px 0 44px;display:grid;grid-template-columns:1fr 300px;gap:18px;align-items:stretch">
        <!-- Amount in words -->
        <div style="border:1px solid ${C.line};border-radius:4px;padding:16px 18px;background:${C.soft};display:flex;flex-direction:column;justify-content:center;position:relative">
          <div style="position:absolute;top:0;bottom:0;right:0;width:3px;background:${C.blue}"></div>
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:8px">
            <span style="font-size:9.5px;color:${C.blue};font-weight:800;letter-spacing:2.4px">المبلغ كتابةً · AMOUNT IN WORDS</span>
          </div>
          <div style="font-size:14px;font-weight:700;color:${C.ink};line-height:1.8">${amountWords}</div>
        </div>

        <!-- Totals card -->
        <div style="border:1px solid ${C.line};border-radius:4px;background:${C.white};overflow:hidden">
          <div style="display:flex;justify-content:space-between;align-items:center;padding:11px 14px;font-size:11.5px;color:${C.muted};border-bottom:1px solid ${C.line}">
            <span>المجموع الفرعي</span>
            <span dir="ltr" style="font-variant-numeric:tabular-nums;font-weight:700;color:${C.ink}">${fmtSAR(subtotal)}</span>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center;padding:11px 14px;font-size:11.5px;color:${C.muted};border-bottom:1px solid ${C.line}">
            <span>ضريبة القيمة المضافة (${taxRate}%)</span>
            <span dir="ltr" style="font-variant-numeric:tabular-nums;font-weight:700;color:${C.ink}">${fmtSAR(tax)}</span>
          </div>
          <div style="position:relative;padding:16px 16px;background:${C.blue};color:${C.white}">
            <div style="font-size:9.5px;color:${C.soft};letter-spacing:2.4px;font-weight:800;margin-bottom:4px">الإجمالي المستحق · TOTAL DUE</div>
            <div style="display:flex;justify-content:space-between;align-items:baseline">
              <span style="font-size:11px;color:${C.soft};opacity:.85" dir="ltr">${currency}</span>
              <span dir="ltr" style="font-family:'DM Serif Display',Georgia,serif;font-size:30px;font-weight:400;font-variant-numeric:tabular-nums;letter-spacing:-.5px">${fmtSAR(total)}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- ══════════ PAYMENT ══════════ -->
      <div style="margin:18px 44px 0 44px;border:1px solid ${C.line};border-radius:4px;background:${C.white};overflow:hidden">
        <div style="padding:11px 16px;background:${C.soft};border-bottom:1px solid ${C.line};display:flex;align-items:center;gap:8px">
          <span style="width:3px;height:12px;background:${C.blue}"></span>
          <span style="font-size:10px;color:${C.blue};font-weight:800;letter-spacing:2.4px">تفاصيل الدفع · PAYMENT DETAILS</span>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;padding:14px 16px;gap:14px">
          <div style="font-size:11.5px;color:${C.muted};line-height:2">
            <div><span style="color:${C.ink};font-weight:800">المستفيد:</span> شركة علي صالح الشهري القابضة</div>
            <div><span style="color:${C.ink};font-weight:800">البنك:</span> بنك ساب (SAB)</div>
            <div dir="ltr" style="text-align:right;font-family:ui-monospace,'SFMono-Regular',monospace;margin-top:6px;padding:8px 10px;background:${C.soft};border:1px dashed ${C.blue};border-radius:3px;font-size:12.5px;color:${C.ink};font-weight:700;letter-spacing:.5px">SA37 4500 0000 2623 5939 1001</div>
          </div>
          <div style="font-size:11.5px;color:${C.muted};line-height:2">
            <div><span style="color:${C.ink};font-weight:800">شروط:</span> يستحق السداد خلال 7 أيام</div>
            <div><span style="color:${C.ink};font-weight:800">مرجع التحويل:</span> <span dir="ltr" style="font-family:ui-monospace,monospace;color:${C.ink};font-weight:700">${reqRef || invNo}</span></div>
            <div><span style="color:${C.ink};font-weight:800">أو:</span> الدفع الفوري عبر المحفظة الرقمية في بوابة العميل</div>
          </div>
        </div>
      </div>

      <!-- ══════════ NOTES ══════════ -->
      <div style="margin:14px 44px 0 44px;padding:12px 16px;background:${C.white};border-inline-start:3px solid ${C.blue}">
        <div style="font-size:9.5px;color:${C.blue};font-weight:800;letter-spacing:2.4px;margin-bottom:4px">ملاحظات · NOTES</div>
        <div style="font-size:11.5px;color:${C.muted};line-height:1.9">${notes}</div>
      </div>

      <!-- ══════════ FOOTER ══════════ -->
      <div style="margin-top:26px;padding:16px 44px 20px 44px;border-top:1px solid ${C.line};display:grid;grid-template-columns:auto 1fr auto;gap:18px;align-items:center">
        <div style="width:38px;height:38px;border-radius:6px;background:${C.blue};display:flex;align-items:center;justify-content:center;font-weight:900;font-size:16px;color:${C.white}">ش</div>
        <div style="text-align:center;font-size:10px;color:${C.muted};line-height:1.8">
          فاتورة ضريبية إلكترونية صادرة وفق نظام هيئة الزكاة والضريبة والجمارك — لا تحتاج إلى توقيع أو ختم يدوي.
          <br><span style="color:${C.dim}" dir="ltr">Electronic Tax Invoice · Compliant with ZATCA e-invoicing regulations</span>
        </div>
        <div style="text-align:left;direction:ltr;font-size:10px;color:${C.dim};font-family:ui-monospace,monospace;line-height:1.6">
          <div style="color:${C.ink};font-weight:700">ash-holding.sa</div>
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
<link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Fira+Sans:wght@400;500;600;700;800&family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&family=Noto+Sans+Arabic:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>
html,body{margin:0;padding:0;background:#fff;font-family:"Fira Sans","IBM Plex Sans Arabic","Noto Sans Arabic","Segoe UI",Tahoma,Arial,sans-serif;-webkit-font-smoothing:antialiased}
*{box-sizing:border-box}
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
        (doc as any).fonts?.load('400 14px "Fira Sans"'),
        (doc as any).fonts?.load('700 14px "Fira Sans"'),
        (doc as any).fonts?.load('400 14px "IBM Plex Sans Arabic"'),
        (doc as any).fonts?.load('700 14px "IBM Plex Sans Arabic"'),
        (doc as any).fonts?.load('400 44px "DM Serif Display"'),
      ]);
    } catch { /* fonts API unavailable */ }
    await new Promise((r) => setTimeout(r, 450));

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
