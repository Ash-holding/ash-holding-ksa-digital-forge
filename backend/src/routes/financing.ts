// Public + client-facing financing endpoints.
// Read-only: product catalog and server-side quote calculator.
// NO financial decisions happen here — this is informational only.
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { computeQuote } from "../lib/financing/calculator.js";
import { computeInternalCreditReport } from "../lib/financing/credit-report.js";

export const financingRouter = Router();

/** Ensure the singleton settings row exists (called lazily). */
async function ensureSettings() {
  const s = await prisma.financingSetting.findUnique({ where: { id: "default" } });
  if (s) return s;
  return prisma.financingSetting.create({ data: { id: "default" } });
}

// GET /api/financing/settings — public sandbox banner + limits
financingRouter.get("/settings", async (_req, res) => {
  const s = await ensureSettings();
  res.json({
    productionEnabled: s.productionEnabled,
    sandboxNoticeAr: s.sandboxNoticeAr,
    minAmount: Number(s.minAmount),
    maxAmount: Number(s.maxAmount),
    publicContactEmail: s.publicContactEmail,
    complaintsEmail: s.complaintsEmail,
  });
});

// GET /api/financing/products — only PUBLISHED products
financingRouter.get("/products", async (req, res) => {
  const customerType = req.query.customerType as string | undefined;
  const where: Record<string, unknown> = { status: "PUBLISHED" };
  if (customerType === "INDIVIDUAL" || customerType === "BUSINESS") {
    where.customerType = customerType;
  }
  const items = await prisma.financingProduct.findMany({
    where,
    include: { services: true },
    orderBy: { createdAt: "desc" },
  });
  res.json({
    items: items.map((p) => ({
      id: p.id,
      code: p.code,
      nameAr: p.nameAr,
      descriptionAr: p.descriptionAr,
      customerType: p.customerType,
      minAmount: Number(p.minAmount),
      maxAmount: Number(p.maxAmount),
      minDownPaymentPct: Number(p.minDownPaymentPct),
      minTermMonths: p.minTermMonths,
      maxTermMonths: p.maxTermMonths,
      allowedTermsMonths: p.allowedTermsMonths,
      rateBasis: p.rateBasis,
      ratePct: Number(p.ratePct),
      adminFeePct: Number(p.adminFeePct),
      adminFeeFlat: Number(p.adminFeeFlat),
      vatOnFees: p.vatOnFees,
      gracePeriodDays: p.gracePeriodDays,
      requiredDocsAr: p.requiredDocsAr,
      eligibilityNoteAr: p.eligibilityNoteAr,
      services: p.services.map((s) => ({ id: s.id, labelAr: s.labelAr })),
    })),
  });
});

const quoteSchema = z.object({
  amount: z.number().min(0),
  downPayment: z.number().min(0).default(0),
  termMonths: z.number().int().min(1).max(120),
});

// POST /api/financing/products/:id/quote — server-side quote (estimate only)
financingRouter.post("/products/:id/quote", async (req, res) => {
  const parsed = quoteSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_input", details: parsed.error.flatten() });

  const product = await prisma.financingProduct.findUnique({ where: { id: req.params.id } });
  if (!product || product.status !== "PUBLISHED") {
    return res.status(404).json({ error: "product_not_available" });
  }
  const { amount, downPayment, termMonths } = parsed.data;

  const min = Number(product.minAmount);
  const max = Number(product.maxAmount);
  if (amount < min || amount > max) {
    return res.status(400).json({ error: "amount_out_of_range", min, max });
  }
  if (termMonths < product.minTermMonths || termMonths > product.maxTermMonths) {
    return res.status(400).json({
      error: "term_out_of_range",
      minTermMonths: product.minTermMonths,
      maxTermMonths: product.maxTermMonths,
    });
  }
  const minDown = Number(product.minDownPaymentPct) / 100 * amount;
  if (downPayment < minDown) {
    return res.status(400).json({ error: "down_payment_too_low", minDownPayment: Math.round(minDown) });
  }

  const quote = computeQuote({
    amount,
    downPayment,
    termMonths,
    rateBasis: product.rateBasis,
    ratePct: Number(product.ratePct),
    adminFeePct: Number(product.adminFeePct),
    adminFeeFlat: Number(product.adminFeeFlat),
    vatOnFees: product.vatOnFees,
  });

  res.json({ product: { id: product.id, code: product.code, nameAr: product.nameAr }, quote });
});
