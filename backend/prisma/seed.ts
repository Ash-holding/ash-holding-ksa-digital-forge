import "dotenv/config";
import { PrismaClient, UserRole, ClientStatus, ProjectStatus, ServiceType, ServiceStatus, InvoiceStatus, ContractStatus, TicketStatus, TicketPriority, PaymentStatus, PaymentMethod, NotificationType } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding ASH HOLDING database...");

  const adminPassword = await bcrypt.hash(process.env.SEED_ADMIN_PASSWORD || "Admin@12345", 10);
  const supportPassword = await bcrypt.hash(process.env.SEED_SUPPORT_PASSWORD || "Support@12345", 10);
  const accountantPassword = await bcrypt.hash(process.env.SEED_ACCOUNTANT_PASSWORD || "Account@12345", 10);
  const clientPassword = await bcrypt.hash(process.env.SEED_CLIENT_PASSWORD || "Client@12345", 10);

  // Users
  const admin = await prisma.user.upsert({
    where: { email: process.env.SEED_ADMIN_EMAIL || "admin@ashholding.sa" },
    update: {},
    create: {
      email: process.env.SEED_ADMIN_EMAIL || "admin@ashholding.sa",
      name: "علي صالح الشهري",
      role: UserRole.SUPER_ADMIN,
      passwordHash: adminPassword,
      phone: "+966500000000",
    },
  });

  const support = await prisma.user.upsert({
    where: { email: "support@ashholding.sa" },
    update: {},
    create: {
      email: "support@ashholding.sa",
      name: "فريق الدعم الفني",
      role: UserRole.SUPPORT,
      passwordHash: supportPassword,
    },
  });

  await prisma.user.upsert({
    where: { email: "accountant@ashholding.sa" },
    update: {},
    create: {
      email: "accountant@ashholding.sa",
      name: "محاسب الشركة",
      role: UserRole.ACCOUNTANT,
      passwordHash: accountantPassword,
    },
  });

  // Demo client + profile
  const clientUser = await prisma.user.upsert({
    where: { email: process.env.SEED_CLIENT_EMAIL || "client@demo.sa" },
    update: {},
    create: {
      email: process.env.SEED_CLIENT_EMAIL || "client@demo.sa",
      name: "أحمد المهندس",
      role: UserRole.CLIENT,
      passwordHash: clientPassword,
      phone: "+966555555555",
      client: {
        create: {
          companyName: "شركة النجاح للتقنية",
          commercialNumber: "1010101010",
          taxNumber: "300000000000003",
          phone: "+966555555555",
          contactEmail: "info@success.sa",
          city: "الرياض",
          country: "SA",
          address: "طريق الملك فهد، الرياض",
          status: ClientStatus.ACTIVE,
        },
      },
    },
    include: { client: true },
  });
  const clientId = clientUser.client!.id;

  // Projects
  const project1 = await prisma.project.upsert({
    where: { id: "seed-project-1" },
    update: {},
    create: {
      id: "seed-project-1",
      clientId,
      title: "منصة النجاح للتجارة الإلكترونية",
      description: "متجر إلكتروني متكامل مع لوحة تحكم وإدارة مخزون.",
      status: ProjectStatus.DEVELOPMENT,
      progress: 65,
      budget: 85000,
      startDate: new Date(Date.now() - 60 * 24 * 3600 * 1000),
      dueDate: new Date(Date.now() + 30 * 24 * 3600 * 1000),
    },
  });

  const project2 = await prisma.project.upsert({
    where: { id: "seed-project-2" },
    update: {},
    create: {
      id: "seed-project-2",
      clientId,
      title: "تطبيق جوال iOS و Android",
      description: "تطبيق العملاء للطلبات والمتابعة.",
      status: ProjectStatus.DESIGN,
      progress: 25,
      budget: 60000,
      startDate: new Date(),
      dueDate: new Date(Date.now() + 90 * 24 * 3600 * 1000),
    },
  });

  await prisma.projectNote.createMany({
    data: [
      { projectId: project1.id, authorId: admin.id, content: "المرحلة الحالية: تطوير سلة الشراء.", visibility: "CLIENT" },
      { projectId: project1.id, authorId: admin.id, content: "ملاحظة داخلية: مراجعة الأمان مع فريق DevOps.", visibility: "INTERNAL" },
    ],
    skipDuplicates: true,
  });

  // Client services
  await prisma.clientService.createMany({
    data: [
      { clientId, projectId: project1.id, name: "استضافة VPS احترافية", type: ServiceType.VPS, status: ServiceStatus.ACTIVE, price: 250, renewalDate: new Date(Date.now() + 25 * 24 * 3600 * 1000) },
      { clientId, name: "SMTP وبريد مؤسسي", type: ServiceType.SMTP, status: ServiceStatus.ACTIVE, price: 45, renewalDate: new Date(Date.now() + 60 * 24 * 3600 * 1000) },
      { clientId, name: "صيانة شهرية", type: ServiceType.SUPPORT, status: ServiceStatus.AWAITING_PAYMENT, price: 500, renewalDate: new Date(Date.now() + 7 * 24 * 3600 * 1000) },
    ],
    skipDuplicates: true,
  });

  // Invoices
  const invoice1 = await prisma.invoice.upsert({
    where: { invoiceNumber: "INV-2026-0001" },
    update: {},
    create: {
      invoiceNumber: "INV-2026-0001",
      clientId,
      projectId: project1.id,
      status: InvoiceStatus.UNPAID,
      subtotal: 25000,
      discount: 0,
      taxRate: 15,
      taxAmount: 3750,
      total: 28750,
      dueAt: new Date(Date.now() + 14 * 24 * 3600 * 1000),
      items: {
        create: [
          { title: "دفعة أولى - منصة التجارة الإلكترونية", quantity: 1, unitPrice: 25000, total: 25000 },
        ],
      },
    },
  });

  await prisma.invoice.upsert({
    where: { invoiceNumber: "INV-2026-0002" },
    update: {},
    create: {
      invoiceNumber: "INV-2026-0002",
      clientId,
      status: InvoiceStatus.PAID,
      subtotal: 3000,
      taxRate: 15,
      taxAmount: 450,
      total: 3450,
      paidAt: new Date(),
      items: { create: [{ title: "استضافة VPS - 12 شهر", quantity: 12, unitPrice: 250, total: 3000 }] },
    },
  });

  // Payments
  await prisma.payment.create({
    data: {
      clientId,
      invoiceId: invoice1.id,
      amount: 5000,
      method: PaymentMethod.BANK_TRANSFER,
      status: PaymentStatus.SUCCESS,
      transactionRef: "TXN-DEMO-001",
      paidAt: new Date(),
    },
  });

  // Contracts
  await prisma.contract.upsert({
    where: { contractNumber: "CTR-2026-0001" },
    update: {},
    create: {
      contractNumber: "CTR-2026-0001",
      clientId,
      projectId: project1.id,
      title: "عقد تطوير منصة التجارة الإلكترونية",
      status: ContractStatus.SIGNED,
      value: 85000,
      startDate: new Date(),
      endDate: new Date(Date.now() + 120 * 24 * 3600 * 1000),
      signedAt: new Date(),
    },
  });

  await prisma.contract.upsert({
    where: { contractNumber: "CTR-2026-0002" },
    update: {},
    create: {
      contractNumber: "CTR-2026-0002",
      clientId,
      projectId: project2.id,
      title: "عقد تطوير تطبيق الجوال",
      status: ContractStatus.PENDING_SIGNATURE,
      value: 60000,
    },
  });

  // Support ticket + messages
  const ticket = await prisma.supportTicket.upsert({
    where: { ticketNumber: "TKT-2026-0001" },
    update: {},
    create: {
      ticketNumber: "TKT-2026-0001",
      clientId,
      subject: "الموقع بطيء في ساعات الذروة",
      description: "نلاحظ بطء في تحميل الصفحات بين 8-10 مساءً.",
      priority: TicketPriority.HIGH,
      status: TicketStatus.IN_PROGRESS,
      assignedToId: support.id,
    },
  });

  await prisma.ticketMessage.createMany({
    data: [
      { ticketId: ticket.id, senderId: clientUser.id, message: "المشكلة تتكرر يومياً في نفس الوقت." },
      { ticketId: ticket.id, senderId: support.id, message: "جارٍ تحليل السجلات، سنعود لك خلال ساعتين." },
      { ticketId: ticket.id, senderId: support.id, message: "ملاحظة داخلية: التحقق من إعدادات CDN.", isInternal: true },
    ],
    skipDuplicates: true,
  });

  // Notifications
  await prisma.notification.createMany({
    data: [
      { userId: clientUser.id, title: "فاتورة جديدة", body: "تم إصدار فاتورة INV-2026-0001", type: NotificationType.INVOICE },
      { userId: clientUser.id, title: "تحديث المشروع", body: "تم تحديث نسبة الإنجاز إلى 65%", type: NotificationType.PROJECT },
      { userId: clientUser.id, title: "عقد بانتظار التوقيع", body: "CTR-2026-0002 بانتظار توقيعك.", type: NotificationType.CONTRACT },
    ],
    skipDuplicates: true,
  });

  // System settings
  await prisma.systemSetting.upsert({
    where: { key: "company" },
    update: {},
    create: {
      key: "company",
      value: {
        nameAr: "شركة علي صالح الشهري القابضة",
        nameEn: "ASH HOLDING",
        vatNumber: "310000000000003",
        crNumber: "1010000000",
        phone: "+966920000000",
        email: "info@ashholding.sa",
        address: "الرياض، المملكة العربية السعودية",
      },
    },
  });

  console.log("✅ Seed complete.");
  console.log(`   Admin:      ${admin.email}  / ${process.env.SEED_ADMIN_PASSWORD || "Admin@12345"}`);
  console.log(`   Support:    support@ashholding.sa  / ${process.env.SEED_SUPPORT_PASSWORD || "Support@12345"}`);
  console.log(`   Accountant: accountant@ashholding.sa  / ${process.env.SEED_ACCOUNTANT_PASSWORD || "Account@12345"}`);
  console.log(`   Client:     ${clientUser.email}  / ${process.env.SEED_CLIENT_PASSWORD || "Client@12345"}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
