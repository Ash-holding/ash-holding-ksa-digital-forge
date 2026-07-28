// Single-page A4 ZATCA-compliant tax invoice — Arabic-first, RTL-correct.
// Renders styled HTML in an isolated iframe, snapshots via html2canvas,
// then embeds a single contained image on ONE A4 page.

import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import QRCode from "qrcode";
import { api } from "@/lib/api";

type InvoiceItemLike = {
  title?: string;
  description?: string | null;
  quantity?: number;
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

const SELLER = {
  name: "شركة علي صالح محمد الشهري القابضة",
  vat: "300000000000003",
  address: "الرياض · المملكة العربية السعودية",
  email: "billing@ash-holding.sa",
  bank: "بنك ساب (SAB)",
  iban: "SA3745000000262359391001",
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

// Build ZATCA Phase-1 TLV then base64
function buildZatcaTLV(sellerName: string, vat: string, isoTimestamp: string, total: string, vatAmount: string): string {
  const enc = new TextEncoder();
  const fields: [number, string][] = [
    [1, sellerName],
    [2, vat],
    [3, isoTimestamp],
    [4, total],
    [5, vatAmount],
  ];
  const chunks: number[] = [];
  for (const [tag, value] of fields) {
    const bytes = enc.encode(value);
    chunks.push(tag, bytes.length, ...bytes);
  }
  let binary = "";
  for (const b of chunks) binary += String.fromCharCode(b);
  return btoa(binary);
}

async function buildInvoiceNode(inv: InvoiceLike): Promise<HTMLDivElement> {
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
  const clientVat = inv.client?.vatNumber ?? "";
  const projectTitle = inv.linkedRequest?.title ?? inv.project?.title ?? "خدمات مهنية";
  const issueDateRaw = inv.issueDate ?? inv.issuedAt ?? inv.createdAt ?? new Date().toISOString();
  const issueDate = fmtDate(issueDateRaw);
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

  // ZATCA QR
  const isoTs = new Date(issueDateRaw).toISOString();
  const tlv = buildZatcaTLV(SELLER.name, SELLER.vat, isoTs, total.toFixed(2), tax.toFixed(2));
  const qrDataUrl = await QRCode.toDataURL(tlv, { margin: 0, width: 160, errorCorrectionLevel: "M" });

  const C = {
    white: "#FFFFFF",
    ink: "#0A2540",
    blue: "#0E4C92",
    soft: "#E6EEF7",
    line: "#D8E1EC",
    muted: "#5B6B7A",
    dim: "#8A99AB",
  };

  // Cap items to keep single-page fit
  const capped = items.slice(0, 8);
  const rowsHtml = capped.map((it, i) => {
    const qty = itemQty(it);
    const unit = Number(it.unitPrice ?? it.total ?? 0);
    const line = Number(it.total ?? unit * qty);
    const desc = (it.description ?? "").toString().trim();
    const zebra = i % 2 === 1 ? C.soft : C.white;
    const label = itemLabel(it, projectTitle);
    return `
      <tr style="background:${zebra}">
        <td style="padding:7px 10px;border-bottom:1px solid ${C.line};color:${C.dim};font-size:10px;vertical-align:top;width:32px" dir="ltr">${String(i + 1).padStart(2,"0")}</td>
        <td style="padding:7px 10px;border-bottom:1px solid ${C.line};vertical-align:top;unicode-bidi:plaintext">
          <div style="font-weight:700;font-size:10.5px;color:${C.ink};line-height:1.5">${label}</div>
          ${desc && desc !== label ? `<div style="font-size:9px;color:${C.muted};line-height:1.6;margin-top:2px;font-weight:400">${desc}</div>` : ""}
        </td>
        <td style="padding:7px 10px;border-bottom:1px solid ${C.line};text-align:center;color:${C.ink};font-size:10px;font-variant-numeric:tabular-nums;width:44px">${qty}</td>
        <td style="padding:7px 10px;border-bottom:1px solid ${C.line};text-align:end;color:${C.ink};font-size:10px;font-variant-numeric:tabular-nums;width:80px" dir="ltr">${fmtSAR(unit)}</td>
        <td style="padding:7px 10px;border-bottom:1px solid ${C.line};text-align:end;color:${C.ink};font-size:10.5px;font-weight:800;font-variant-numeric:tabular-nums;width:90px" dir="ltr">${fmtSAR(line)}</td>
      </tr>`;
  }).join("");

  const notes = inv.notes ?? "يُرجى تحويل المبلغ إلى الحساب البنكي أدناه أو السداد الفوري عبر المحفظة الرقمية في بوابة العميل.";

  // 794px width ≈ A4 at 96dpi. Target inner height ≤ 1123px for single-page fit.
  const wrapper = document.createElement("div");
  wrapper.setAttribute("dir", "rtl");
  wrapper.setAttribute("lang", "ar");
  wrapper.style.cssText = `position:fixed;left:-10000px;top:0;width:794px;background:${C.white};color:${C.ink};direction:rtl;box-sizing:border-box;font-family:'IBM Plex Sans Arabic','Noto Sans Arabic','Segoe UI',Tahoma,sans-serif;overflow:hidden;unicode-bidi:plaintext;text-align:right`;

  wrapper.innerHTML = `
    <div style="position:relative;background:${C.white}">
      <div style="height:4px;background:${C.blue}"></div>

      <!-- HERO -->
      <div style="padding:18px 28px 12px 28px;display:grid;grid-template-columns:1fr auto;gap:20px;align-items:center">
        <div>
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
            <div style="width:36px;height:36px;border-radius:6px;background:${C.blue};display:flex;align-items:center;justify-content:center;font-weight:900;font-size:16px;color:${C.white}">ش</div>
            <div>
              <div style="font-size:14px;font-weight:800;color:${C.ink};line-height:1.3">${SELLER.name}</div>
              <div style="font-size:9.5px;color:${C.muted};margin-top:1px">الرقم الضريبي: <span dir="ltr">${SELLER.vat}</span></div>
            </div>
          </div>
          <div style="display:inline-flex;align-items:center;gap:6px;padding:3px 10px;background:${C.soft};border-radius:3px">
            <span style="width:5px;height:5px;background:${C.blue};border-radius:50%"></span>
            <span style="font-size:10px;font-weight:800;color:${C.blue};letter-spacing:1.5px">فاتورة ضريبية</span>
          </div>
        </div>
        <div style="text-align:left;direction:ltr">
          <div style="font-size:8.5px;color:${C.muted};letter-spacing:2.5px;font-weight:700;margin-bottom:2px">INVOICE №</div>
          <div style="font-size:22px;font-weight:800;color:${C.ink};line-height:1;letter-spacing:-.3px" dir="ltr">${invNo}</div>
          <div style="margin-top:6px">
            <span style="display:inline-block;padding:3px 10px;border-radius:2px;font-weight:800;font-size:10px;background:${st.bg};color:${st.color};border:1px solid ${st.border}">${st.label}</span>
          </div>
        </div>
      </div>

      <div style="margin:0 28px;height:1px;background:${C.line}"></div>

      <!-- META STRIP -->
      <div style="padding:10px 28px 12px 28px;display:grid;grid-template-columns:repeat(4,1fr);gap:14px">
        ${[
          ["تاريخ الإصدار", issueDate, false],
          ["تاريخ الاستحقاق", dueDate, false],
          ["المرجع", reqRef || invNo, true],
          ["العملة", "ريال سعودي (SAR)", false],
        ].map(([k,v,ltr]) => `
          <div style="border-inline-start:2px solid ${C.blue};padding-inline-start:8px">
            <div style="font-size:8.5px;color:${C.muted};font-weight:700;letter-spacing:1.5px;margin-bottom:3px">${k}</div>
            <div ${ltr ? 'dir="ltr" style="text-align:right;' : 'style="'}font-size:11px;font-weight:700;color:${C.ink};font-variant-numeric:tabular-nums;line-height:1.4">${v}</div>
          </div>`).join("")}
      </div>

      <!-- PARTIES -->
      <div style="margin:0 28px 10px 28px;display:grid;grid-template-columns:1fr 1fr;gap:0;border:1px solid ${C.line};border-radius:4px;overflow:hidden">
        <div style="padding:10px 12px;border-inline-end:1px solid ${C.line};background:${C.soft}">
          <div style="display:flex;align-items:center;gap:5px;margin-bottom:5px">
            <span style="width:3px;height:10px;background:${C.blue}"></span>
            <span style="font-size:9px;color:${C.blue};font-weight:800;letter-spacing:1.8px">فاتورة إلى</span>
          </div>
          <div style="font-size:12px;font-weight:800;color:${C.ink};margin-bottom:2px">${clientName}</div>
          ${clientCompany ? `<div style="font-size:10px;color:${C.muted};line-height:1.7">${clientCompany}</div>` : ""}
          ${clientVat ? `<div style="font-size:10px;color:${C.muted};line-height:1.7">الرقم الضريبي: <span dir="ltr">${clientVat}</span></div>` : ""}
          ${clientEmail ? `<div style="font-size:10px;color:${C.muted};line-height:1.7" dir="ltr">${clientEmail}</div>` : ""}
          ${clientPhone ? `<div style="font-size:10px;color:${C.muted};line-height:1.7" dir="ltr">${clientPhone}</div>` : ""}
        </div>
        <div style="padding:10px 12px">
          <div style="display:flex;align-items:center;gap:5px;margin-bottom:5px">
            <span style="width:3px;height:10px;background:${C.ink}"></span>
            <span style="font-size:9px;color:${C.ink};font-weight:800;letter-spacing:1.8px">البائع</span>
          </div>
          <div style="font-size:12px;font-weight:800;color:${C.ink};margin-bottom:2px">${SELLER.name}</div>
          <div style="font-size:10px;color:${C.muted};line-height:1.7">${SELLER.address}</div>
          <div style="font-size:10px;color:${C.muted};line-height:1.7">الرقم الضريبي: <span dir="ltr">${SELLER.vat}</span></div>
          <div style="font-size:10px;color:${C.muted};line-height:1.7" dir="ltr">${SELLER.email}</div>
        </div>
      </div>

      <!-- PROJECT BANNER -->
      <div style="margin:0 28px 8px 28px;padding:8px 12px;background:${C.ink};border-radius:4px;color:${C.white};display:flex;justify-content:space-between;align-items:center;gap:10px">
        <div style="display:flex;align-items:center;gap:10px">
          <span style="font-size:9px;color:${C.soft};letter-spacing:1.8px;font-weight:700;padding-inline-end:10px;border-inline-end:1px solid rgba(255,255,255,.18)">المشروع</span>
          <span style="font-size:11.5px;font-weight:700;color:${C.white}">${projectTitle}</span>
        </div>
        ${duration ? `<div style="font-size:10px;color:${C.soft}"><span style="opacity:.7">المدة:</span> <strong style="color:${C.white}">${duration} يوم</strong></div>` : ""}
      </div>

      <!-- ITEMS -->
      <div style="margin:8px 28px 0 28px">
        <table style="width:100%;border-collapse:collapse;background:${C.white};border:1px solid ${C.line};border-radius:4px;overflow:hidden">
          <thead>
            <tr>
              <th style="padding:7px 10px;text-align:start;font-size:9px;color:${C.blue};font-weight:800;letter-spacing:1.5px;border-bottom:2px solid ${C.blue}">#</th>
              <th style="padding:7px 10px;text-align:start;font-size:9px;color:${C.blue};font-weight:800;letter-spacing:1.5px;border-bottom:2px solid ${C.blue}">الوصف</th>
              <th style="padding:7px 10px;text-align:center;font-size:9px;color:${C.blue};font-weight:800;letter-spacing:1.5px;border-bottom:2px solid ${C.blue}">الكمية</th>
              <th style="padding:7px 10px;text-align:end;font-size:9px;color:${C.blue};font-weight:800;letter-spacing:1.5px;border-bottom:2px solid ${C.blue}">سعر الوحدة</th>
              <th style="padding:7px 10px;text-align:end;font-size:9px;color:${C.blue};font-weight:800;letter-spacing:1.5px;border-bottom:2px solid ${C.blue}">الإجمالي (SAR)</th>
            </tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
        </table>
      </div>

      <!-- SUMMARY + AMOUNT IN WORDS -->
      <div style="margin:10px 28px 0 28px;display:grid;grid-template-columns:1fr 260px;gap:12px;align-items:stretch">
        <div style="border:1px solid ${C.line};border-radius:4px;padding:10px 12px;background:${C.soft};display:flex;flex-direction:column;justify-content:center;position:relative">
          <div style="position:absolute;top:0;bottom:0;right:0;width:3px;background:${C.blue}"></div>
          <div style="font-size:9px;color:${C.blue};font-weight:800;letter-spacing:1.8px;margin-bottom:4px">المبلغ كتابةً</div>
          <div style="font-size:11.5px;font-weight:700;color:${C.ink};line-height:1.7">${amountWords}</div>
        </div>
        <div style="border:1px solid ${C.line};border-radius:4px;background:${C.white};overflow:hidden">
          <div style="display:flex;justify-content:space-between;align-items:center;padding:6px 10px;font-size:10px;color:${C.muted};border-bottom:1px solid ${C.line}">
            <span>المبلغ الخاضع للضريبة</span>
            <span dir="ltr" style="font-variant-numeric:tabular-nums;font-weight:700;color:${C.ink}">${fmtSAR(subtotal)}</span>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center;padding:6px 10px;font-size:10px;color:${C.muted};border-bottom:1px solid ${C.line}">
            <span>ضريبة القيمة المضافة (${taxRate}%)</span>
            <span dir="ltr" style="font-variant-numeric:tabular-nums;font-weight:700;color:${C.ink}">${fmtSAR(tax)}</span>
          </div>
          <div style="padding:10px 12px;background:${C.blue};color:${C.white}">
            <div style="font-size:9px;color:${C.soft};letter-spacing:1.8px;font-weight:800;margin-bottom:3px">الإجمالي المستحق</div>
            <div style="display:flex;justify-content:space-between;align-items:baseline">
              <span style="font-size:10px;color:${C.soft};opacity:.85" dir="ltr">${currency}</span>
              <span dir="ltr" style="font-size:22px;font-weight:800;font-variant-numeric:tabular-nums;letter-spacing:-.3px">${fmtSAR(total)}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- PAYMENT + QR -->
      <div style="margin:10px 28px 0 28px;display:grid;grid-template-columns:1fr auto;gap:12px;align-items:stretch">
        <div style="border:1px solid ${C.line};border-radius:4px;background:${C.white};overflow:hidden">
          <div style="padding:6px 10px;background:${C.soft};border-bottom:1px solid ${C.line};display:flex;align-items:center;gap:6px">
            <span style="width:3px;height:10px;background:${C.blue}"></span>
            <span style="font-size:9px;color:${C.blue};font-weight:800;letter-spacing:1.8px">تفاصيل الدفع</span>
          </div>
          <div style="padding:8px 12px;font-size:10px;color:${C.muted};line-height:1.8">
            <div><span style="color:${C.ink};font-weight:800">المستفيد:</span> ${SELLER.name}</div>
            <div><span style="color:${C.ink};font-weight:800">البنك:</span> ${SELLER.bank}</div>
            <div dir="ltr" style="text-align:right;font-family:ui-monospace,'SFMono-Regular',monospace;margin-top:4px;padding:5px 8px;background:${C.soft};border:1px dashed ${C.blue};border-radius:3px;font-size:11px;color:${C.ink};font-weight:700">${SELLER.iban}</div>
            <div style="margin-top:4px"><span style="color:${C.ink};font-weight:800">مرجع التحويل:</span> <span dir="ltr" style="font-family:ui-monospace,monospace;color:${C.ink};font-weight:700">${reqRef || invNo}</span></div>
          </div>
        </div>
        <div style="border:1px solid ${C.line};border-radius:4px;padding:8px;background:${C.white};display:flex;flex-direction:column;align-items:center;justify-content:center;width:110px">
          <img src="${qrDataUrl}" alt="ZATCA QR" style="width:94px;height:94px;display:block"/>
          <div style="font-size:8px;color:${C.muted};margin-top:4px;text-align:center;letter-spacing:.5px">رمز التحقق الزكوي</div>
        </div>
      </div>

      <!-- NOTES -->
      <div style="margin:8px 28px 0 28px;padding:7px 12px;background:${C.white};border-inline-start:3px solid ${C.blue}">
        <div style="font-size:9px;color:${C.blue};font-weight:800;letter-spacing:1.8px;margin-bottom:2px">ملاحظات</div>
        <div style="font-size:10px;color:${C.muted};line-height:1.7">${notes}</div>
      </div>

      <!-- FOOTER -->
      <div style="margin-top:12px;padding:8px 28px 12px 28px;border-top:1px solid ${C.line};display:flex;justify-content:space-between;align-items:center;gap:12px">
        <div style="font-size:9px;color:${C.muted};line-height:1.6">
          فاتورة ضريبية إلكترونية صادرة وفق نظام هيئة الزكاة والضريبة والجمارك — لا تحتاج إلى توقيع أو ختم يدوي.
        </div>
        <div style="text-align:left;direction:ltr;font-size:9px;color:${C.dim};font-family:ui-monospace,monospace">
          <span style="color:${C.ink};font-weight:700">ash-holding.sa</span>
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
    doc.write(`<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&family=Noto+Sans+Arabic:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>
html,body{margin:0;padding:0;background:#fff;font-family:"IBM Plex Sans Arabic","Noto Sans Arabic","Segoe UI",Tahoma,Arial,sans-serif;-webkit-font-smoothing:antialiased;direction:rtl}
*{box-sizing:border-box;letter-spacing:0 !important}
</style>
</head><body></body></html>`);
    doc.close();
    const node = await buildInvoiceNode(inv);
    node.style.position = "static";
    node.style.left = "0";
    doc.body.appendChild(node);

    try {
      await (doc as any).fonts?.ready;
      await Promise.all([
        (doc as any).fonts?.load('400 12px "IBM Plex Sans Arabic"'),
        (doc as any).fonts?.load('700 12px "IBM Plex Sans Arabic"'),
        (doc as any).fonts?.load('800 22px "IBM Plex Sans Arabic"'),
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

    // ── Fit into ONE A4 page (contain)
    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageW = pdf.internal.pageSize.getWidth();   // 210
    const pageH = pdf.internal.pageSize.getHeight();  // 297
    const margin = 8;                                  // mm safe margin
    const availW = pageW - margin * 2;
    const availH = pageH - margin * 2;
    const imgAspect = canvas.width / canvas.height;
    const boxAspect = availW / availH;
    let drawW: number, drawH: number;
    if (imgAspect >= boxAspect) {
      // limited by width
      drawW = availW;
      drawH = availW / imgAspect;
    } else {
      // limited by height
      drawH = availH;
      drawW = availH * imgAspect;
    }
    const x = (pageW - drawW) / 2;
    const y = margin; // pin to top so content reads naturally
    const imgData = canvas.toDataURL("image/jpeg", 0.95);
    pdf.addImage(imgData, "JPEG", x, y, drawW, drawH, undefined, "FAST");
    pdf.save(`${inv.invoiceNumber ?? "invoice"}.pdf`);
  } finally {
    iframe.remove();
  }
}
