// Public receipt / invoice verification — no auth. Read-only, minimal PII.
import { Router } from "express";
import { prisma } from "../lib/prisma.js";

export const verifyRouter = Router();

/** Normalize any receipt / invoice code to an invoice-number lookup.
 *  Accepts:  RCP-2026-0003  |  INV-2026-0003  |  2026-0003  |  2026/0003
 */
function normalize(code: string): string {
  const clean = code.trim().toUpperCase().replace(/\s+/g, "").replace(/\//g, "-");
  const stripped = clean.replace(/^(RCP|INV)-?/, "");
  return `INV-${stripped}`;
}

verifyRouter.get("/receipt/:code", async (req, res, next) => {
  try {
    const raw = String(req.params.code || "");
    if (!raw || raw.length > 40) return res.status(400).json({ ok: false, error: "رمز غير صالح" });
    const invoiceNumber = normalize(raw);

    const inv = await prisma.invoice.findFirst({
      where: { invoiceNumber },
      select: {
        id: true, invoiceNumber: true, status: true, total: true, currency: true,
        issuedAt: true, paidAt: true, createdAt: true,
        client: { select: { companyName: true, user: { select: { name: true } } } },
        project: { select: { title: true } },
        payments: {
          where: { status: "SUCCESS" },
          orderBy: { paidAt: "desc" },
          select: { id: true, amount: true, method: true, paidAt: true, transactionRef: true },
          take: 1,
        },
      },
    });

    if (!inv) {
      return res.status(404).json({
        ok: false,
        found: false,
        code: raw.toUpperCase(),
        error: "لم يتم العثور على إيصال أو فاتورة بهذا الرقم",
      });
    }

    const receiptNumber = `RCP-${inv.invoiceNumber.replace(/^INV-?/, "")}`;
    const isPaid = inv.status === "PAID";
    const payment = inv.payments[0] || null;
    const beneficiary = inv.client?.companyName || inv.client?.user?.name || "عميل";
    // mask beneficiary partially for privacy
    const maskedBeneficiary = beneficiary.length > 2
      ? beneficiary.slice(0, 2) + "•".repeat(Math.min(6, Math.max(2, beneficiary.length - 2)))
      : beneficiary;

    res.json({
      ok: true,
      found: true,
      receiptNumber,
      invoiceNumber: inv.invoiceNumber,
      status: inv.status,
      isPaid,
      isValid: isPaid, // valid receipt = paid invoice
      total: Number(inv.total),
      currency: inv.currency,
      issuedAt: inv.issuedAt || inv.createdAt,
      paidAt: inv.paidAt || payment?.paidAt || null,
      beneficiary: maskedBeneficiary,
      projectTitle: inv.project?.title || null,
      payment: payment
        ? { id: payment.id, method: payment.method, amount: Number(payment.amount), paidAt: payment.paidAt, ref: payment.transactionRef }
        : null,
      verifiedAt: new Date().toISOString(),
    });
  } catch (e) { next(e); }
});
