// Premium government-style Arabic contract PDF — RTL, Cairo font, digital signature block.
// Mirrors the invoice-print pipeline: build isolated iframe, snapshot with html2canvas, embed in jsPDF A4.

import html2canvas from "html2canvas";
import jsPDF from "jspdf";

type ContractLike = {
  contractNumber?: string;
  title?: string;
  status?: string;
  value?: string | number | null;
  currency?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  signedAt?: string | null;
  notes?: string | null;
  createdAt?: string | null;
  client?: {
    user?: { name?: string; email?: string; phone?: string } | null;
    company?: string | null;
    vatNumber?: string | null;
    address?: string | null;
  } | null;
  project?: { title?: string } | null;
};

type LinkedRequestLike = {
  proposalScope?: string | null;
  proposalDuration?: number | null;
  signedAt?: string | null;
  signatureHash?: string | null;
  signatureIp?: string | null;
  signatureUserAgent?: string | null;
} | null;

type PaidInvoiceLike = {
  invoiceNumber?: string | null;
  status?: string | null;
  paidAt?: string | null;
  total?: string | number | null;
} | null;

const fmtSAR = (n: number | string | null | undefined) =>
  new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n ?? 0));

const fmtDate = (d?: string | null) => {
  if (!d) return "—";
  try {
    return new Intl.DateTimeFormat("ar-SA-u-ca-gregory-nu-latn", { year: "numeric", month: "long", day: "numeric" }).format(new Date(d));
  } catch { return "—"; }
};
const fmtDateTime = (d?: string | null) => {
  if (!d) return "—";
  try {
    return new Intl.DateTimeFormat("ar-SA-u-ca-gregory-nu-latn", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(d));
  } catch { return "—"; }
};

// Arabic number-to-words for currency (simplified for common ranges up to millions)
function numberToArabicWords(num: number): string {
  if (!num || isNaN(num)) return "صفر";
  const ones = ["","واحد","اثنان","ثلاثة","أربعة","خمسة","ستة","سبعة","ثمانية","تسعة","عشرة","أحد عشر","اثنا عشر","ثلاثة عشر","أربعة عشر","خمسة عشر","ستة عشر","سبعة عشر","ثمانية عشر","تسعة عشر"];
  const tens = ["","","عشرون","ثلاثون","أربعون","خمسون","ستون","سبعون","ثمانون","تسعون"];
  const hundreds = ["","مائة","مائتان","ثلاثمائة","أربعمائة","خمسمائة","ستمائة","سبعمائة","ثمانمائة","تسعمائة"];
  const under1000 = (n: number): string => {
    if (n === 0) return "";
    if (n < 20) return ones[n];
    if (n < 100) { const t = Math.floor(n/10), r = n%10; return r ? `${ones[r]} و${tens[t]}` : tens[t]; }
    const h = Math.floor(n/100), r = n%100;
    return r ? `${hundreds[h]} و${under1000(r)}` : hundreds[h];
  };
  const n = Math.floor(num);
  if (n < 1000) return under1000(n) || "صفر";
  if (n < 1000000) {
    const th = Math.floor(n/1000), r = n%1000;
    const thPart = th === 1 ? "ألف" : th === 2 ? "ألفان" : th < 11 ? `${under1000(th)} آلاف` : `${under1000(th)} ألف`;
    return r ? `${thPart} و${under1000(r)}` : thPart;
  }
  const m = Math.floor(n/1000000), rest = n%1000000;
  const mPart = m === 1 ? "مليون" : m === 2 ? "مليونان" : m < 11 ? `${under1000(m)} ملايين` : `${under1000(m)} مليون`;
  return rest ? `${mPart} و${numberToArabicWords(rest)}` : mPart;
}

