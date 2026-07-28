// Single-page A4 ZATCA-compliant tax invoice — Arabic-first, RTL-correct.
// Modern luxury design: navy + royal blue + light blue-gray + white.
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

export type InvoiceLike = {
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

// Palette — navy / royal blue / soft blue-gray / white + status accents
const C = {
  white:   "#FFFFFF",
  ink:     "#0B1E3A", // deep navy
  royal:   "#1D4ED8", // royal blue
  royal2:  "#3B82F6", // lighter accent
  soft:    "#EEF2FA", // very light blue-gray
  soft2:   "#F7F9FD",
  line:    "#DDE4F0",
  muted:   "#5A6B85",
  dim:     "#8A99B4",
  paid:    "#059669",
  paidBg:  "#D1FAE5",
  unpaid:  "#B45309",
  unpaidBg:"#FEF3C7",
  danger:  "#B91C1C",
  dangerBg:"#FEE2E2",
};

const fmtSAR = (n: number | string | undefined) =>
  new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n ?? 0));

const fmtDate = (d?: string | null) => {
  if (!d) return "—";
  try {
    return new Intl.DateTimeFormat("ar-SA-u-ca-gregory-nu-latn", { year: "numeric", month: "long", day: "numeric" }).format(new Date(d));
  } catch { return "—"; }
};

