// Payment receipt PDF — official Saudi-government-certificate style (GOSI-like),
// matches the invoice identity: navy/gold, dotted-leader meta, Hijri+Gregorian dates,
// QR verification, formal declaration. Instant download after wallet payment.

import html2canvas from "html2canvas";
import jsPDF from "jspdf";

export type ReceiptLike = {
  receiptNumber?: string;
  invoiceNumber?: string;
  requestRef?: string | null;
  projectTitle?: string | null;
  clientName?: string | null;
  clientCompany?: string | null;
  amount?: number | string;
  currency?: string;
  method?: string;                 // WALLET | BANK_TRANSFER | CARD ...
  paidAt?: string | null;
  cashback?: number | null;        // SAR awarded to wallet
  balanceAfter?: number | null;    // wallet balance after payment (if known)
  paymentId?: string | null;
};

const NAVY = "#0b1220";
const NAVY_SOFT = "#1e293b";
const GOLD = "#c9a84c";
const GOLD_SOFT = "#e8c97a";
const LINE = "#e7e5e4";
const BOX = "#f5f5f4";
const MUTED = "#57534e";
const FAINT = "#78716c";
const INK = "#0f172a";
const GREEN = "#065f46";
const GREEN_BG = "#d1fae5";
const GREEN_BORDER = "#10b981";

const fmtSAR = (n: number | string | null | undefined) =>
  new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n ?? 0));

const fmtGreg = (d?: string | Date | null, withTime = false) => {
  const dd = d ? new Date(d) : new Date();
  try {
    return new Intl.DateTimeFormat("ar-SA-u-ca-gregory-nu-latn", {
      year: "numeric", month: "long", day: "numeric",
      ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
    }).format(dd);
  } catch { return "—"; }
};

const fmtHijri = (d?: string | Date | null) => {
  const dd = d ? new Date(d) : new Date();
  try {
    return new Intl.DateTimeFormat("ar-SA-u-ca-islamic-umalqura-nu-latn", { year: "numeric", month: "long", day: "numeric" }).format(dd);
  } catch { return "—"; }
};

const METHOD_LABEL: Record<string, string> = {
  WALLET: "المحفظة الرقمية",
  BANK_TRANSFER: "تحويل بنكي",
  CARD: "بطاقة إلكترونية",
  CASH: "نقداً",
};
const methodLabel = (m?: string) => METHOD_LABEL[m ?? ""] ?? (m || "محفظة رقمية");

