// Idempotent auto-seed for default published financing products.
// Runs on server startup. Only creates products that don't exist yet.
import { prisma } from "../prisma.js";

type Seed = {
  code: string;
  nameAr: string;
  descriptionAr: string;
  customerType: "INDIVIDUAL" | "BUSINESS";
  minAmount: number;
  maxAmount: number;
  minDownPaymentPct: number;
  minTermMonths: number;
  maxTermMonths: number;
  allowedTermsMonths: number[];
  ratePct: number;
  adminFeePct: number;
  adminFeeFlat: number;
  requiredDocsAr: string[];
  eligibilityNoteAr: string;
};

const DEFAULTS: Seed[] = [
  {
    code: "IND-DIGITAL-FLEX",
    nameAr: "تمويل الخدمات الرقمية — أفراد",
    descriptionAr: "تمويل مرن لخدمات التصميم والتطوير والتسويق الرقمي للأفراد.",
    customerType: "INDIVIDUAL",
    minAmount: 5000, maxAmount: 100000, minDownPaymentPct: 10,
    minTermMonths: 3, maxTermMonths: 24, allowedTermsMonths: [3, 6, 12, 18, 24],
    ratePct: 8.5, adminFeePct: 1, adminFeeFlat: 100,
    requiredDocsAr: ["الهوية الوطنية", "شهادة راتب حديثة", "كشف حساب بنكي (3 أشهر)"],
    eligibilityNoteAr: "دخل شهري لا يقل عن 4,000 ﷼، وأن لا تتجاوز نسبة الاستقطاع 45٪.",
  },
  {
    code: "IND-PREMIUM",
    nameAr: "تمويل بريميوم — أفراد",
    descriptionAr: "حزم متقدمة للخدمات المتكاملة بمزايا أعلى ومدة أطول.",
    customerType: "INDIVIDUAL",
    minAmount: 20000, maxAmount: 250000, minDownPaymentPct: 15,
    minTermMonths: 6, maxTermMonths: 36, allowedTermsMonths: [12, 18, 24, 30, 36],
    ratePct: 7.25, adminFeePct: 0.75, adminFeeFlat: 150,
    requiredDocsAr: ["الهوية الوطنية", "تعريف بالراتب", "كشف حساب (6 أشهر)", "إثبات سكن"],
    eligibilityNoteAr: "دخل شهري لا يقل عن 12,000 ﷼، ومدة عمل لا تقل عن سنة.",
  },
  {
    code: "BIZ-GROWTH",
    nameAr: "تمويل نمو المنشآت — شركات",
    descriptionAr: "تمويل خدمات الهوية والتحول الرقمي والحملات التسويقية للمنشآت.",
    customerType: "BUSINESS",
    minAmount: 30000, maxAmount: 500000, minDownPaymentPct: 20,
    minTermMonths: 6, maxTermMonths: 36, allowedTermsMonths: [6, 12, 18, 24, 36],
    ratePct: 9.5, adminFeePct: 1.25, adminFeeFlat: 250,
    requiredDocsAr: ["السجل التجاري", "شهادة ضريبة القيمة المضافة", "قوائم مالية (سنة)", "كشف حساب المنشأة (6 أشهر)"],
    eligibilityNoteAr: "منشأة نشطة وسارية، وإيرادات سنوية لا تقل عن 500,000 ﷼.",
  },
];

export async function seedDefaultFinancingProducts(): Promise<void> {
  try {
    for (const s of DEFAULTS) {
      const existing = await prisma.financingProduct.findUnique({ where: { code: s.code } });
      if (existing) {
        // Ensure it's PUBLISHED (was DRAFT? auto-promote so system is usable)
        if (existing.status !== "PUBLISHED") {
          await prisma.financingProduct.update({
            where: { id: existing.id },
            data: { status: "PUBLISHED", publishedAt: existing.publishedAt ?? new Date() },
          });
        }
        continue;
      }
      await prisma.financingProduct.create({
        data: {
          ...s,
          rateBasis: "REDUCING_ANNUAL",
          vatOnFees: true,
          gracePeriodDays: 3,
          status: "PUBLISHED",
          publishedAt: new Date(),
        },
      });
    }
    // Ensure singleton settings exist
    await prisma.financingSetting.upsert({
      where: { id: "default" },
      create: { id: "default" },
      update: {},
    });
  } catch (e) {
    console.error("[financing] seed defaults failed:", e);
  }
}