const statusMap: Record<string, { label: string; color: string; bg: string }> = {
  PAID:      { label: "مدفوعة",      color: C.paid,   bg: C.paidBg },
  UNPAID:    { label: "غير مدفوعة",  color: C.unpaid, bg: C.unpaidBg },
  OVERDUE:   { label: "متأخرة",      color: C.danger, bg: C.dangerBg },
  SENT:      { label: "مرسلة",       color: C.royal,  bg: C.soft },
  DRAFT:     { label: "مسودة",       color: C.muted,  bg: C.soft },
  CANCELLED: { label: "ملغاة",       color: C.muted,  bg: C.soft },
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
    [1, sellerName], [2, vat], [3, isoTimestamp], [4, total], [5, vatAmount],
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

// SHA-256 digital fingerprint from the invoice's real data
export async function computeInvoiceHash(inv: InvoiceLike): Promise<string> {
  const payload = JSON.stringify({
    n: inv.invoiceNumber, t: inv.total, s: inv.subtotal, x: inv.taxAmount ?? inv.tax,
    d: inv.issueDate ?? inv.issuedAt ?? inv.createdAt, r: inv.requestRef ?? null,
    c: inv.client?.user?.email ?? inv.client?.email ?? null,
    i: (inv.items ?? []).map(it => [it.title, it.quantity ?? it.qty, it.unitPrice, it.total]),
  });
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(payload));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

export function signatureIdFromHash(hash: string, invoiceNumber?: string): string {
  const short = hash.slice(0, 12).toUpperCase();
  return `SIG-${(invoiceNumber ?? "INV").replace(/^INV-?/, "")}-${short}`;
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

  const isoTs = new Date(issueDateRaw).toISOString();
  const tlv = buildZatcaTLV(SELLER.name, SELLER.vat, isoTs, total.toFixed(2), tax.toFixed(2));
  const qrDataUrl = await QRCode.toDataURL(tlv, { margin: 0, width: 160, errorCorrectionLevel: "M" });

  const hash = await computeInvoiceHash(inv);
  const sigId = signatureIdFromHash(hash, invNo);
  const signedAt = new Intl.DateTimeFormat("ar-SA-u-ca-gregory-nu-latn", { dateStyle: "long", timeStyle: "short" }).format(new Date());
  const verifyUrl = `ash-holding.sa/verify?ref=${encodeURIComponent(invNo)}`;

  const capped = items.slice(0, 6);
  const rowsHtml = capped.map((it, i) => {
    const qty = itemQty(it);
    const unit = Number(it.unitPrice ?? it.total ?? 0);
    const line = Number(it.total ?? unit * qty);
    const desc = (it.description ?? "").toString().trim();
    const zebra = i % 2 === 1 ? C.soft2 : C.white;
    const label = itemLabel(it, projectTitle);
    const showDesc = desc && desc !== label && desc !== projectTitle && !label.includes(desc);
    return `
      <tr style="background:${zebra}">
        <td style="padding:9px 12px;border-bottom:1px solid ${C.line};color:${C.dim};font-size:10.5px;vertical-align:top;width:32px" dir="ltr">${String(i + 1).padStart(2,"0")}</td>
        <td style="padding:9px 12px;border-bottom:1px solid ${C.line};vertical-align:top;unicode-bidi:plaintext">
          <div style="font-weight:700;font-size:11.5px;color:${C.ink};line-height:1.5">${label}</div>
          ${showDesc ? `<div style="font-size:10px;color:${C.muted};line-height:1.6;margin-top:2px">${desc}</div>` : ""}
        </td>
        <td style="padding:9px 12px;border-bottom:1px solid ${C.line};text-align:center;color:${C.ink};font-size:11px;font-variant-numeric:tabular-nums;width:52px">${qty}</td>
        <td style="padding:9px 12px;border-bottom:1px solid ${C.line};text-align:end;color:${C.ink};font-size:11px;font-variant-numeric:tabular-nums;width:94px" dir="ltr">${fmtSAR(unit)}</td>
        <td style="padding:9px 12px;border-bottom:1px solid ${C.line};text-align:end;color:${C.ink};font-size:11.5px;font-weight:800;font-variant-numeric:tabular-nums;width:104px" dir="ltr">${fmtSAR(line)}</td>
      </tr>`;
  }).join("");

  const notes = inv.notes ?? "يُرجى تحويل المبلغ إلى الحساب البنكي أدناه أو السداد الفوري عبر المحفظة الرقمية في بوابة العميل.";

  const PAD_X = 34;
  const PAD_Y = 28;
  const wrapper = document.createElement("div");
  wrapper.setAttribute("dir", "rtl");
  wrapper.setAttribute("lang", "ar");
  wrapper.style.cssText = `position:fixed;left:-10000px;top:0;width:794px;height:1123px;background:${C.white};color:${C.ink};direction:rtl;box-sizing:border-box;font-family:'IBM Plex Sans Arabic','Noto Sans Arabic','Segoe UI',Tahoma,sans-serif;overflow:hidden;unicode-bidi:plaintext;text-align:right;display:flex;flex-direction:column`;

  wrapper.innerHTML = `
    <!-- Top brand rule (gradient) -->
    <div style="height:6px;background:linear-gradient(90deg,${C.ink} 0%,${C.royal} 55%,${C.royal2} 100%);flex-shrink:0"></div>

    <!-- HEADER -->
    <div style="padding:${PAD_Y}px ${PAD_X}px 14px;flex-shrink:0;display:grid;grid-template-columns:1fr auto;gap:24px;align-items:flex-start;border-bottom:1px solid ${C.line}">
      <div>
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px">
          <div style="width:48px;height:48px;border-radius:12px;background:linear-gradient(135deg,${C.ink},${C.royal});display:flex;align-items:center;justify-content:center;font-weight:900;font-size:22px;color:${C.white};box-shadow:0 6px 14px rgba(29,78,216,.22)">ش</div>
          <div>
            <div style="font-size:15px;font-weight:800;color:${C.ink};line-height:1.35">${SELLER.name}</div>
            <div style="font-size:10.5px;color:${C.muted};margin-top:2px">${SELLER.address}</div>
          </div>
        </div>
        <div style="font-size:10.5px;color:${C.muted};line-height:1.8">
          <span>الرقم الضريبي: </span><span dir="ltr" style="color:${C.ink};font-weight:700">${SELLER.vat}</span>
          <span style="margin:0 8px;color:${C.line}">|</span>
          <span dir="ltr" style="color:${C.ink};font-weight:600">${SELLER.email}</span>
        </div>
      </div>
      <div style="text-align:left;min-width:220px">
        <div style="display:inline-block;padding:4px 12px;border-radius:999px;background:${C.soft};color:${C.royal};font-size:10px;font-weight:800;letter-spacing:2px;margin-bottom:8px">فاتورة ضريبية</div>
        <div style="font-size:10px;color:${C.muted};font-weight:700;letter-spacing:1.5px;margin-bottom:3px">رقم الفاتورة</div>
        <div style="font-size:20px;font-weight:800;color:${C.ink};line-height:1.1;letter-spacing:-.3px" dir="ltr">${invNo}</div>
        <div style="margin-top:8px">
          <span style="display:inline-block;padding:5px 14px;border-radius:999px;font-weight:800;font-size:10.5px;background:${st.bg};color:${st.color}">● ${st.label}</span>
        </div>
      </div>
    </div>

    <!-- MAIN -->
    <div style="flex:1;display:flex;flex-direction:column;justify-content:space-between;padding:16px ${PAD_X}px ${PAD_Y - 4}px">

      <div>
        <!-- META STRIP -->
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:14px">
          ${[
            ["تاريخ الإصدار", issueDate, false],
            ["تاريخ الاستحقاق", dueDate, false],
            ["المرجع", reqRef || invNo, true],
            ["العملة", "ريال سعودي (SAR)", false],
          ].map(([k,v,ltr]) => `
            <div style="background:${C.soft2};border:1px solid ${C.line};border-radius:10px;padding:9px 12px">
              <div style="font-size:9px;color:${C.muted};font-weight:700;letter-spacing:1.2px;margin-bottom:3px">${k}</div>
              <div ${ltr ? 'dir="ltr" style="text-align:right;' : 'style="'}font-size:11.5px;font-weight:700;color:${C.ink};font-variant-numeric:tabular-nums">${v}</div>
            </div>`).join("")}
        </div>

        <!-- SELLER & CLIENT CARDS -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px">
          <div style="border:1px solid ${C.line};border-radius:10px;padding:11px 13px;background:${C.white}">
            <div style="font-size:9.5px;color:${C.royal};font-weight:800;letter-spacing:1.6px;margin-bottom:5px">فاتورة إلى</div>
            <div style="font-size:12.5px;font-weight:800;color:${C.ink};margin-bottom:2px">${clientName}</div>
            ${clientCompany ? `<div style="font-size:10.5px;color:${C.muted};line-height:1.7">${clientCompany}</div>` : ""}
            ${clientVat ? `<div style="font-size:10.5px;color:${C.muted};line-height:1.7">الرقم الضريبي: <span dir="ltr" style="color:${C.ink};font-weight:700">${clientVat}</span></div>` : ""}
            ${clientEmail ? `<div style="font-size:10.5px;color:${C.muted};line-height:1.7" dir="ltr">${clientEmail}</div>` : ""}
            ${clientPhone ? `<div style="font-size:10.5px;color:${C.muted};line-height:1.7" dir="ltr">${clientPhone}</div>` : ""}
          </div>
          <div style="border:1px solid ${C.line};border-radius:10px;padding:11px 13px;background:linear-gradient(135deg,${C.soft2},${C.soft})">
            <div style="font-size:9.5px;color:${C.royal};font-weight:800;letter-spacing:1.6px;margin-bottom:5px">المشروع</div>
            <div style="font-size:12.5px;font-weight:800;color:${C.ink};line-height:1.4">${projectTitle}</div>
            ${duration ? `<div style="font-size:10.5px;color:${C.muted};margin-top:4px">المدة المقترحة: <strong style="color:${C.ink}">${duration} يوم</strong></div>` : ""}
            ${reqRef ? `<div style="font-size:10.5px;color:${C.muted};margin-top:2px">مرجع الطلب: <span dir="ltr" style="color:${C.ink};font-weight:700">${reqRef}</span></div>` : ""}
          </div>
        </div>

        <!-- ITEMS TABLE -->
        <div style="border:1px solid ${C.line};border-radius:10px;overflow:hidden;background:${C.white}">
          <table style="width:100%;border-collapse:collapse">
            <thead>
              <tr style="background:${C.ink};color:${C.white}">
                <th style="padding:9px 12px;text-align:start;font-size:10px;font-weight:800;letter-spacing:1.2px">#</th>
                <th style="padding:9px 12px;text-align:start;font-size:10px;font-weight:800;letter-spacing:1.2px">الوصف</th>
                <th style="padding:9px 12px;text-align:center;font-size:10px;font-weight:800;letter-spacing:1.2px">الكمية</th>
                <th style="padding:9px 12px;text-align:end;font-size:10px;font-weight:800;letter-spacing:1.2px">سعر الوحدة</th>
                <th style="padding:9px 12px;text-align:end;font-size:10px;font-weight:800;letter-spacing:1.2px">الإجمالي (SAR)</th>
              </tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
          </table>
        </div>

        <!-- TOTALS + AMOUNT IN WORDS -->
        <div style="margin-top:12px;display:grid;grid-template-columns:1fr 280px;gap:10px;align-items:stretch">
          <div style="border:1px solid ${C.line};border-radius:10px;padding:12px 14px;background:${C.soft2};display:flex;flex-direction:column;justify-content:center">
            <div style="font-size:9.5px;color:${C.royal};font-weight:800;letter-spacing:1.6px;margin-bottom:6px">المبلغ كتابةً</div>
            <div style="font-size:12px;font-weight:700;color:${C.ink};line-height:1.75">${amountWords}</div>
          </div>
          <div style="border:1px solid ${C.line};border-radius:10px;background:${C.white};overflow:hidden">
            <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 12px;font-size:10.5px;color:${C.muted};border-bottom:1px solid ${C.line}">
              <span>المبلغ الخاضع للضريبة</span>
              <span dir="ltr" style="font-variant-numeric:tabular-nums;font-weight:700;color:${C.ink};font-size:11.5px">${fmtSAR(subtotal)}</span>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 12px;font-size:10.5px;color:${C.muted};border-bottom:1px solid ${C.line}">
              <span>ضريبة القيمة المضافة (${taxRate}%)</span>
              <span dir="ltr" style="font-variant-numeric:tabular-nums;font-weight:700;color:${C.ink};font-size:11.5px">${fmtSAR(tax)}</span>
            </div>
            <div style="padding:11px 14px;background:linear-gradient(135deg,${C.ink},${C.royal});color:${C.white}">
              <div style="font-size:9.5px;color:${C.soft};letter-spacing:1.6px;font-weight:800;margin-bottom:3px">الإجمالي المستحق</div>
              <div style="display:flex;justify-content:space-between;align-items:baseline">
                <span style="font-size:10.5px;color:${C.soft};opacity:.9" dir="ltr">${currency}</span>
                <span dir="ltr" style="font-size:22px;font-weight:800;font-variant-numeric:tabular-nums;letter-spacing:-.3px">${fmtSAR(total)}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- PAYMENT + QR -->
        <div style="margin-top:12px;display:grid;grid-template-columns:1fr auto;gap:10px;align-items:stretch">
          <div style="border:1px solid ${C.line};border-radius:10px;background:${C.white};overflow:hidden">
            <div style="padding:7px 12px;background:${C.soft};border-bottom:1px solid ${C.line};font-size:10px;color:${C.royal};font-weight:800;letter-spacing:1.6px">تفاصيل الدفع</div>
            <div style="padding:9px 13px;font-size:10.5px;color:${C.muted};line-height:1.8">
              <div><span style="color:${C.ink};font-weight:800">المستفيد:</span> ${SELLER.name}</div>
              <div><span style="color:${C.ink};font-weight:800">البنك:</span> ${SELLER.bank}</div>
              <div dir="ltr" style="text-align:right;font-family:ui-monospace,'SFMono-Regular',monospace;margin-top:5px;padding:6px 10px;background:${C.soft2};border:1px dashed ${C.royal};border-radius:6px;font-size:11.5px;color:${C.ink};font-weight:700">${SELLER.iban}</div>
            </div>
          </div>
          <div style="border:1px solid ${C.line};border-radius:10px;padding:9px;background:${C.white};display:flex;flex-direction:column;align-items:center;justify-content:center;width:138px">
            <img src="${qrDataUrl}" alt="ZATCA QR" style="width:118px;height:118px;display:block"/>
            <div style="font-size:8.5px;color:${C.muted};margin-top:4px;text-align:center;line-height:1.4">رمز التحقق الزكوي<br/><span dir="ltr" style="opacity:.75">ZATCA · Phase 1</span></div>
          </div>
        </div>

        <!-- DIGITAL SIGNATURE -->
        <div style="margin-top:12px;border:1px solid ${C.line};border-radius:10px;background:linear-gradient(135deg,${C.white},${C.soft2});padding:11px 13px;display:grid;grid-template-columns:auto 1fr auto;gap:12px;align-items:center">
          <div style="width:38px;height:38px;border-radius:10px;background:${C.paidBg};display:flex;align-items:center;justify-content:center">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${C.paid}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2 4 5v6c0 5 3.5 9.5 8 11 4.5-1.5 8-6 8-11V5l-8-3z"/><path d="m9 12 2 2 4-4"/></svg>
          </div>
          <div style="min-width:0">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:2px">
              <span style="font-size:11px;font-weight:800;color:${C.ink}">التوقيع الرقمي</span>
              <span style="display:inline-block;padding:2px 8px;border-radius:999px;background:${C.paidBg};color:${C.paid};font-size:9px;font-weight:800">تم التحقق</span>
            </div>
            <div style="font-size:9.5px;color:${C.muted};line-height:1.7">
              موقّعة إلكترونياً بواسطة نظام <strong style="color:${C.ink}">شركة آش القابضة</strong> · ${signedAt}
            </div>
            <div style="font-size:9px;color:${C.muted};margin-top:2px" dir="ltr">
              <span style="color:${C.ink};font-weight:700">${sigId}</span>
              <span style="margin:0 6px;color:${C.line}">|</span>
              SHA-256: <span style="font-family:ui-monospace,monospace;color:${C.ink}">${hash.slice(0,16)}…${hash.slice(-8)}</span>
            </div>
          </div>
          <div style="text-align:left;font-size:9px;color:${C.muted}" dir="ltr">
            <div style="color:${C.royal};font-weight:800">تحقّق</div>
            <div style="color:${C.ink};font-family:ui-monospace,monospace">${verifyUrl}</div>
          </div>
        </div>
      </div>

      <!-- FOOTER -->
      <div style="padding-top:10px;margin-top:10px;border-top:1px solid ${C.line};display:flex;justify-content:space-between;align-items:center;gap:12px">
        <div style="font-size:9.5px;color:${C.muted};line-height:1.55;max-width:70%">
          ${notes}
        </div>
        <div style="text-align:left;direction:ltr;font-size:9.5px;color:${C.dim};font-family:ui-monospace,monospace">
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
      scale: 2, backgroundColor: "#ffffff", useCORS: true, logging: false,
      windowWidth: 820, windowHeight: 1160, width: 794, height: 1123,
    });

    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const margin = 8;
    const availW = pageW - margin * 2;
    const availH = pageH - margin * 2;
    const imgAspect = canvas.width / canvas.height;
    const boxAspect = availW / availH;
    let drawW: number, drawH: number;
    if (imgAspect >= boxAspect) { drawW = availW; drawH = availW / imgAspect; }
    else { drawH = availH; drawW = availH * imgAspect; }
    const x = (pageW - drawW) / 2;
    const y = margin;
    const imgData = canvas.toDataURL("image/jpeg", 0.95);
    pdf.addImage(imgData, "JPEG", x, y, drawW, drawH, undefined, "FAST");
    pdf.save(`${inv.invoiceNumber ?? "invoice"}.pdf`);
  } finally {
    iframe.remove();
  }
}
