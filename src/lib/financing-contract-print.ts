// PDF: Arabic financing contract with amortization schedule (Phase 4)
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

type Row = { n: number; dueDate: string; principal: number; interest: number; total: number; balance: number };
type ContractLike = {
  code: string;
  status: string;
  amount: number | string;
  downPayment: number | string;
  financedAmount: number | string;
  termMonths: number;
  ratePct: number | string;
  installmentAmount: number | string;
  totalInterest: number | string;
  totalFees: number | string;
  totalPayable: number | string;
  aprPct: number | string;
  firstDueDate?: string | null;
  lastDueDate?: string | null;
  clientSignedAt?: string | null;
  clientSignatureName?: string | null;
  clientSignatureHash?: string | null;
  activatedAt?: string | null;
  installments?: Array<Row & { balanceAfter?: number | string }>;
  application?: { code?: string; fullNameAr?: string | null; nationalId?: string | null; businessName?: string | null };
  product?: { nameAr?: string; code?: string };
};

const money = (v: unknown) =>
  Number(v ?? 0).toLocaleString("ar-SA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const dateAr = (v?: string | null) =>
  v ? new Date(v).toLocaleDateString("ar-SA-u-nu-latn", { year: "numeric", month: "long", day: "numeric" }) : "—";

export async function downloadFinancingContractPDF(c: ContractLike) {
  const holder = document.createElement("div");
  holder.style.cssText =
    "position:fixed;left:-9999px;top:0;width:794px;background:#fff;color:#0b1220;font-family:'Tajawal','Cairo',Arial,sans-serif;direction:rtl;padding:40px;";

  const rows = (c.installments || []).map((r) => `
    <tr>
      <td>${r.n}</td>
      <td>${dateAr(r.dueDate)}</td>
      <td>${money(r.principal)}</td>
      <td>${money(r.interest)}</td>
      <td>${money(r.total)}</td>
      <td>${money((r as { balanceAfter?: number | string }).balanceAfter ?? r.balance)}</td>
    </tr>
  `).join("");

  const partyName = c.application?.businessName || c.application?.fullNameAr || "—";
  const partyId = c.application?.nationalId || "—";

  holder.innerHTML = `
    <div style="border:2px solid #d4af37;border-radius:14px;padding:28px;">
      <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #d4af37;padding-bottom:14px;margin-bottom:20px;">
        <div>
          <div style="font-size:22px;font-weight:800;color:#0b1220;">عقد تمويل خدمات</div>
          <div style="font-size:12px;color:#475569;">شركة علي صالح الشهري القابضة — ASH HOLDING</div>
        </div>
        <div style="text-align:left;">
          <div style="font-size:14px;font-weight:700;">${c.code}</div>
          <div style="font-size:11px;color:#64748b;">حالة العقد: ${c.status}</div>
        </div>
      </div>

      <table style="width:100%;font-size:12px;margin-bottom:14px;border-collapse:collapse;">
        <tr><td style="padding:6px;background:#f8fafc;font-weight:700;width:30%;">الطرف الأول (الممول)</td>
            <td style="padding:6px;">شركة علي صالح الشهري القابضة — ASH HOLDING</td></tr>
        <tr><td style="padding:6px;background:#f8fafc;font-weight:700;">الطرف الثاني (المستفيد)</td>
            <td style="padding:6px;">${partyName} — رقم الهوية/السجل: ${partyId}</td></tr>
        <tr><td style="padding:6px;background:#f8fafc;font-weight:700;">المنتج التمويلي</td>
            <td style="padding:6px;">${c.product?.nameAr || "—"} (${c.product?.code || ""})</td></tr>
        <tr><td style="padding:6px;background:#f8fafc;font-weight:700;">رقم الطلب</td>
            <td style="padding:6px;">${c.application?.code || "—"}</td></tr>
      </table>

      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:18px;">
        ${[
          ["إجمالي التمويل", money(c.amount) + " ر.س"],
          ["الدفعة المقدمة", money(c.downPayment) + " ر.س"],
          ["المبلغ الممول", money(c.financedAmount) + " ر.س"],
          ["مدة السداد", c.termMonths + " شهراً"],
          ["نسبة الربح السنوي", Number(c.ratePct).toFixed(2) + "%"],
          ["القسط الشهري", money(c.installmentAmount) + " ر.س"],
          ["إجمالي الأرباح", money(c.totalInterest) + " ر.س"],
          ["إجمالي المستحق", money(c.totalPayable) + " ر.س"],
        ].map(([k, v]) => `
          <div style="border:1px solid #e2e8f0;border-radius:8px;padding:8px;text-align:center;">
            <div style="font-size:10px;color:#64748b;">${k}</div>
            <div style="font-size:12px;font-weight:800;margin-top:2px;">${v}</div>
          </div>
        `).join("")}
      </div>

      <div style="font-size:12px;font-weight:800;margin:14px 0 6px;color:#0b1220;">جدول الأقساط (Amortization Schedule)</div>
      <table style="width:100%;border-collapse:collapse;font-size:10px;">
        <thead>
          <tr style="background:#0b1220;color:#fff;">
            <th style="padding:6px;">#</th>
            <th style="padding:6px;">تاريخ الاستحقاق</th>
            <th style="padding:6px;">الأصل</th>
            <th style="padding:6px;">الربح</th>
            <th style="padding:6px;">القسط</th>
            <th style="padding:6px;">الرصيد المتبقي</th>
          </tr>
        </thead>
        <tbody style="text-align:center;">
          ${rows || `<tr><td colspan="6" style="padding:12px;">لا يوجد جدول أقساط</td></tr>`}
        </tbody>
      </table>

      <div style="margin-top:18px;padding:12px;background:#fef7e0;border:1px dashed #d4af37;border-radius:8px;font-size:11px;line-height:1.9;">
        <b>الأحكام والشروط:</b><br/>
        1. يلتزم الطرف الثاني بسداد الأقساط في مواعيدها المحددة أعلاه.<br/>
        2. الرصيد المصروف عبارة عن رصيد خدمات داخلي غير قابل للسحب النقدي، ويُستخدم لسداد خدمات ASH HOLDING فقط.<br/>
        3. يحق للطرف الأول تعليق الرصيد المتبقي عند التأخر عن السداد أكثر من (30) يوماً.<br/>
        4. يخضع هذا العقد لأنظمة المملكة العربية السعودية.<br/>
      </div>

      <div style="margin-top:20px;display:grid;grid-template-columns:1fr 1fr;gap:16px;font-size:11px;">
        <div style="padding:12px;border:1px solid #e2e8f0;border-radius:8px;">
          <div style="font-weight:700;margin-bottom:6px;">توقيع الطرف الثاني</div>
          <div>الاسم: ${c.clientSignatureName || "—"}</div>
          <div>التاريخ: ${dateAr(c.clientSignedAt)}</div>
          <div style="direction:ltr;font-family:monospace;font-size:9px;color:#64748b;margin-top:4px;word-break:break-all;">${c.clientSignatureHash || "—"}</div>
        </div>
        <div style="padding:12px;border:1px solid #e2e8f0;border-radius:8px;">
          <div style="font-weight:700;margin-bottom:6px;">اعتماد الطرف الأول</div>
          <div>ASH HOLDING — إدارة التمويل</div>
          <div>تاريخ التفعيل: ${dateAr(c.activatedAt)}</div>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(holder);
  try {
    const canvas = await html2canvas(holder, { scale: 2, useCORS: true, backgroundColor: "#ffffff" });
    const pdf = new jsPDF({ unit: "pt", format: "a4", orientation: "portrait" });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const imgW = pageW;
    const imgH = (canvas.height * imgW) / canvas.width;

    let position = 0;
    let remaining = imgH;
    pdf.addImage(canvas.toDataURL("image/jpeg", 0.95), "JPEG", 0, position, imgW, imgH);
    remaining -= pageH;
    while (remaining > 0) {
      pdf.addPage();
      position -= pageH;
      pdf.addImage(canvas.toDataURL("image/jpeg", 0.95), "JPEG", 0, position, imgW, imgH);
      remaining -= pageH;
    }
    pdf.save(`${c.code}.pdf`);
  } finally {
    document.body.removeChild(holder);
  }
}
