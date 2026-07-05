import { PrismaClient, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.SEED_ADMIN_EMAIL || "admin@ashholding.sa";
  const adminPass = process.env.SEED_ADMIN_PASSWORD || "ChangeMe!2026";
  const clientEmail = process.env.SEED_CLIENT_EMAIL || "client@example.com";
  const clientPass = process.env.SEED_CLIENT_PASSWORD || "ChangeMe!2026";

  const adminHash = await bcrypt.hash(adminPass, 10);
  const clientHash = await bcrypt.hash(clientPass, 10);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      passwordHash: adminHash,
      name: "مدير النظام",
      role: UserRole.ADMIN,
    },
  });

  const clientUser = await prisma.user.upsert({
    where: { email: clientEmail },
    update: {},
    create: {
      email: clientEmail,
      passwordHash: clientHash,
      name: "عميل تجريبي",
      role: UserRole.CLIENT,
      client: {
        create: {
          companyName: "شركة تجريبية",
          country: "SA",
          city: "الرياض",
        },
      },
    },
    include: { client: true },
  });

  // Baseline service catalog
  const services = [
    { slug: "web-development", name: "تطوير المواقع والمنصات", category: "development" },
    { slug: "mobile-apps", name: "تطبيقات الجوال", category: "development" },
    { slug: "systems-dashboards", name: "الأنظمة ولوحات التحكم", category: "development" },
    { slug: "ai-automation", name: "الذكاء الاصطناعي والأتمتة", category: "development" },
    { slug: "design-identity", name: "التصميم والهوية", category: "design" },
    { slug: "shared-hosting", name: "استضافة مشتركة", category: "hosting" },
    { slug: "vps", name: "خوادم VPS", category: "hosting" },
    { slug: "dedicated-servers", name: "سيرفرات مخصصة", category: "hosting" },
    { slug: "seo", name: "تحسين محركات البحث", category: "marketing" },
    { slug: "paid-ads", name: "الحملات الإعلانية", category: "marketing" },
  ];
  for (const s of services) {
    await prisma.service.upsert({
      where: { slug: s.slug },
      update: {},
      create: s,
    });
  }

  console.log("Seeded:", { admin: admin.email, client: clientUser.email });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