function buildReceiptNode(r: ReceiptLike): HTMLDivElement {
  const amount = Number(r.amount ?? 0);
  const currency = r.currency ?? "SAR";
  const rcpNo = r.receiptNumber ?? `RCP-${String(r.invoiceNumber ?? "DRAFT").replace(/^INV-?/, "")}`;
  const paidAt = r.paidAt ?? new Date().toISOString();
  const cashback = r.cashback != null ? Number(r.cashback) : null;
  const balanceAfter = r.balanceAfter != null ? Number(r.balanceAfter) : null;
  const verifyUrl = `https://ash-holding.sa/verify/receipt/${encodeURIComponent(rcpNo)}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=0&data=${encodeURIComponent(verifyUrl)}`;

  const metaRow = (label: string, value: string, mono = true) => `
    <div style="display:flex;align-items:baseline;gap:10px;margin-bottom:7px">
      <span style="font-size:13px;font-weight:800;color:${NAVY};white-space:nowrap">${label}</span>
      <span style="flex:1;border-bottom:2px dotted #d6d3d1;transform:translateY(-3px)"></span>
      <span style="font-size:12.5px;font-weight:700;color:${NAVY};${mono ? "font-family:ui-monospace,monospace;" : ""}" dir="ltr">${value}</span>
    </div>`;

  const infoRow = (l1: string, v1: string, l2: string, v2: string, mono2 = false) => `
    <div style="display:flex;align-items:stretch;gap:10px;margin-bottom:6px">
      <span style="font-size:12.5px;font-weight:900;color:${NAVY};display:flex;align-items:center;white-space:nowrap">${l1}</span>
      <span style="flex:1.3;background:${BOX};padding:7px 12px;font-size:12.5px;color:${INK};font-weight:600;text-align:center;display:flex;align-items:center;justify-content:center;line-height:1.6">${v1}</span>
      <span style="font-size:12.5px;font-weight:900;color:${NAVY};display:flex;align-items:center;white-space:nowrap">${l2}</span>
      <span style="flex:1;background:${BOX};padding:7px 12px;font-size:12.5px;color:${INK};font-weight:600;text-align:center;display:flex;align-items:center;justify-content:center;line-height:1.6;${mono2 ? "font-family:ui-monospace,monospace;" : ""}" ${mono2 ? 'dir="ltr"' : ""}>${v2}</span>
    </div>`;

  const wrapper = document.createElement("div");
  wrapper.style.cssText = `position:fixed;left:-10000px;top:0;width:794px;background:#fff;color:${INK};direction:rtl;box-sizing:border-box;font-family:'Cairo','IBM Plex Sans Arabic','Segoe UI',Tahoma,sans-serif`;
  wrapper.setAttribute("dir", "rtl");

  wrapper.innerHTML = `
    <!-- ═══ Official header: meta leaders (right) + identity (left) ═══ -->
    <div style="padding:19px 36px 12px;display:flex;justify-content:space-between;align-items:flex-start;gap:28px;border-bottom:2px solid ${NAVY}">
      <div style="flex:1;max-width:330px">
        ${metaRow("رقم الإيصال", rcpNo)}
        ${metaRow("التاريخ", fmtHijri(paidAt), false)}
        ${metaRow("الموافق", new Intl.DateTimeFormat("en-GB", { year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(paidAt)))}
        ${metaRow("رقم الفاتورة", r.invoiceNumber ?? "—")}
        ${r.requestRef ? metaRow("المرجع", r.requestRef) : ""}
        <div style="margin-bottom:0">
          <div style="display:flex;align-items:baseline;gap:10px">
            <span style="font-size:13px;font-weight:800;color:${NAVY};white-space:nowrap">حالة السداد</span>
            <span style="flex:1;border-bottom:2px dotted #d6d3d1;transform:translateY(-3px)"></span>
            <span style="display:inline-block;padding:3px 14px;border-radius:999px;font-weight:800;font-size:11px;background:${GREEN_BG};color:${GREEN};border:1px solid ${GREEN_BORDER}">مسدد بالكامل</span>
          </div>
        </div>
      </div>
      <div style="text-align:left" dir="ltr">
        <div style="display:flex;align-items:center;gap:10px">
          <div>
            <div style="font-size:16px;font-weight:900;letter-spacing:1px;color:${NAVY}">ASH HOLDING</div>
            <div style="font-size:11.5px;color:${MUTED};font-weight:700;margin-top:2px">شركة علي صالح الشهري القابضة</div>
            <div style="font-size:9.5px;color:${FAINT};margin-top:2px">الشركة السعودية للحلول الرقمية</div>
          </div>
          <div style="width:46px;height:46px;border-radius:10px;background:linear-gradient(135deg,${GOLD},${GOLD_SOFT});display:flex;align-items:center;justify-content:center;font-weight:900;font-size:20px;color:${NAVY}">ش</div>
        </div>
      </div>
    </div>

    <!-- ═══ Centered official title + paid seal ═══ -->
    <div style="position:relative;text-align:center;padding:14px 36px 12px">
      <div style="font-size:27px;font-weight:900;color:${NAVY};letter-spacing:.5px;line-height:1.35">إيصال سداد</div>
      <div style="font-size:10px;letter-spacing:3.5px;color:${FAINT};font-weight:700;margin-top:4px" dir="ltr">OFFICIAL PAYMENT RECEIPT</div>
      <!-- paid seal -->
      <div style="position:absolute;top:6px;inset-inline-start:44px;width:92px;height:92px;border-radius:50%;border:2.5px solid ${GREEN_BORDER};display:flex;flex-direction:column;align-items:center;justify-content:center;transform:rotate(-10deg);background:rgba(209,250,229,.35)">
        <div style="font-size:19px;font-weight:900;color:${GREEN};line-height:1">مدفوع</div>
        <div style="font-size:8.5px;font-weight:800;color:${GREEN};letter-spacing:1.5px;margin-top:4px" dir="ltr">PAID · 100%</div>
      </div>
    </div>

    <!-- ═══ Parties ═══ -->
    <div style="padding:0 36px">
      ${infoRow("استلمنا من", r.clientName ?? "العميل", "المنشأة", r.clientCompany ?? "—")}
      ${infoRow("تاريخ السداد", fmtGreg(paidAt), "وقت السداد", new Intl.DateTimeFormat("ar-SA-u-nu-latn", { hour: "2-digit", minute: "2-digit" }).format(new Date(paidAt)))}
      ${infoRow("المشروع", r.projectTitle ?? "خدمات مهنية", "رقم العملية", r.paymentId ? r.paymentId.slice(0, 8).toUpperCase() : rcpNo, true)}
    </div>

    <!-- ═══ Brand summary strip (navy header + gray values) ═══ -->
    <div style="padding:9px 36px 0">
      <div style="display:grid;grid-template-columns:1.25fr 1fr 1fr 1.15fr;background:${NAVY};border:1px solid ${NAVY}">
        <div style="padding:10px 8px;text-align:center;font-size:11.5px;font-weight:800;color:#f8fafc;border-inline-end:1px solid ${NAVY_SOFT}">المبلغ المسدد</div>
        <div style="padding:10px 8px;text-align:center;font-size:11.5px;font-weight:800;color:#f8fafc;border-inline-end:1px solid ${NAVY_SOFT}">طريقة الدفع</div>
        <div style="padding:10px 8px;text-align:center;font-size:11.5px;font-weight:800;color:#f8fafc;border-inline-end:1px solid ${NAVY_SOFT}">كاش باك (1.85%)</div>
        <div style="padding:10px 8px;text-align:center;font-size:11.5px;font-weight:800;color:#f8fafc">الرصيد بعد السداد</div>
      </div>
      <div style="display:grid;grid-template-columns:1.25fr 1fr 1fr 1.15fr;background:${BOX};border:1px solid ${LINE};border-top:0">
        <div style="padding:12px 8px;text-align:center;font-size:16px;font-weight:900;color:${GREEN};font-variant-numeric:tabular-nums;border-inline-end:1px solid ${LINE}" dir="ltr">${fmtSAR(amount)} ${currency}</div>
        <div style="padding:12px 8px;text-align:center;font-size:12.5px;font-weight:800;color:${INK};border-inline-end:1px solid ${LINE}">${methodLabel(r.method)}</div>
        <div style="padding:12px 8px;text-align:center;font-size:13px;font-weight:800;color:${GOLD};font-variant-numeric:tabular-nums;border-inline-end:1px solid ${LINE}" dir="ltr">${cashback != null && cashback > 0 ? `+${fmtSAR(cashback)} SAR` : "—"}</div>
        <div style="padding:12px 8px;text-align:center;font-size:13px;font-weight:700;color:${INK};font-variant-numeric:tabular-nums" dir="ltr">${balanceAfter != null ? `${fmtSAR(balanceAfter)} SAR` : "—"}</div>
      </div>
    </div>

    <!-- ═══ Official declaration ═══ -->
    <div style="padding:16px 70px 4px;text-align:center;font-size:11.5px;line-height:1.95;color:${INK}">
      تشهد <strong>شركة علي صالح الشهري القابضة</strong> بأنها استلمت من العميل الموضح أعلاه مبلغاً وقدره
      <strong style="color:${GREEN}" dir="ltr">${fmtSAR(amount)} ${currency}</strong>
      وذلك سداداً كاملاً للفاتورة رقم
      <strong dir="ltr" style="font-family:ui-monospace,monospace">${r.invoiceNumber ?? "—"}</strong>
      عبر ${methodLabel(r.method)}، وقد أُضيفت مكافأة الكاش باك إلى محفظة العميل تلقائياً.
      يُعد هذا الإيصال إثباتاً رسمياً للسداد دون الحاجة إلى توقيع أو ختم يدوي.
    </div>

    <!-- ═══ Verification (QR) + receipt details ═══ -->
    <div style="display:grid;grid-template-columns:120px 1fr 1.15fr;gap:16px;padding:14px 36px 2px;align-items:start">
      <div style="text-align:center">
        <div style="position:relative;width:106px;height:106px;margin:0 auto;border:1px solid ${LINE};background:#fff;display:flex;align-items:center;justify-content:center">
          <span data-fb style="display:flex;flex-direction:column;align-items:center;justify-content:center;width:100%;height:100%">
            <span style="font-size:9px;color:${FAINT};padding:8px;line-height:1.8">رمز التحقق<br><b dir="ltr" style="font-family:ui-monospace,monospace;font-size:8.5px">${rcpNo}</b></span>
          </span>
          <img src="${qrUrl}" crossorigin="anonymous" alt="QR" style="position:absolute;inset:0;width:100%;height:100%;padding:5px;background:#fff;box-sizing:border-box" onerror="this.remove()">
        </div>
        <div style="font-size:9px;color:${FAINT};margin-top:5px;letter-spacing:.5px">امسح للتحقق</div>
      </div>
      <div style="font-size:11px;color:${MUTED};line-height:1.9">
        <div style="font-weight:900;color:${NAVY};font-size:12.5px;margin-bottom:3px">التحقق من صحة الإيصال</div>
        تحقق من صحة وصلاحية الإيصال عبر مسح الرمز أو زيارة الموقع الإلكتروني
        <span dir="ltr" style="font-weight:800;color:${NAVY}">ash-holding.sa</span>
        واستخدام الرمز المعرف التالي:
        <div dir="ltr" style="font-family:ui-monospace,monospace;font-weight:800;color:${NAVY};font-size:12px;margin-top:4px">${rcpNo}</div>
      </div>
      <div style="border:1px solid ${LINE};padding:10px 16px;background:#fafaf9">
        <div style="font-weight:900;font-size:12.5px;color:${NAVY};margin-bottom:5px;border-inline-start:3px solid ${GOLD};padding-inline-start:9px">تفاصيل العملية</div>
        <div style="font-size:11px;color:${MUTED};line-height:1.9">
          <div><strong style="color:${NAVY}">الجهة المستلمة:</strong> شركة علي صالح الشهري القابضة</div>
          <div><strong style="color:${NAVY}">قناة السداد:</strong> ${methodLabel(r.method)} — بوابة العميل</div>
          <div><strong style="color:${NAVY}">الفاتورة المرتبطة:</strong> <span dir="ltr" style="font-family:ui-monospace,monospace">${r.invoiceNumber ?? "—"}</span></div>
          ${r.requestRef ? `<div><strong style="color:${NAVY}">مرجع الطلب:</strong> <span dir="ltr" style="font-family:ui-monospace,monospace">${r.requestRef}</span></div>` : ""}
          <div><strong style="color:${NAVY}">حالة الفاتورة:</strong> <span style="color:${GREEN};font-weight:800">مسددة بالكامل</span></div>
        </div>
      </div>
    </div>

    <!-- ═══ Legal disclaimer ═══ -->
    <div style="padding:12px 56px 12px;text-align:center;font-size:9.5px;color:${FAINT};line-height:1.8">
      يُعد هذا الإيصال من الوثائق الإلكترونية الرسمية الصادرة وفق نظام هيئة الزكاة والضريبة والجمارك، ويحظر تقليدها أو إدخال أي تعديلات عليها سواء بالإضافة أو الحذف أو
      التغيير في بياناتها، وتُعد لاغية إذا شابها شيء من ذلك. لا يجوز تداول الإيصال إلا في الأغراض التي أُصدر لأجلها.
    </div>

    <!-- ═══ Formal footer ═══ -->
    <div style="border-top:2px solid ${GOLD};background:${NAVY};color:#cbd5e1">
      <div style="display:flex;justify-content:space-between;align-items:center;padding:11px 36px;gap:18px;flex-wrap:wrap">
        <div style="font-size:10.5px;line-height:1.8">
          <div style="font-weight:800;color:#f8fafc;font-size:11px">المملكة العربية السعودية، الرياض</div>
          <div style="color:#94a3b8" dir="ltr">Kingdom of Saudi Arabia, Riyadh</div>
        </div>
        <div style="font-size:10.5px;line-height:1.8;text-align:center">
          <div>الرقم الضريبي: <b dir="ltr" style="color:#f8fafc">300000000000003</b> · سجل تجاري: <b dir="ltr" style="color:#f8fafc">1010000000</b></div>
          <div dir="ltr">billing@ash-holding.sa</div>
        </div>
        <div style="font-size:10.5px;line-height:1.8;text-align:left" dir="ltr">
          <div>+966 11 000 0000</div>
          <div style="font-weight:800;color:${GOLD_SOFT}">ash-holding.sa</div>
        </div>
      </div>
      <div style="height:4px;background:linear-gradient(90deg,${GOLD} 0%,${GOLD_SOFT} 50%,${GOLD} 100%)"></div>
    </div>
  `;
  return wrapper;
}

