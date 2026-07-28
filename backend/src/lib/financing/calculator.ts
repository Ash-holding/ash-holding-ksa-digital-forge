// Server-side financing quote calculator.
// All money math happens here. NEVER perform financing math on the client.
// Results returned by this module are ESTIMATES (تقديرية) — not offers.

export type QuoteInput = {
  amount: number;             // requested financing amount (SAR)
  downPayment: number;        // down payment paid up-front (SAR)
  termMonths: number;         // months (installments)
  rateBasis: "FLAT_ANNUAL" | "REDUCING_ANNUAL" | "FIXED_TOTAL";
  ratePct: number;            // annual %
  adminFeePct: number;        // % of financed amount
  adminFeeFlat: number;       // flat SAR
  vatOnFees: boolean;         // 15% VAT on admin fees
  firstInstallmentAt?: Date;
};

export type ScheduleRow = {
  n: number;
  dueDate: string;         // YYYY-MM-DD
  principal: number;
  interest: number;
  fees: number;
  vat: number;
  total: number;
  balance: number;
};

export type Quote = {
  amount: number;
  downPayment: number;
  financedAmount: number;
  termMonths: number;
  installment: number;
  totalInterest: number;
  totalFees: number;
  totalVat: number;
  totalPayable: number;
  aprPct: number;
  firstDueDate: string;
  lastDueDate: string;
  schedule: ScheduleRow[];
  disclaimerAr: string;
};

function r2(n: number): number {
  return Math.round(n * 100) / 100;
}
function addMonths(d: Date, m: number): Date {
  const x = new Date(d);
  const day = x.getDate();
  x.setMonth(x.getMonth() + m);
  if (x.getDate() < day) x.setDate(0); // clamp end-of-month
  return x;
}
function fmt(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function computeQuote(input: QuoteInput): Quote {
  const amount = Math.max(0, +input.amount);
  const downPayment = Math.max(0, +input.downPayment);
  const financedAmount = Math.max(0, amount - downPayment);
  const term = Math.max(1, Math.floor(input.termMonths));
  const annual = Math.max(0, +input.ratePct) / 100;
  const monthlyRate = annual / 12;

  const feePct = Math.max(0, +input.adminFeePct) / 100;
  const feeFlat = Math.max(0, +input.adminFeeFlat);
  const feesBase = r2(financedAmount * feePct + feeFlat);
  const vat = input.vatOnFees ? r2(feesBase * 0.15) : 0;
  const totalFees = r2(feesBase + vat);

  let installment = 0;
  let totalInterest = 0;
  const schedule: ScheduleRow[] = [];
  const first = input.firstInstallmentAt ? new Date(input.firstInstallmentAt) : addMonths(new Date(), 1);

  if (input.rateBasis === "REDUCING_ANNUAL" && monthlyRate > 0) {
    // Amortising installment
    installment = r2(
      (financedAmount * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -term)),
    );
    let balance = financedAmount;
    for (let i = 1; i <= term; i++) {
      const interest = r2(balance * monthlyRate);
      let principal = r2(installment - interest);
      if (i === term) principal = r2(balance); // absorb rounding
      const total = r2(principal + interest);
      balance = r2(balance - principal);
      totalInterest = r2(totalInterest + interest);
      const dueDate = fmt(addMonths(first, i - 1));
      schedule.push({ n: i, dueDate, principal, interest, fees: 0, vat: 0, total, balance });
    }
  } else if (input.rateBasis === "FLAT_ANNUAL") {
    totalInterest = r2(financedAmount * annual * (term / 12));
    installment = r2((financedAmount + totalInterest) / term);
    let balance = financedAmount;
    const perPrincipal = r2(financedAmount / term);
    const perInterest = r2(totalInterest / term);
    for (let i = 1; i <= term; i++) {
      let principal = perPrincipal;
      let interest = perInterest;
      if (i === term) {
        principal = r2(balance);
        interest = r2(totalInterest - perInterest * (term - 1));
      }
      balance = r2(balance - principal);
      const dueDate = fmt(addMonths(first, i - 1));
      schedule.push({
        n: i, dueDate, principal, interest, fees: 0, vat: 0,
        total: r2(principal + interest), balance,
      });
    }
  } else {
    // FIXED_TOTAL or zero-rate
    installment = r2(financedAmount / term);
    let balance = financedAmount;
    for (let i = 1; i <= term; i++) {
      let principal = installment;
      if (i === term) principal = r2(balance);
      balance = r2(balance - principal);
      const dueDate = fmt(addMonths(first, i - 1));
      schedule.push({ n: i, dueDate, principal, interest: 0, fees: 0, vat: 0, total: principal, balance });
    }
  }

  const totalPayable = r2(installment * term + totalFees);
  // Rough APR estimate (reducing basis approximation for informational display).
  const aprPct = annual > 0 && input.rateBasis !== "REDUCING_ANNUAL"
    ? r2((totalInterest / financedAmount) / (term / 12) * 100 * 1.85)
    : r2(annual * 100);

  return {
    amount: r2(amount),
    downPayment: r2(downPayment),
    financedAmount: r2(financedAmount),
    termMonths: term,
    installment,
    totalInterest: r2(totalInterest),
    totalFees,
    totalVat: vat,
    totalPayable,
    aprPct,
    firstDueDate: schedule[0]?.dueDate ?? "",
    lastDueDate: schedule[schedule.length - 1]?.dueDate ?? "",
    schedule,
    disclaimerAr:
      "النتيجة تقديرية ولا تمثل موافقة أو عرضًا نهائيًا. تحدد الشروط النهائية بعد المراجعة الائتمانية الداخلية.",
  };
}