function buildContractNode(c: ContractLike, req: LinkedRequestLike, inv: PaidInvoiceLike): HTMLDivElement {
  const value = Number(c.value ?? 0);
  const words = numberToArabicWords(value);
  const clientName = c.client?.user?.name ?? "—";
  const clientEmail = c.client?.user?.email ?? "—";
  const clientPhone = c.client?.user?.phone ?? "—";
  const projectTitle = c.project?.title ?? c.title ?? "—";
  const startDate = fmtDate(c.startDate);
  const endDate = fmtDate(c.endDate);
  const duration = req?.proposalDuration ?? "—";
  const scope = req?.proposalScope ?? c.notes ?? "تنفيذ نطاق العمل المُتَّفق عليه بين الطرفين وفق مواصفات الطلب الرسمي المُوقَّع رقمياً.";
  const signedAt = fmtDateTime(c.signedAt ?? req?.signedAt);
  const sigHash = req?.signatureHash ?? "—";
  const sigIp = req?.signatureIp ?? "—";
  const ctrNo = c.contractNumber ?? "CTR-DRAFT";
  const invNo = inv?.invoiceNumber ?? "—";
  const paidAt = fmtDateTime(inv?.paidAt);

  const article = (num: string, title: string, body: string) => `
    <div style="margin:14px 0;padding:14px 16px;border:1px solid #e2e8f0;border-radius:10px;background:#fff;page-break-inside:avoid">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;padding-bottom:8px;border-bottom:1px dashed #cbd5e1">
        <span style="display:inline-flex;align-items:center;justify-content:center;min-width:34px;height:26px;padding:0 10px;background:linear-gradient(135deg,#00E5FF,#7C3AED);color:#fff;font-weight:800;font-size:11.5px;border-radius:6px">${num}</span>
        <div style="font-weight:800;font-size:13.5px;color:#0f172a">${title}</div>
      </div>
      <div style="font-size:12.5px;color:#334155;line-height:2;text-align:justify">${body}</div>
    </div>`;

  const wrapper = document.createElement("div");
  wrapper.style.cssText = "position:fixed;left:-10000px;top:0;width:794px;background:#fff;color:#0f172a;direction:rtl;border:1px solid #cbd5e1;box-sizing:border-box";
  wrapper.setAttribute("dir", "rtl");
  wrapper.innerHTML = `
    <!-- Official Header with seal -->
    <div style="position:relative;background:linear-gradient(135deg,#0f172a 0%,#1e1b4b 55%,#312e81 100%);color:#fff;padding:26px 32px;border-bottom:4px solid #7C3AED;overflow:hidden">
      <div style="position:absolute;left:-40px;top:-40px;width:180px;height:180px;border-radius:50%;background:radial-gradient(circle,rgba(124,58,237,.35),transparent 70%)"></div>
      <div style="position:relative;display:flex;justify-content:space-between;align-items:center;gap:24px">
        <div style="display:flex;align-items:center;gap:14px">
          <div style="width:58px;height:58px;border-radius:14px;background:linear-gradient(135deg,#00E5FF,#7C3AED);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:22px;color:#fff;border:2px solid rgba(255,255,255,.25);box-shadow:0 6px 18px rgba(124,58,237,.4)">ش</div>
          <div>
            <div style="font-size:19px;font-weight:800;letter-spacing:.3px">ASH HOLDING</div>
            <div style="font-size:12px;color:#c7d2fe;margin-top:3px">الشركة السعودية للحلول الرقمية</div>
            <div style="font-size:11px;color:#a5b4fc;margin-top:2px">سجل تجاري: 1010000000 · الرقم الضريبي: 300000000000003</div>
          </div>
        </div>
        <div style="text-align:left;direction:ltr;border-right:1px solid rgba(255,255,255,.15);padding-right:24px">
          <div style="font-size:11px;color:#a5b4fc;font-weight:700;letter-spacing:.5px">OFFICIAL CONTRACT / عقد رسمي</div>
          <div style="margin:6px 0 10px;font-weight:800;font-size:22px;font-family:ui-monospace,monospace">${ctrNo}</div>
          <span style="display:inline-block;padding:6px 14px;border-radius:999px;font-weight:700;font-size:11.5px;background:#d1fae5;color:#065f46;border:1px solid #10b981">مُوقَّع رقمياً</span>
        </div>
      </div>
    </div>

    <!-- Title band -->
    <div style="text-align:center;padding:24px 32px 18px;background:linear-gradient(180deg,#f8fafc,#fff);border-bottom:1px solid #e2e8f0">
      <div style="font-size:12px;color:#7C3AED;font-weight:700;letter-spacing:2px;margin-bottom:6px">﷽</div>
      <div style="font-size:22px;font-weight:800;color:#0f172a;letter-spacing:.5px">عقد تقديم خدمات مهنية</div>
      <div style="font-size:13px;color:#64748b;margin-top:6px">${c.title ?? "—"}</div>
      <div style="font-size:11.5px;color:#94a3b8;margin-top:8px">مُبرم في مدينة الرياض — المملكة العربية السعودية بتاريخ ${startDate}</div>
    </div>

    <!-- Parties Block -->
    <div style="padding:18px 24px 6px">
      <div style="font-size:13px;font-weight:800;color:#0f172a;margin-bottom:10px;padding-right:8px;border-right:3px solid #7C3AED">أطراف العقد</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div style="border:1px solid #e2e8f0;border-radius:10px;padding:14px 16px;background:#fafbff">
          <div style="font-size:10.5px;color:#6366f1;font-weight:800;margin-bottom:6px">الطرف الأول / مُقدِّم الخدمة</div>
          <div style="font-size:14px;font-weight:800;color:#0f172a;margin-bottom:4px">ASH HOLDING</div>
          <div style="font-size:11.5px;color:#475569;line-height:1.9">الرياض، المملكة العربية السعودية</div>
          <div style="font-size:11.5px;color:#475569;line-height:1.9">الرقم الضريبي: 300000000000003</div>
          <div style="font-size:11.5px;color:#475569;line-height:1.9">السجل التجاري: 1010000000</div>
          <div style="font-size:11.5px;color:#475569;line-height:1.9">info@ash-holding.sa</div>
        </div>
        <div style="border:1px solid #e2e8f0;border-radius:10px;padding:14px 16px;background:#fafbff">
          <div style="font-size:10.5px;color:#6366f1;font-weight:800;margin-bottom:6px">الطرف الثاني / العميل</div>
          <div style="font-size:14px;font-weight:800;color:#0f172a;margin-bottom:4px">${clientName}</div>
          ${c.client?.company ? `<div style="font-size:11.5px;color:#475569;line-height:1.9">${c.client.company}</div>` : ""}
          ${c.client?.address ? `<div style="font-size:11.5px;color:#475569;line-height:1.9">${c.client.address}</div>` : ""}
          <div style="font-size:11.5px;color:#475569;line-height:1.9">${clientEmail}</div>
          <div style="font-size:11.5px;color:#475569;line-height:1.9" dir="ltr">${clientPhone}</div>
        </div>
      </div>
    </div>

    <!-- Preamble -->
    <div style="margin:14px 24px;padding:14px 16px;border-right:4px solid #7C3AED;background:#faf5ff;border-radius:8px">
      <div style="font-size:12px;color:#334155;line-height:2;text-align:justify">
        <strong style="color:#0f172a">تمهيد:</strong> لمّا كان الطرف الأول شركةً متخصصةً في تقديم الحلول والخدمات الرقمية، وحيث رغِب الطرف الثاني في التعاقد معه لتنفيذ نطاق العمل الموصوف أدناه، وبعد أن أقرَّ الطرفان بأهليتهما القانونية للتعاقد، فقد اتَّفقا — وهما بكامل رِضاهما — على ما يلي:
      </div>
    </div>

    <!-- Articles -->
    <div style="padding:0 24px 12px">
      ${article("المادة الأولى", "موضوع العقد ونطاق العمل", scope)}
      ${article("المادة الثانية", "المقابل المالي",
        `تُقدَّر القيمة الإجمالية للعقد بمبلغ <strong style="color:#7C3AED">${fmtSAR(value)} ريال سعودي</strong> (فقط <strong>${words} ريال سعودي</strong> لا غير)، شاملةً ضريبة القيمة المضافة، ويُسدَّد وفق الشروط المُبيَّنة في الفاتورة رقم <strong dir="ltr">${invNo}</strong>.`)}
      ${article("المادة الثالثة", "المدة الزمنية",
        `تبدأ مدة تنفيذ العقد اعتباراً من <strong>${startDate}</strong> وتنتهي في <strong>${endDate}</strong>، بمدة إجمالية قدرها <strong>${duration} يوماً</strong>، مع جواز تمديدها باتفاق كتابي مُتبادَل.`)}
      ${article("المادة الرابعة", "التزامات الطرف الأول",
        `يلتزم الطرف الأول بتنفيذ نطاق العمل باحترافيةٍ عاليةٍ ووفق أفضل الممارسات المهنية، وتسليم المُخرجات في المواعيد المُتَّفق عليها، وتقديم دعمٍ فنيٍّ مُتوافقٍ مع خطة المشروع، والحفاظ على سرية معلومات الطرف الثاني.`)}
      ${article("المادة الخامسة", "التزامات الطرف الثاني",
        `يلتزم الطرف الثاني بتقديم كافة المعلومات والموافقات اللازمة في مواعيدها، وسداد المستحقات المالية المُتَّفق عليها في آجالها، وعدم تكليف طرفٍ ثالثٍ بتنفيذ عملٍ يتعارض مع هذا العقد إلا بموافقةٍ كتابية.`)}
      ${article("المادة السادسة", "الملكية الفكرية والسرية",
        `تؤول ملكية جميع المُخرجات النهائية للطرف الثاني فور سداده كامل المستحقات المالية. ويتعهد الطرفان بالحفاظ على سرية كل ما يصل إلى علمهما بمناسبة هذا العقد ولمدة (٥) سنوات من تاريخ انتهائه.`)}
      ${article("المادة السابعة", "الفسخ وتسوية النزاعات",
        `يحق لأيٍّ من الطرفين فسخ العقد بإشعارٍ كتابيٍّ مسبق مدته (١٥) يوماً في حال إخلال الطرف الآخر بأيٍّ من التزاماته. وفي حال نشوء أيّ خلاف يتعذر حلُّه ودياً، تختص المحاكم السعودية بمدينة الرياض بالفصل فيه وفق أنظمة المملكة العربية السعودية.`)}
      ${article("المادة الثامنة", "التوقيع والنفاذ",
        `حُرِّر هذا العقد إلكترونياً ووُقِّع رقمياً بواسطة رمز تحقق (OTP) أُرسل إلى الرقم المُسجَّل للطرف الثاني، ويُعدّ التوقيع الرقمي المُبيَّنة بصمته أدناه مُنتِجاً لأثاره القانونية وفق نظام التعاملات الإلكترونية السعودي. ويسري العقد اعتباراً من تاريخ توقيعه.`)}
    </div>

    <!-- Digital Signature Block -->
    <div style="margin:8px 24px 20px;border:2px solid #7C3AED;border-radius:12px;overflow:hidden;background:linear-gradient(135deg,#faf5ff,#f0f9ff)">
      <div style="padding:12px 16px;background:linear-gradient(135deg,#7C3AED,#00E5FF);color:#fff;display:flex;justify-content:space-between;align-items:center">
        <div style="font-weight:800;font-size:13px">🔐 التوقيع الرقمي المُعتمد</div>
        <div style="font-size:11px;font-weight:600;opacity:.9">Digital Signature Certificate</div>
      </div>
      <div style="padding:14px 16px;display:grid;grid-template-columns:1fr 1fr;gap:12px;font-size:11.5px;color:#334155">
        <div><div style="color:#64748b;font-size:10.5px;font-weight:700;margin-bottom:3px">المُوقِّع</div><div style="color:#0f172a;font-weight:700">${clientName}</div></div>
        <div><div style="color:#64748b;font-size:10.5px;font-weight:700;margin-bottom:3px">تاريخ التوقيع</div><div style="color:#0f172a;font-weight:700">${signedAt}</div></div>
        <div><div style="color:#64748b;font-size:10.5px;font-weight:700;margin-bottom:3px">رقم الفاتورة</div><div style="color:#0f172a;font-weight:700;font-family:ui-monospace,monospace" dir="ltr">${invNo}</div></div>
        <div><div style="color:#64748b;font-size:10.5px;font-weight:700;margin-bottom:3px">تاريخ السداد</div><div style="color:#0f172a;font-weight:700">${paidAt}</div></div>
        <div style="grid-column:1/-1"><div style="color:#64748b;font-size:10.5px;font-weight:700;margin-bottom:3px">بصمة التوقيع (SHA-256)</div><div style="color:#0f172a;font-family:ui-monospace,monospace;font-size:10.5px;word-break:break-all;background:#fff;padding:6px 8px;border:1px solid #e2e8f0;border-radius:6px" dir="ltr">${sigHash}</div></div>
        <div><div style="color:#64748b;font-size:10.5px;font-weight:700;margin-bottom:3px">عنوان IP</div><div style="color:#0f172a;font-family:ui-monospace,monospace" dir="ltr">${sigIp}</div></div>
        <div><div style="color:#64748b;font-size:10.5px;font-weight:700;margin-bottom:3px">وسيلة التحقق</div><div style="color:#0f172a;font-weight:700">رمز OTP عبر واتساب</div></div>
      </div>
      <div style="padding:10px 16px;background:#fff;border-top:1px dashed #cbd5e1;text-align:center;font-size:10.5px;color:#64748b">
        ✔ هذا العقد مُوثَّق إلكترونياً وفق نظام التعاملات الإلكترونية الصادر بالمرسوم الملكي رقم م/١٨ وتاريخ ٨/٣/١٤٢٨هـ.
      </div>
    </div>

    <!-- Signature slots -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;padding:0 24px 20px">
      <div style="border:1px solid #cbd5e1;border-radius:10px;padding:14px 16px;background:#fff">
        <div style="font-size:10.5px;color:#64748b;font-weight:700;margin-bottom:6px">الطرف الأول</div>
        <div style="font-size:12.5px;font-weight:800;color:#0f172a">ASH HOLDING</div>
        <div style="margin-top:24px;padding-top:8px;border-top:1px dashed #94a3b8;text-align:center;font-size:10.5px;color:#64748b">التوقيع والختم الرسمي</div>
      </div>
      <div style="border:2px solid #10b981;border-radius:10px;padding:14px 16px;background:#f0fdf4">
        <div style="font-size:10.5px;color:#065f46;font-weight:700;margin-bottom:6px">الطرف الثاني</div>
        <div style="font-size:12.5px;font-weight:800;color:#0f172a">${clientName}</div>
        <div style="margin-top:14px;text-align:center">
          <div style="display:inline-block;padding:6px 14px;background:#10b981;color:#fff;border-radius:6px;font-weight:800;font-size:11.5px">✓ مُوقَّع رقمياً</div>
          <div style="font-size:10px;color:#065f46;margin-top:6px">${signedAt}</div>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div style="border-top:2px solid #0f172a;background:#f8fafc">
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;padding:14px 24px;gap:16px">
        <div>
          <div style="font-size:10.5px;color:#64748b;font-weight:700;margin-bottom:4px">الشركة</div>
          <div style="font-size:11.5px;color:#0f172a;line-height:1.8;font-weight:600">ASH HOLDING</div>
          <div style="font-size:11px;color:#64748b;line-height:1.8">الرياض، المملكة العربية السعودية</div>
        </div>
        <div>
          <div style="font-size:10.5px;color:#64748b;font-weight:700;margin-bottom:4px">التواصل</div>
          <div style="font-size:11px;color:#0f172a;line-height:1.8">info@ash-holding.sa</div>
          <div style="font-size:11px;color:#0f172a;line-height:1.8" dir="ltr">+966 11 000 0000</div>
        </div>
        <div>
          <div style="font-size:10.5px;color:#64748b;font-weight:700;margin-bottom:4px">مرجع العقد</div>
          <div style="font-size:11px;color:#0f172a;line-height:1.8;font-family:ui-monospace,monospace" dir="ltr">${ctrNo}</div>
          <div style="font-size:11px;color:#64748b;line-height:1.8">${startDate}</div>
        </div>
      </div>
      <div style="padding:10px 24px;text-align:center;font-size:10.5px;background:#0f172a;color:#cbd5e1">
        هذا العقد مُحرَّر إلكترونياً ومُعتمَد بالتوقيع الرقمي — لا يحتاج إلى ختمٍ ورقي وفق نظام التعاملات الإلكترونية السعودي.
      </div>
    </div>
  `;
  return wrapper;
}

export async function downloadContractPDF(
  c: ContractLike,
  linkedRequest: LinkedRequestLike = null,
  paidInvoice: PaidInvoiceLike = null,
): Promise<void> {
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
    const node = buildContractNode(c, linkedRequest, paidInvoice);
    node.style.position = "static";
    node.style.left = "0";
    doc.body.appendChild(node);

    try {
      await (doc as { fonts?: { ready?: Promise<unknown>; load?: (f: string) => Promise<unknown> } }).fonts?.ready;
      await Promise.all([
        (doc as { fonts?: { load?: (f: string) => Promise<unknown> } }).fonts?.load?.('400 14px "Cairo"'),
        (doc as { fonts?: { load?: (f: string) => Promise<unknown> } }).fonts?.load?.('700 18px "Cairo"'),
        (doc as { fonts?: { load?: (f: string) => Promise<unknown> } }).fonts?.load?.('800 22px "Cairo"'),
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
    pdf.save(`${c.contractNumber ?? "contract"}.pdf`);
  } finally {
    iframe.remove();
  }
}