export async function downloadReceiptPDF(receipt: ReceiptLike): Promise<void> {
  const iframe = document.createElement("iframe");
  iframe.style.cssText = "position:fixed;left:-10000px;top:0;width:820px;height:1200px;border:0;visibility:hidden";
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
    const node = buildReceiptNode(receipt);
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
    let imgW = pageW;
    let imgH = (canvas.height * imgW) / canvas.width;
    let offsetX = 0;
    // Fit-to-one-page: slight overflows (≤12%) shrink proportionally instead of spilling
    if (imgH > pageH && imgH <= pageH * 1.12) {
      const s = pageH / imgH;
      imgH = pageH;
      imgW = +(imgW * s).toFixed(2);
      offsetX = +((pageW - imgW) / 2).toFixed(2);
    }
    let heightLeft = imgH;
    let position = 0;
    pdf.addImage(imgData, "JPEG", offsetX, position, imgW, imgH, undefined, "FAST");
    heightLeft -= pageH;
    while (heightLeft > 0) {
      position = heightLeft - imgH;
      pdf.addPage();
      pdf.addImage(imgData, "JPEG", offsetX, position, imgW, imgH, undefined, "FAST");
      heightLeft -= pageH;
    }
    pdf.save(`${receipt.receiptNumber ?? "receipt"}.pdf`);
  } finally {
    iframe.remove();
  }
}
