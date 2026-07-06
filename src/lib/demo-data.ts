// Demo data used as a fallback when the backend API is unreachable
// (preview mode without deployed backend). Returns realistic sample data
// so every admin / client page renders with rich, coherent content.

type Handler = (url: string, method: string, body?: unknown) => unknown | undefined;

const now = () => new Date().toISOString();
const daysAgo = (n: number) => new Date(Date.now() - n * 86400000).toISOString();
const rand = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

// ============================================================================
// Base entities
// ============================================================================

type DemoUser = { id: string; name: string; email: string; phone: string | null; status: string; role?: string; avatarUrl: string | null; lastLoginAt: string | null; lastIpAddress: string | null };
type DemoClient = {
  id: string; companyName: string | null; commercialNumber: string | null; taxNumber: string | null;
  phone: string | null; contactEmail: string | null; address: string | null; city: string | null; country: string;
  status: "ACTIVE" | "DISABLED" | "PENDING";
  verificationStatus: "UNVERIFIED" | "PENDING" | "VERIFIED" | "REJECTED";
  verifiedAt: string | null; verifiedBy: { id: string; name: string } | null; verificationNote: string | null;
  lastIpAddress: string | null; lastIpCountry: string | null; lastIpCity: string | null; lastIpRegion: string | null;
  lat: number | null; lng: number | null; lastSeenAt: string | null;
  createdAt: string; activeSessions: number;
  user: DemoUser;
  contactName?: string; email?: string;
};

const mkClient = (o: Partial<DemoClient> & Pick<DemoClient, "id" | "companyName" | "user">): DemoClient => ({
  commercialNumber: null, taxNumber: null, phone: o.user.phone ?? null,
  contactEmail: null, address: null, city: null, country: "SA",
  status: "ACTIVE", verificationStatus: "UNVERIFIED",
  verifiedAt: null, verifiedBy: null, verificationNote: null,
  lastIpAddress: null, lastIpCountry: null, lastIpCity: null, lastIpRegion: null,
  lat: null, lng: null, lastSeenAt: null,
  createdAt: daysAgo(30), activeSessions: 0,
  contactName: o.user.name, email: o.user.email,
  ...o,
});

const clients: DemoClient[] = [
  mkClient({
    id: "c1", companyName: "شركة الرياض للتقنية",
    user: { id: "u1", name: "أحمد الشهري", email: "ahmed@riyadh-tech.sa", phone: "+966501112233", status: "ACTIVE", avatarUrl: null, lastLoginAt: daysAgo(0), lastIpAddress: "212.107.192.10" },
    commercialNumber: "1010223344", taxNumber: "300012345600003",
    address: "طريق الملك فهد، برج المملكة، الطابق 20", city: "الرياض",
    verificationStatus: "VERIFIED", verifiedAt: daysAgo(60),
    verifiedBy: { id: "admin1", name: "علي القحطاني" }, verificationNote: "تم التحقق من السجل التجاري والهوية.",
    lastIpAddress: "212.107.192.10", lastIpCountry: "SA", lastIpCity: "الرياض", lastIpRegion: "منطقة الرياض",
    lat: 24.7136, lng: 46.6753, lastSeenAt: daysAgo(0), createdAt: daysAgo(90), activeSessions: 2,
  }),
  mkClient({
    id: "c2", companyName: "متجر جدة الإلكتروني",
    user: { id: "u2", name: "سارة العتيبي", email: "sara@jeddah-shop.sa", phone: "+966502223344", status: "ACTIVE", avatarUrl: null, lastLoginAt: daysAgo(1), lastIpAddress: "94.98.14.55" },
    commercialNumber: "4030445566", city: "جدة", address: "شارع التحلية، حي الروضة",
    verificationStatus: "VERIFIED", verifiedAt: daysAgo(30), verifiedBy: { id: "admin1", name: "علي القحطاني" },
    lastIpAddress: "94.98.14.55", lastIpCountry: "SA", lastIpCity: "جدة", lastIpRegion: "منطقة مكة المكرمة",
    lat: 21.4858, lng: 39.1925, lastSeenAt: daysAgo(1), createdAt: daysAgo(60), activeSessions: 1,
  }),
  mkClient({
    id: "c3", companyName: "مؤسسة الدمام الرقمية",
    user: { id: "u3", name: "خالد القحطاني", email: "khalid@dammam-digital.sa", phone: "+966503334455", status: "ACTIVE", avatarUrl: null, lastLoginAt: daysAgo(3), lastIpAddress: "188.55.100.20" },
    commercialNumber: "2050998877", city: "الدمام", address: "الكورنيش، حي الشاطئ",
    verificationStatus: "PENDING",
    lastIpAddress: "188.55.100.20", lastIpCountry: "SA", lastIpCity: "الدمام", lastIpRegion: "المنطقة الشرقية",
    lat: 26.4207, lng: 50.0888, lastSeenAt: daysAgo(3), createdAt: daysAgo(30), activeSessions: 1,
  }),
  mkClient({
    id: "c4", companyName: "شركة النور للاستثمار",
    user: { id: "u4", name: "فهد الغامدي", email: "fahd@alnoor.sa", phone: "+966504445566", status: "PENDING", avatarUrl: null, lastLoginAt: null, lastIpAddress: null },
    city: "الرياض", status: "PENDING", verificationStatus: "UNVERIFIED", createdAt: daysAgo(10), activeSessions: 0,
  }),
  mkClient({
    id: "c5", companyName: "عميل تجريبي — Demo",
    user: { id: "u5", name: "المستخدم التجريبي", email: "demo@client.sa", phone: "+966555000111", status: "ACTIVE", avatarUrl: null, lastLoginAt: daysAgo(0), lastIpAddress: "89.108.44.7" },
    commercialNumber: "1010000000", taxNumber: "300000000000003",
    address: "حي العليا، الرياض", city: "الرياض", contactEmail: "demo@client.sa",
    verificationStatus: "VERIFIED", verifiedAt: daysAgo(2),
    verifiedBy: { id: "admin1", name: "علي القحطاني" }, verificationNote: "حساب تجريبي لعرض المميزات.",
    lastIpAddress: "89.108.44.7", lastIpCountry: "SA", lastIpCity: "الرياض", lastIpRegion: "منطقة الرياض",
    lat: 24.7743, lng: 46.7386, lastSeenAt: daysAgo(0), createdAt: daysAgo(2), activeSessions: 3,
  }),
];

const clientLite = (c: DemoClient) => ({ id: c.id, user: { id: c.user.id, name: c.user.name, email: c.user.email } });

// ============================================================================
// Projects — matches admin.projects.tsx: title, status, progress, budget, dueDate, client{user{name,email}}
// ============================================================================

type DemoProject = {
  id: string; title: string; description: string; status: string; progress: number;
  budget: string | null; dueDate: string | null; startedAt: string; clientId: string;
  client: { id: string; user: { name: string; email: string } };
};
const projects: DemoProject[] = [
  { id: "p1", title: "منصة إدارة المخزون", description: "منصة ويب لإدارة المخزون والفروع.", status: "DEVELOPMENT", progress: 65, budget: "85000", dueDate: daysAgo(-30), startedAt: daysAgo(45), clientId: "c1", client: clientLite(clients[0]) },
  { id: "p2", title: "متجر إلكتروني متكامل", description: "متجر React + Node + بوابة دفع.", status: "DEVELOPMENT", progress: 40, budget: "120000", dueDate: daysAgo(-45), startedAt: daysAgo(30), clientId: "c2", client: clientLite(clients[1]) },
  { id: "p3", title: "تطبيق جوال للحجوزات", description: "iOS/Android للحجز الفوري.", status: "PLANNING", progress: 15, budget: "95000", dueDate: daysAgo(-90), startedAt: daysAgo(10), clientId: "c3", client: clientLite(clients[2]) },
  { id: "p4", title: "موقع تعريفي وهوية بصرية", description: "Landing page + هوية.", status: "COMPLETED", progress: 100, budget: "35000", dueDate: daysAgo(30), startedAt: daysAgo(120), clientId: "c1", client: clientLite(clients[0]) },
  { id: "p5", title: "نظام إدارة العملاء CRM", description: "CRM داخلي مع تقارير.", status: "PLANNING", progress: 5, budget: "150000", dueDate: daysAgo(-120), startedAt: daysAgo(3), clientId: "c4", client: clientLite(clients[3]) },
  { id: "p6", title: "لوحة تحكم تحليلية", description: "لوحة KPI مباشرة.", status: "TESTING", progress: 88, budget: "60000", dueDate: daysAgo(-7), startedAt: daysAgo(60), clientId: "c5", client: clientLite(clients[4]) },
  { id: "p7", title: "استضافة سيرفر VPS", description: "إعداد وأتمتة.", status: "ON_HOLD", progress: 25, budget: "18000", dueDate: daysAgo(-40), startedAt: daysAgo(20), clientId: "c2", client: clientLite(clients[1]) },
];

// ============================================================================
// Services — matches admin.services.tsx
// ============================================================================

type DemoService = {
  id: string; name: string; type: string; status: string; price: string | null;
  renewalDate: string | null; clientId: string;
  client: { user: { name: string } }; project?: { title: string } | null;
};
const services: DemoService[] = [
  { id: "s1", name: "استضافة موقع + شهادة SSL", type: "HOSTING", status: "ACTIVE", price: "1200", renewalDate: daysAgo(-30), clientId: "c1", client: { user: { name: clients[0].user.name } }, project: { title: "منصة إدارة المخزون" } },
  { id: "s2", name: "سيرفر VPS 8GB", type: "VPS", status: "ACTIVE", price: "3500", renewalDate: daysAgo(-60), clientId: "c2", client: { user: { name: clients[1].user.name } } },
  { id: "s3", name: "خدمة SMTP احترافية", type: "SMTP", status: "ACTIVE", price: "800", renewalDate: daysAgo(-15), clientId: "c1", client: { user: { name: clients[0].user.name } } },
  { id: "s4", name: "تسويق رقمي شهري", type: "MARKETING", status: "AWAITING_PAYMENT", price: "5000", renewalDate: daysAgo(-5), clientId: "c3", client: { user: { name: clients[2].user.name } } },
  { id: "s5", name: "تصميم هوية بصرية", type: "DESIGN", status: "ACTIVE", price: "12000", renewalDate: null, clientId: "c5", client: { user: { name: clients[4].user.name } } },
  { id: "s6", name: "صيانة سنوية", type: "SUPPORT", status: "SUSPENDED", price: "6000", renewalDate: daysAgo(20), clientId: "c4", client: { user: { name: clients[3].user.name } } },
  { id: "s7", name: "سيرفر مخصص", type: "DEDICATED_SERVER", status: "EXPIRED", price: "9500", renewalDate: daysAgo(45), clientId: "c2", client: { user: { name: clients[1].user.name } } },
];

// ============================================================================
// Invoices — matches admin.invoices.tsx: invoiceNumber, status, total, dueAt, client{user{name}}
// ============================================================================

type DemoInvoice = {
  id: string; invoiceNumber: string; status: string; total: string; subtotal: string; tax: string;
  dueAt: string | null; issuedAt: string; clientId: string;
  client: { user: { name: string } }; project?: { title: string } | null;
};
const invoices: DemoInvoice[] = [
  { id: "i1", invoiceNumber: "INV-2026-001", status: "PAID", total: "28750", subtotal: "25000", tax: "3750", dueAt: daysAgo(45), issuedAt: daysAgo(60), clientId: "c1", client: { user: { name: clients[0].user.name } }, project: { title: "منصة إدارة المخزون" } },
  { id: "i2", invoiceNumber: "INV-2026-002", status: "PAID", total: "46000", subtotal: "40000", tax: "6000", dueAt: daysAgo(30), issuedAt: daysAgo(45), clientId: "c2", client: { user: { name: clients[1].user.name } } },
  { id: "i3", invoiceNumber: "INV-2026-003", status: "UNPAID", total: "34500", subtotal: "30000", tax: "4500", dueAt: daysAgo(-5), issuedAt: daysAgo(15), clientId: "c1", client: { user: { name: clients[0].user.name } } },
  { id: "i4", invoiceNumber: "INV-2026-004", status: "UNPAID", total: "63250", subtotal: "55000", tax: "8250", dueAt: daysAgo(-15), issuedAt: daysAgo(7), clientId: "c3", client: { user: { name: clients[2].user.name } } },
  { id: "i5", invoiceNumber: "INV-2026-005", status: "OVERDUE", total: "17250", subtotal: "15000", tax: "2250", dueAt: daysAgo(60), issuedAt: daysAgo(90), clientId: "c4", client: { user: { name: clients[3].user.name } } },
  { id: "i6", invoiceNumber: "INV-2026-006", status: "PAID", total: "13800", subtotal: "12000", tax: "1800", dueAt: daysAgo(20), issuedAt: daysAgo(35), clientId: "c5", client: { user: { name: clients[4].user.name } } },
  { id: "i7", invoiceNumber: "INV-2026-007", status: "DRAFT", total: "0", subtotal: "0", tax: "0", dueAt: null, issuedAt: daysAgo(0), clientId: "c2", client: { user: { name: clients[1].user.name } } },
];

// ============================================================================
// Contracts — matches admin.contracts.tsx: contractNumber, title, status, value, signedAt, client{user{name}}
// ============================================================================

type DemoContract = {
  id: string; contractNumber: string; title: string; status: string; value: string | null;
  signedAt: string | null; startsAt: string; endsAt: string | null; clientId: string;
  client: { user: { name: string } };
};
const contracts: DemoContract[] = [
  { id: "co1", contractNumber: "CON-2026-001", title: "عقد تطوير منصة المخزون", status: "SIGNED", value: "85000", signedAt: daysAgo(45), startsAt: daysAgo(45), endsAt: daysAgo(-90), clientId: "c1", client: { user: { name: clients[0].user.name } } },
  { id: "co2", contractNumber: "CON-2026-002", title: "عقد تطوير متجر إلكتروني", status: "SIGNED", value: "120000", signedAt: daysAgo(30), startsAt: daysAgo(30), endsAt: daysAgo(-150), clientId: "c2", client: { user: { name: clients[1].user.name } } },
  { id: "co3", contractNumber: "CON-2026-003", title: "عقد صيانة سنوي", status: "PENDING_SIGNATURE", value: "24000", signedAt: null, startsAt: daysAgo(5), endsAt: daysAgo(-360), clientId: "c3", client: { user: { name: clients[2].user.name } } },
  { id: "co4", contractNumber: "CON-2026-004", title: "عقد هوية بصرية", status: "SENT", value: "12000", signedAt: null, startsAt: daysAgo(2), endsAt: daysAgo(-30), clientId: "c5", client: { user: { name: clients[4].user.name } } },
  { id: "co5", contractNumber: "CON-2026-005", title: "عقد استشارات فنية", status: "DRAFT", value: "6000", signedAt: null, startsAt: daysAgo(0), endsAt: null, clientId: "c4", client: { user: { name: clients[3].user.name } } },
];

// ============================================================================
// Tickets — matches admin.support.tsx: ticketNumber, subject, status, priority, updatedAt, client{user{name}}, _count.messages
// ============================================================================

type DemoTicket = {
  id: string; ticketNumber: string; subject: string; description: string; status: string; priority: string;
  updatedAt: string; createdAt: string; clientId: string;
  client: { user: { name: string } }; agent: { name: string } | null; _count: { messages: number };
  messages?: Array<{ id: string; message: string; isInternal: boolean; createdAt: string; sender: { id: string; name: string } }>;
};
const tickets: DemoTicket[] = [
  { id: "t1", ticketNumber: "TKT-1001", subject: "طلب إضافة تقرير مبيعات جديد", description: "نحتاج تقرير مبيعات شهري تفصيلي حسب الفروع.", status: "OPEN", priority: "HIGH", updatedAt: daysAgo(1), createdAt: daysAgo(2), clientId: "c1", client: { user: { name: clients[0].user.name } }, agent: { name: "منسق الدعم" }, _count: { messages: 4 } },
  { id: "t2", ticketNumber: "TKT-1002", subject: "استفسار حول صلاحيات المستخدمين", description: "كيف يمكن تخصيص الصلاحيات؟", status: "IN_PROGRESS", priority: "NORMAL", updatedAt: daysAgo(1), createdAt: daysAgo(5), clientId: "c2", client: { user: { name: clients[1].user.name } }, agent: { name: "منسق الدعم" }, _count: { messages: 6 } },
  { id: "t3", ticketNumber: "TKT-1003", subject: "بطء في تحميل لوحة التحكم", description: "اللوحة تستغرق أكثر من 5 ثواني.", status: "CLOSED", priority: "HIGH", updatedAt: daysAgo(3), createdAt: daysAgo(10), clientId: "c3", client: { user: { name: clients[2].user.name } }, agent: { name: "منسق الدعم" }, _count: { messages: 8 } },
  { id: "t4", ticketNumber: "TKT-1004", subject: "طلب تغيير كلمة المرور", description: "نسيت كلمة المرور.", status: "WAITING_CLIENT", priority: "LOW", updatedAt: daysAgo(0), createdAt: daysAgo(1), clientId: "c5", client: { user: { name: clients[4].user.name } }, agent: null, _count: { messages: 2 } },
  { id: "t5", ticketNumber: "TKT-1005", subject: "توقف السيرفر عن العمل", description: "السيرفر لا يستجيب.", status: "OPEN", priority: "URGENT", updatedAt: daysAgo(0), createdAt: daysAgo(0), clientId: "c1", client: { user: { name: clients[0].user.name } }, agent: null, _count: { messages: 1 } },
];

// ============================================================================
// Payments — matches admin.payments.tsx: amount, method, status, transactionRef, paidAt, client{user{name}}, invoice{invoiceNumber}
// ============================================================================

type DemoPayment = {
  id: string; amount: string; method: string; status: string; transactionRef: string | null;
  paidAt: string | null; createdAt: string; clientId: string;
  client: { user: { name: string } }; invoice: { invoiceNumber: string } | null;
};
const payments: DemoPayment[] = [
  { id: "pay1", amount: "28750", method: "BANK_TRANSFER", status: "SUCCESS", transactionRef: "TRX-A9F72E1", paidAt: daysAgo(50), createdAt: daysAgo(50), clientId: "c1", client: { user: { name: clients[0].user.name } }, invoice: { invoiceNumber: "INV-2026-001" } },
  { id: "pay2", amount: "46000", method: "PAYLINK", status: "SUCCESS", transactionRef: "PL-88221XZ", paidAt: daysAgo(35), createdAt: daysAgo(35), clientId: "c2", client: { user: { name: clients[1].user.name } }, invoice: { invoiceNumber: "INV-2026-002" } },
  { id: "pay3", amount: "10000", method: "BANK_TRANSFER", status: "PENDING", transactionRef: "TRX-B14700", paidAt: null, createdAt: daysAgo(2), clientId: "c1", client: { user: { name: clients[0].user.name } }, invoice: { invoiceNumber: "INV-2026-003" } },
  { id: "pay4", amount: "13800", method: "PAYLINK", status: "SUCCESS", transactionRef: "PL-C0011H", paidAt: daysAgo(20), createdAt: daysAgo(20), clientId: "c5", client: { user: { name: clients[4].user.name } }, invoice: { invoiceNumber: "INV-2026-006" } },
  { id: "pay5", amount: "5000", method: "CASH", status: "SUCCESS", transactionRef: null, paidAt: daysAgo(0), createdAt: daysAgo(0), clientId: "c3", client: { user: { name: clients[2].user.name } }, invoice: null },
  { id: "pay6", amount: "17250", method: "MANUAL", status: "FAILED", transactionRef: "TRX-FAIL9", paidAt: null, createdAt: daysAgo(3), clientId: "c4", client: { user: { name: clients[3].user.name } }, invoice: { invoiceNumber: "INV-2026-005" } },
  { id: "pay7", amount: "2400", method: "PAYLINK", status: "REFUNDED", transactionRef: "PL-RF3311", paidAt: daysAgo(15), createdAt: daysAgo(15), clientId: "c2", client: { user: { name: clients[1].user.name } }, invoice: null },
];

// ============================================================================
// Files — matches admin.files.tsx: originalName, mimeType, size, path, createdAt, uploader{name}
// ============================================================================

type DemoFile = {
  id: string; originalName: string; mimeType: string; size: number; path: string; createdAt: string;
  uploader: { name: string }; project: { title: string } | null; contract: { contractNumber: string } | null;
};
const files: DemoFile[] = [
  { id: "f1", originalName: "مواصفات-المشروع.pdf", mimeType: "application/pdf", size: 245000, path: "#", createdAt: daysAgo(40), uploader: { name: "المدير التجريبي" }, project: { title: "منصة إدارة المخزون" }, contract: null },
  { id: "f2", originalName: "تصاميم-الواجهات.zip", mimeType: "application/zip", size: 1250000, path: "#", createdAt: daysAgo(25), uploader: { name: "منسق الدعم" }, project: { title: "متجر إلكتروني متكامل" }, contract: null },
  { id: "f3", originalName: "تقرير-التقدم.docx", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", size: 89000, path: "#", createdAt: daysAgo(10), uploader: { name: "المدير التجريبي" }, project: { title: "منصة إدارة المخزون" }, contract: null },
  { id: "f4", originalName: "عقد-موقع.pdf", mimeType: "application/pdf", size: 512000, path: "#", createdAt: daysAgo(45), uploader: { name: "المحاسب" }, project: null, contract: { contractNumber: "CON-2026-001" } },
  { id: "f5", originalName: "logo-final.png", mimeType: "image/png", size: 68000, path: "#", createdAt: daysAgo(5), uploader: { name: "منسق الدعم" }, project: null, contract: null },
  { id: "f6", originalName: "قاعدة-البيانات.sql", mimeType: "application/sql", size: 3400000, path: "#", createdAt: daysAgo(2), uploader: { name: "المدير التجريبي" }, project: { title: "لوحة تحكم تحليلية" }, contract: null },
];

// ============================================================================
// Users (staff) — matches admin.users.tsx: name, email, role, status, phone, lastLoginAt
// ============================================================================

type DemoStaff = { id: string; name: string; email: string; role: string; status: string; phone: string | null; lastLoginAt: string | null; createdAt: string; lastIpAddress: string | null };
const users: DemoStaff[] = [
  { id: "u_admin1", name: "علي القحطاني", email: "admin@ashholding.sa", role: "SUPER_ADMIN", status: "ACTIVE", phone: "+966500000001", lastLoginAt: daysAgo(0), createdAt: daysAgo(365), lastIpAddress: "212.107.192.10" },
  { id: "u_admin2", name: "منسق الدعم", email: "support@ashholding.sa", role: "SUPPORT", status: "ACTIVE", phone: "+966500000002", lastLoginAt: daysAgo(0), createdAt: daysAgo(180), lastIpAddress: "94.98.14.55" },
  { id: "u_admin3", name: "المحاسب", email: "accounting@ashholding.sa", role: "ACCOUNTANT", status: "ACTIVE", phone: "+966500000003", lastLoginAt: daysAgo(1), createdAt: daysAgo(120), lastIpAddress: "188.55.100.20" },
  { id: "u_admin4", name: "مدير الفريق", email: "manager@ashholding.sa", role: "ADMIN", status: "ACTIVE", phone: "+966500000004", lastLoginAt: daysAgo(2), createdAt: daysAgo(90), lastIpAddress: "212.107.192.11" },
  { id: "u_admin5", name: "موظف موقوف", email: "old@ashholding.sa", role: "SUPPORT", status: "DISABLED", phone: null, lastLoginAt: daysAgo(60), createdAt: daysAgo(300), lastIpAddress: null },
];

// ============================================================================
// Audit log
// ============================================================================

const auditLog = [
  { id: "a1", action: "USER_LOGIN", entityType: "User", entityId: "u_admin1", ipAddress: "212.107.192.10", createdAt: daysAgo(0), user: { name: "علي القحطاني", email: "admin@ashholding.sa", role: "SUPER_ADMIN" } },
  { id: "a2", action: "INVOICE_CREATE", entityType: "Invoice", entityId: "i7", ipAddress: "212.107.192.10", createdAt: daysAgo(0), user: { name: "علي القحطاني", email: "admin@ashholding.sa", role: "SUPER_ADMIN" } },
  { id: "a3", action: "CLIENT_VERIFIED", entityType: "Client", entityId: "c5", ipAddress: "212.107.192.10", createdAt: daysAgo(1), user: { name: "علي القحطاني", email: "admin@ashholding.sa", role: "SUPER_ADMIN" } },
  { id: "a4", action: "PAYMENT_MARKED", entityType: "Payment", entityId: "pay2", ipAddress: "188.55.100.20", createdAt: daysAgo(1), user: { name: "المحاسب", email: "accounting@ashholding.sa", role: "ACCOUNTANT" } },
  { id: "a5", action: "TICKET_REPLY", entityType: "Ticket", entityId: "t1", ipAddress: "94.98.14.55", createdAt: daysAgo(2), user: { name: "منسق الدعم", email: "support@ashholding.sa", role: "SUPPORT" } },
  { id: "a6", action: "PROJECT_UPDATE", entityType: "Project", entityId: "p1", ipAddress: "212.107.192.10", createdAt: daysAgo(3), user: { name: "علي القحطاني", email: "admin@ashholding.sa", role: "SUPER_ADMIN" } },
  { id: "a7", action: "USER_LOGIN_FAILED", entityType: "User", entityId: null, ipAddress: "45.155.204.10", createdAt: daysAgo(3), user: null },
  { id: "a8", action: "CONTRACT_SIGN", entityType: "Contract", entityId: "co1", ipAddress: "212.107.192.10", createdAt: daysAgo(45), user: { name: "علي القحطاني", email: "admin@ashholding.sa", role: "SUPER_ADMIN" } },
  { id: "a9", action: "FILE_UPLOAD", entityType: "File", entityId: "f6", ipAddress: "212.107.192.10", createdAt: daysAgo(2), user: { name: "علي القحطاني", email: "admin@ashholding.sa", role: "SUPER_ADMIN" } },
  { id: "a10", action: "USER_LOGOUT", entityType: "User", entityId: "u_admin2", ipAddress: "94.98.14.55", createdAt: daysAgo(1), user: { name: "منسق الدعم", email: "support@ashholding.sa", role: "SUPPORT" } },
];

// ============================================================================
// Notifications & settings
// ============================================================================

const notifications = [
  { id: "n1", title: "فاتورة جديدة", message: "تم إصدار الفاتورة INV-2026-004", read: false, createdAt: daysAgo(1) },
  { id: "n2", title: "تحديث المشروع", message: "تقدم مشروع 'منصة إدارة المخزون' إلى 65%", read: false, createdAt: daysAgo(3) },
  { id: "n3", title: "تذكرة دعم", message: "تم الرد على تذكرتك #t1", read: true, createdAt: daysAgo(5) },
];

const settings = {
  settings: {
    company: {
      nameAr: "ASH HOLDING - علي صالح الشهري القابضة",
      nameEn: "ASH HOLDING",
      crNumber: "1010223344",
      vatNumber: "300012345600003",
      phone: "+966500000000",
      email: "info@ashholding.sa",
      address: "الرياض، المملكة العربية السعودية",
    },
    billing: { currency: "SAR", taxRate: 15, invoicePrefix: "INV-2026-" },
    security: { twoFactor: true, sessionTimeoutMinutes: 60 },
  },
};

// ============================================================================
// Admin overview stats (existing shape used by admin.index.tsx / reports)
// ============================================================================

const monthNames = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو"];
const revenueMonths = [
  { month: "يناير", total: 45000, target: 60000, invoices: 4 },
  { month: "فبراير", total: 62000, target: 65000, invoices: 5 },
  { month: "مارس", total: 78000, target: 70000, invoices: 6 },
  { month: "أبريل", total: 91000, target: 80000, invoices: 7 },
  { month: "مايو", total: 85000, target: 90000, invoices: 6 },
  { month: "يونيو", total: 105000, target: 95000, invoices: 8 },
];

const sumNum = (arr: Array<{ total?: string; amount?: string; value?: string | null }>, key: "total" | "amount" | "value") =>
  arr.reduce((s, x) => s + Number((x as Record<string, string | null | undefined>)[key] || 0), 0);

const paidInv = invoices.filter((i) => i.status === "PAID");
const unpaidInv = invoices.filter((i) => i.status === "UNPAID");
const overdueInv = invoices.filter((i) => i.status === "OVERDUE");
const overdueAmount = sumNum(overdueInv, "total");
const monthRevenue = sumNum(paidInv, "total");

const adminStats = {
  cards: {
    clientsTotal: clients.length,
    activeProjects: projects.filter((p) => p.status === "DEVELOPMENT" || p.status === "PLANNING" || p.status === "TESTING").length,
    unpaidInvoices: unpaidInv.length + overdueInv.length,
    pendingContracts: contracts.filter((c) => c.status === "PENDING_SIGNATURE" || c.status === "SENT").length,
    openTickets: tickets.filter((t) => t.status !== "CLOSED").length,
    monthRevenue,
  },
  trends: { revenue: 12.4, clients: 8.3, projects: 4.2, invoices: -3.1, contracts: 0, tickets: -18.5 },
  sparks: {
    revenue: revenueMonths.map((m) => m.total),
    clients: [1, 2, 2, 3, 3, 4], projects: [1, 2, 2, 3, 4, 3],
    invoices: [2, 3, 2, 4, 3, 2], contracts: [0, 1, 1, 1, 2, 1], tickets: [3, 2, 2, 1, 2, 1],
  },
  kpis: {
    collectionsRate: Math.round((monthRevenue / (monthRevenue + overdueAmount + sumNum(unpaidInv, "total"))) * 100),
    avgProjectProgress: Math.round(projects.reduce((s, p) => s + p.progress, 0) / projects.length),
    newClientsThisMonth: 2, overdueAmount,
    activeContractsValue: sumNum(contracts.filter((c) => c.status === "SIGNED"), "value"),
    avgTicketResponseHours: 4.2,
  },
  revenueMonths,
  projectStatuses: [
    { status: "قيد التطوير", count: projects.filter((p) => p.status === "DEVELOPMENT").length },
    { status: "تخطيط", count: projects.filter((p) => p.status === "PLANNING").length },
    { status: "اختبار", count: projects.filter((p) => p.status === "TESTING").length },
    { status: "مكتمل", count: projects.filter((p) => p.status === "COMPLETED").length },
    { status: "متوقف", count: projects.filter((p) => p.status === "ON_HOLD").length },
  ],
  invoiceStatuses: [
    { status: "مدفوعة", count: paidInv.length, total: sumNum(paidInv, "total") },
    { status: "غير مدفوعة", count: unpaidInv.length, total: sumNum(unpaidInv, "total") },
    { status: "متأخرة", count: overdueInv.length, total: overdueAmount },
  ],
  topClients: clients.map((c) => {
    const inv = invoices.filter((i) => i.clientId === c.id && i.status === "PAID");
    const prj = projects.filter((p) => p.clientId === c.id);
    return { id: c.id, name: c.companyName, revenue: sumNum(inv, "total"), projects: prj.length };
  }).sort((a, b) => b.revenue - a.revenue).slice(0, 5),
  upcomingDeadlines: projects.filter((p) => p.status !== "COMPLETED")
    .map((p) => ({ id: p.id, name: p.title, client: p.client.user.name, dueDate: p.dueDate, progress: p.progress, status: p.status }))
    .slice(0, 5),
  alerts: [
    { type: "danger", message: `${overdueInv.length} فاتورة متأخرة بقيمة ${overdueAmount.toLocaleString("en-US")} ريال`, link: "/admin/invoices" },
    { type: "warning", message: `${contracts.filter((c) => c.status === "PENDING_SIGNATURE").length} عقد بانتظار التوقيع`, link: "/admin/contracts" },
    { type: "info", message: `${tickets.filter((t) => t.status === "OPEN").length} تذكرة دعم جديدة تحتاج للمراجعة`, link: "/admin/support" },
  ],
  recentClients: clients.slice(0, 5).map((c) => ({ id: c.id, companyName: c.companyName, createdAt: c.createdAt, user: { name: c.user.name, email: c.user.email } })),
  recentInvoices: invoices.slice(0, 5).map((i) => ({ id: i.id, invoiceNumber: i.invoiceNumber, total: i.total, status: i.status, client: { user: { name: i.client.user.name } } })),
  recentTickets: tickets.slice(0, 5).map((t) => ({ id: t.id, subject: t.subject, status: t.status, updatedAt: t.updatedAt, client: { user: { name: t.client.user.name } } })),
};

// ============================================================================
// Client-side overview (client.tsx dashboard)
// ============================================================================

const clientProjects = projects.filter((p) => p.clientId === "c1");
const clientInvoices = invoices.filter((i) => i.clientId === "c1");
const clientTickets = tickets.filter((t) => t.clientId === "c1");
const clientPaidTotal = sumNum(clientInvoices.filter((i) => i.status === "PAID"), "total");
const clientPendingTotal = sumNum(clientInvoices.filter((i) => i.status === "UNPAID"), "total");
const clientOverdueTotal = sumNum(clientInvoices.filter((i) => i.status === "OVERDUE"), "total");

const clientOverview = {
  stats: {
    activeProjects: clientProjects.filter((p) => p.status === "DEVELOPMENT" || p.status === "PLANNING").length,
    activeServices: services.filter((s) => s.clientId === "c1" && s.status === "ACTIVE").length,
    unpaidInvoices: clientInvoices.filter((i) => i.status !== "PAID").length,
    pendingContracts: contracts.filter((c) => c.clientId === "c1" && c.status !== "SIGNED").length,
    openTickets: clientTickets.filter((t) => t.status !== "CLOSED").length,
    unreadNotifications: notifications.filter((n) => !n.read).length,
  },
  trends: { projects: 25, invoices: -12.5, tickets: 0, notifications: 33.3 },
  sparks: { projects: [1, 1, 2, 2, 2, 2], invoices: [1, 2, 2, 3, 2, 2], tickets: [1, 0, 1, 1, 0, 1], notifications: [1, 2, 1, 3, 2, 3] },
  kpis: {
    totalSpent: clientPaidTotal, pendingAmount: clientPendingTotal, overdueAmount: clientOverdueTotal,
    avgResponseHours: 3.5, satisfactionScore: 92,
    projectsCompleted: clientProjects.filter((p) => p.status === "COMPLETED").length,
  },
  spendingMonths: monthNames.map((m, i) => ({ month: m, amount: [12000, 8500, 25000, 15000, 22000, 30000][i] })),
  projectProgress: clientProjects.map((p) => ({ id: p.id, name: p.title, progress: p.progress, status: p.status, dueDate: p.dueDate })),
  invoiceBreakdown: [
    { status: "مدفوعة", count: clientInvoices.filter((i) => i.status === "PAID").length, total: clientPaidTotal },
    { status: "غير مدفوعة", count: clientInvoices.filter((i) => i.status === "UNPAID").length, total: clientPendingTotal },
    { status: "متأخرة", count: clientInvoices.filter((i) => i.status === "OVERDUE").length, total: clientOverdueTotal },
  ],
  upcomingPayments: clientInvoices.filter((i) => i.status !== "PAID").map((i) => ({
    id: i.id, invoiceNumber: i.invoiceNumber, amount: Number(i.total), dueDate: i.dueAt || "",
    daysLeft: i.dueAt ? Math.ceil((new Date(i.dueAt).getTime() - Date.now()) / 86400000) : 0, status: i.status,
  })),
  recentActivity: [
    { type: "invoice", message: "تم إصدار فاتورة INV-2026-003 بقيمة 30,000 ريال", time: daysAgo(1) },
    { type: "project", message: "تحديث مشروع 'منصة إدارة المخزون' إلى 65%", time: daysAgo(3) },
    { type: "ticket", message: "تم الرد على تذكرة الدعم #t1", time: daysAgo(5) },
    { type: "contract", message: "تم توقيع عقد تطوير منصة المخزون", time: daysAgo(45) },
  ],
  recentProjects: clientProjects.slice(0, 4).map((p) => ({ id: p.id, name: p.title, status: p.status, progress: p.progress, updatedAt: p.startedAt })),
  recentFiles: files.slice(0, 4).map((f) => ({ id: f.id, originalName: f.originalName, size: f.size, createdAt: f.createdAt, path: f.path })),
};

// ============================================================================
// Helpers: paginate + filter + build list responses with stats
// ============================================================================

type Paged<T> = { rows: T[]; total: number; page: number; pageSize: number; items: T[]; stats?: unknown };

function pagedList<T>(rows: T[], url: string, stats?: unknown): Paged<T> {
  const params = new URLSearchParams(url.includes("?") ? url.split("?")[1] : "");
  const page = Math.max(1, Number(params.get("page") || 1));
  const pageSize = Math.max(1, Number(params.get("pageSize") || 20));
  const start = (page - 1) * pageSize;
  const paged = rows.slice(start, start + pageSize);
  return { rows: paged, items: paged, total: rows.length, page, pageSize, stats };
}

function textMatch(hay: string | null | undefined, q: string) {
  return (hay || "").toLowerCase().includes(q.toLowerCase());
}

function filterClients(url: string): DemoClient[] {
  const params = new URLSearchParams(url.includes("?") ? url.split("?")[1] : "");
  const q = (params.get("q") || "").trim().toLowerCase();
  const status = params.get("status");
  const verification = params.get("verification");
  return clients.filter((c) => {
    if (status && c.status !== status) return false;
    if (verification && c.verificationStatus !== verification) return false;
    if (!q) return true;
    return textMatch(c.companyName, q) || textMatch(c.user.name, q) || textMatch(c.user.email, q) || (c.phone || "").includes(q);
  });
}

// Aggregations (recomputed on demand so mutations reflect immediately)
const projectStats = () => ({
  total: projects.length,
  active: projects.filter((p) => ["DEVELOPMENT", "PLANNING", "TESTING", "DESIGN"].includes(p.status)).length,
  completed: projects.filter((p) => p.status === "COMPLETED").length,
  onHold: projects.filter((p) => p.status === "ON_HOLD").length,
  overdue: projects.filter((p) => p.dueDate && new Date(p.dueDate) < new Date() && p.status !== "COMPLETED").length,
  avgProgress: Math.round(projects.reduce((s, p) => s + p.progress, 0) / Math.max(1, projects.length)),
  totalBudget: projects.reduce((s, p) => s + Number(p.budget || 0), 0),
});
const serviceStats = () => ({
  total: services.length,
  active: services.filter((s) => s.status === "ACTIVE").length,
  awaiting: services.filter((s) => s.status === "AWAITING_PAYMENT").length,
  expired: services.filter((s) => s.status === "EXPIRED" || s.status === "SUSPENDED").length,
  monthlyRecurring: services.filter((s) => s.status === "ACTIVE").reduce((s, x) => s + Number(x.price || 0), 0),
});
const invoiceStats = () => ({
  total: invoices.length,
  paid: paidInv.length,
  unpaid: unpaidInv.length,
  overdue: overdueInv.length,
  paidAmount: sumNum(paidInv, "total"),
  unpaidAmount: sumNum(unpaidInv, "total"),
  overdueAmount,
});
const contractStats = () => ({
  total: contracts.length,
  signed: contracts.filter((c) => c.status === "SIGNED").length,
  pending: contracts.filter((c) => c.status === "PENDING_SIGNATURE" || c.status === "SENT").length,
  draft: contracts.filter((c) => c.status === "DRAFT").length,
  totalValue: sumNum(contracts.filter((c) => c.status === "SIGNED"), "value"),
});
const ticketStats = () => ({
  total: tickets.length,
  open: tickets.filter((t) => t.status === "OPEN").length,
  inProgress: tickets.filter((t) => t.status === "IN_PROGRESS").length,
  waiting: tickets.filter((t) => t.status === "WAITING_CLIENT").length,
  closed: tickets.filter((t) => t.status === "CLOSED").length,
  urgent: tickets.filter((t) => t.priority === "URGENT" || t.priority === "HIGH").length,
});
const paymentStats = () => ({
  total: payments.length,
  success: payments.filter((p) => p.status === "SUCCESS").length,
  pending: payments.filter((p) => p.status === "PENDING").length,
  failed: payments.filter((p) => p.status === "FAILED").length,
  refunded: payments.filter((p) => p.status === "REFUNDED").length,
  totalReceived: payments.filter((p) => p.status === "SUCCESS").reduce((s, x) => s + Number(x.amount), 0),
  todayReceived: payments.filter((p) => p.status === "SUCCESS" && p.paidAt && (Date.now() - new Date(p.paidAt).getTime()) < 86400000).reduce((s, x) => s + Number(x.amount), 0),
});
const fileStats = () => ({
  total: files.length,
  totalSize: files.reduce((s, f) => s + f.size, 0),
  images: files.filter((f) => f.mimeType.startsWith("image/")).length,
  documents: files.filter((f) => f.mimeType.includes("pdf") || f.mimeType.includes("document")).length,
  archives: files.filter((f) => f.mimeType.includes("zip") || f.mimeType.includes("rar")).length,
});
const userStats = () => ({
  total: users.length,
  active: users.filter((u) => u.status === "ACTIVE").length,
  disabled: users.filter((u) => u.status === "DISABLED").length,
  admins: users.filter((u) => u.role === "SUPER_ADMIN" || u.role === "ADMIN").length,
  loggedIn24h: users.filter((u) => u.lastLoginAt && (Date.now() - new Date(u.lastLoginAt).getTime()) < 86400000).length,
});
const auditStats = () => ({
  total: auditLog.length,
  today: auditLog.filter((a) => (Date.now() - new Date(a.createdAt).getTime()) < 86400000).length,
  critical: auditLog.filter((a) => a.action.includes("FAILED") || a.action.includes("DELETE")).length,
  logins: auditLog.filter((a) => a.action.includes("LOGIN")).length,
});
const clientStats = () => ({
  total: clients.length,
  active: clients.filter((c) => c.status === "ACTIVE").length,
  pending: clients.filter((c) => c.status === "PENDING").length,
  verified: clients.filter((c) => c.verificationStatus === "VERIFIED").length,
  unverified: clients.filter((c) => c.verificationStatus !== "VERIFIED").length,
  online: clients.reduce((s, c) => s + c.activeSessions, 0),
});

// ============================================================================
// Handlers
// ============================================================================

const handlers: Array<[RegExp, Handler]> = [
  [/^\/admin\/stats$/, () => adminStats],
  [/^\/admin\/audit-log$/, (u) => pagedList(auditLog, u, auditStats())],
  [/^\/admin\/clients$/, (u) => pagedList(filterClients(u), u, clientStats())],

  // Clients (main endpoint)
  [/^\/clients$/, (u, method, body) => {
    if (method === "POST") {
      const b = (body ?? {}) as Record<string, unknown>;
      const id = `c${Date.now()}`;
      const newClient = mkClient({
        id, companyName: (b.companyName as string) || null,
        commercialNumber: (b.commercialNumber as string) || null, taxNumber: (b.taxNumber as string) || null,
        phone: (b.phone as string) || null, contactEmail: (b.contactEmail as string) || (b.email as string) || null,
        address: (b.address as string) || null, city: (b.city as string) || null, country: (b.country as string) || "SA",
        status: "PENDING", verificationStatus: "UNVERIFIED", createdAt: now(), activeSessions: 0,
        user: {
          id: `u${Date.now()}`, name: (b.name as string) || "عميل جديد",
          email: (b.email as string) || `client${Date.now()}@demo.sa`,
          phone: (b.phone as string) || null, status: "ACTIVE", avatarUrl: null,
          lastLoginAt: null, lastIpAddress: null,
        },
      });
      clients.unshift(newClient);
      return { client: newClient };
    }
    return pagedList(filterClients(u), u, clientStats());
  }],
  [/^\/clients\/me$/, () => ({ client: clients[0] })],
  [/^\/clients\/me\/overview$/, () => clientOverview],
  [/^\/clients\/([^/]+)\/verify$/, (u, _m, body) => {
    const id = u.split("/")[2]; const c = clients.find((x) => x.id === id); if (!c) return null;
    const b = (body ?? {}) as { note?: string };
    c.verificationStatus = "VERIFIED"; c.verifiedAt = now();
    c.verifiedBy = { id: "admin1", name: "علي القحطاني" }; c.verificationNote = b.note ?? null;
    return { client: c };
  }],
  [/^\/clients\/([^/]+)\/unverify$/, (u, _m, body) => {
    const id = u.split("/")[2]; const c = clients.find((x) => x.id === id); if (!c) return null;
    const b = (body ?? {}) as { reject?: boolean; note?: string };
    c.verificationStatus = b.reject ? "REJECTED" : "UNVERIFIED";
    c.verifiedAt = null; c.verifiedBy = null; c.verificationNote = b.note ?? null;
    return { client: c };
  }],
  [/^\/clients\/([^/]+)\/refresh-geo$/, (u) => {
    const id = u.split("/")[2]; const c = clients.find((x) => x.id === id); if (!c) return null;
    c.lastSeenAt = now(); return { client: c };
  }],
  [/^\/clients\/([^/]+)$/, (u, method, body) => {
    const id = u.split("?")[0].split("/").pop(); const c = clients.find((x) => x.id === id); if (!c) return null;
    if (method === "PATCH") { Object.assign(c, body ?? {}); return { client: c }; }
    if (method === "DELETE") { c.status = "DISABLED"; c.user.status = "DISABLED"; return { ok: true }; }
    return { client: {
      ...c,
      projects: projects.filter((p) => p.clientId === id),
      invoices: invoices.filter((i) => i.clientId === id),
      services: services.filter((s) => s.clientId === id),
      contracts: contracts.filter((x) => x.clientId === id),
      tickets: tickets.filter((t) => t.clientId === id),
      payments: payments.filter((p) => p.clientId === id),
      files: [],
    } };
  }],

  // Projects
  [/^\/projects$/, (u, method, body) => {
    if (method === "POST") {
      const b = (body ?? {}) as Record<string, unknown>;
      const client = clients.find((c) => c.id === b.clientId) ?? clients[0];
      const np: DemoProject = {
        id: `p${Date.now()}`, title: (b.title as string) || "مشروع جديد",
        description: (b.description as string) || "", status: (b.status as string) || "NEW",
        progress: Number(b.progress ?? 0), budget: b.budget ? String(b.budget) : null,
        dueDate: (b.dueDate as string) || null, startedAt: now(), clientId: client.id, client: clientLite(client),
      };
      projects.unshift(np); return { project: np };
    }
    return pagedList(projects, u, projectStats());
  }],
  [/^\/projects\/([^/]+)$/, (u, method) => {
    const id = u.split("?")[0].split("/").pop(); const idx = projects.findIndex((p) => p.id === id);
    if (method === "DELETE" && idx >= 0) { projects.splice(idx, 1); return { ok: true }; }
    return projects[idx] ? { project: projects[idx] } : null;
  }],

  // Services
  [/^\/services$/, (u, method, body) => {
    if (method === "POST") {
      const b = (body ?? {}) as Record<string, unknown>;
      const client = clients.find((c) => c.id === b.clientId) ?? clients[0];
      const ns: DemoService = {
        id: `s${Date.now()}`, name: (b.name as string) || "خدمة", type: (b.type as string) || "OTHER",
        status: (b.status as string) || "ACTIVE", price: b.price ? String(b.price) : null,
        renewalDate: (b.renewalDate as string) || null, clientId: client.id,
        client: { user: { name: client.user.name } }, project: null,
      };
      services.unshift(ns); return { service: ns };
    }
    return pagedList(services, u, serviceStats());
  }],
  [/^\/services\/([^/]+)$/, (u, method) => {
    const id = u.split("?")[0].split("/").pop(); const idx = services.findIndex((s) => s.id === id);
    if (method === "DELETE" && idx >= 0) { services.splice(idx, 1); return { ok: true }; }
    return services[idx] ? { service: services[idx] } : null;
  }],

  // Invoices
  [/^\/invoices$/, (u, method, body) => {
    if (method === "POST") {
      const b = (body ?? {}) as Record<string, unknown>;
      const items = (b.items as Array<{ title: string; quantity: number; unitPrice: number }>) || [];
      const subtotal = items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
      const discount = Number(b.discount || 0);
      const taxRate = Number(b.taxRate ?? 15);
      const tax = +(Math.max(0, subtotal - discount) * (taxRate / 100)).toFixed(2);
      const total = +(Math.max(0, subtotal - discount) + tax).toFixed(2);
      const client = clients.find((c) => c.id === b.clientId) ?? clients[0];
      const ni: DemoInvoice = {
        id: `i${Date.now()}`, invoiceNumber: `INV-2026-${String(rand(100, 999))}`,
        status: "UNPAID", total: String(total), subtotal: String(subtotal), tax: String(tax),
        dueAt: (b.dueAt as string) || null, issuedAt: now(), clientId: client.id,
        client: { user: { name: client.user.name } },
      };
      invoices.unshift(ni); return { invoice: ni };
    }
    return pagedList(invoices, u, invoiceStats());
  }],
  [/^\/invoices\/([^/]+)\/mark-paid$/, (u) => {
    const id = u.split("/")[2]; const inv = invoices.find((i) => i.id === id);
    if (inv) inv.status = "PAID"; return { ok: true };
  }],
  [/^\/invoices\/([^/]+)$/, (u, method) => {
    const id = u.split("?")[0].split("/").pop(); const idx = invoices.findIndex((i) => i.id === id);
    if (method === "DELETE" && idx >= 0) { invoices.splice(idx, 1); return { ok: true }; }
    return invoices[idx] ? { invoice: invoices[idx] } : null;
  }],

  // Contracts
  [/^\/contracts$/, (u, method, body) => {
    if (method === "POST") {
      const b = (body ?? {}) as Record<string, unknown>;
      const client = clients.find((c) => c.id === b.clientId) ?? clients[0];
      const nc: DemoContract = {
        id: `co${Date.now()}`, contractNumber: `CON-2026-${String(rand(100, 999))}`,
        title: (b.title as string) || "عقد جديد", status: (b.status as string) || "DRAFT",
        value: b.value ? String(b.value) : null, signedAt: null,
        startsAt: (b.startsAt as string) || now(), endsAt: (b.endsAt as string) || null,
        clientId: client.id, client: { user: { name: client.user.name } },
      };
      contracts.unshift(nc); return { contract: nc };
    }
    return pagedList(contracts, u, contractStats());
  }],
  [/^\/contracts\/([^/]+)$/, (u, method) => {
    const id = u.split("?")[0].split("/").pop(); const idx = contracts.findIndex((c) => c.id === id);
    if (method === "DELETE" && idx >= 0) { contracts.splice(idx, 1); return { ok: true }; }
    return contracts[idx] ? { contract: contracts[idx] } : null;
  }],

  // Support tickets
  [/^\/support\/tickets$/, (u, method, body) => {
    if (method === "POST") {
      const b = (body ?? {}) as Record<string, unknown>;
      const client = clients.find((c) => c.id === b.clientId) ?? clients[0];
      const nt: DemoTicket = {
        id: `t${Date.now()}`, ticketNumber: `TKT-${rand(1100, 9999)}`,
        subject: (b.subject as string) || "تذكرة", description: (b.description as string) || "",
        status: "OPEN", priority: (b.priority as string) || "NORMAL",
        updatedAt: now(), createdAt: now(), clientId: client.id,
        client: { user: { name: client.user.name } }, agent: null, _count: { messages: 0 }, messages: [],
      };
      tickets.unshift(nt); return { ticket: nt };
    }
    return pagedList(tickets, u, ticketStats());
  }],
  [/^\/support\/tickets\/([^/]+)\/messages$/, (u, _m, body) => {
    const id = u.split("/")[3]; const t = tickets.find((x) => x.id === id); if (!t) return null;
    const b = (body ?? {}) as { message: string; isInternal?: boolean };
    const msg = { id: `m${Date.now()}`, message: b.message, isInternal: !!b.isInternal, createdAt: now(), sender: { id: "admin1", name: "علي القحطاني" } };
    t.messages = [...(t.messages ?? []), msg]; t._count.messages += 1; t.updatedAt = now();
    return { message: msg };
  }],
  [/^\/support\/tickets\/([^/]+)$/, (u, method, body) => {
    const id = u.split("?")[0].split("/").pop(); const t = tickets.find((x) => x.id === id); if (!t) return null;
    if (method === "PATCH") { Object.assign(t, body ?? {}); t.updatedAt = now(); return { ticket: t }; }
    return { ticket: t };
  }],

  // Payments
  [/^\/payments$/, (u, method, body) => {
    if (method === "POST") {
      const b = (body ?? {}) as Record<string, unknown>;
      const client = clients.find((c) => c.id === b.clientId) ?? clients[0];
      const np: DemoPayment = {
        id: `pay${Date.now()}`, amount: String(b.amount ?? 0),
        method: (b.method as string) || "MANUAL", status: (b.status as string) || "SUCCESS",
        transactionRef: (b.transactionRef as string) || null, paidAt: now(), createdAt: now(),
        clientId: client.id, client: { user: { name: client.user.name } }, invoice: null,
      };
      payments.unshift(np); return { payment: np };
    }
    return pagedList(payments, u, paymentStats());
  }],
  [/^\/payments\/([^/]+)$/, (u, method) => {
    const id = u.split("?")[0].split("/").pop(); const idx = payments.findIndex((p) => p.id === id);
    if (method === "DELETE" && idx >= 0) { payments.splice(idx, 1); return { ok: true }; }
    return payments[idx] ? { payment: payments[idx] } : null;
  }],

  // Files
  [/^\/files\/upload$/, () => {
    const nf: DemoFile = { id: `f${Date.now()}`, originalName: "ملف-مرفوع.pdf", mimeType: "application/pdf", size: rand(50000, 500000), path: "#", createdAt: now(), uploader: { name: "أدمن" }, project: null, contract: null };
    files.unshift(nf); return { file: nf };
  }],
  [/^\/files$/, (u) => pagedList(files, u, fileStats())],
  [/^\/files\/([^/]+)$/, (u, method) => {
    const id = u.split("?")[0].split("/").pop(); const idx = files.findIndex((f) => f.id === id);
    if (method === "DELETE" && idx >= 0) { files.splice(idx, 1); return { ok: true }; }
    return files[idx] ? { file: files[idx] } : null;
  }],

  // Users (staff)
  [/^\/users$/, (u, method, body) => {
    if (method === "POST") {
      const b = (body ?? {}) as Record<string, unknown>;
      const nu = { id: `u${Date.now()}`, name: (b.name as string) || "مستخدم", email: (b.email as string) || `user${Date.now()}@demo.sa`, role: (b.role as string) || "SUPPORT", status: "ACTIVE", phone: (b.phone as string) || null, lastLoginAt: null, createdAt: now(), lastIpAddress: null };
      users.unshift(nu); return { user: nu };
    }
    return pagedList(users, u, userStats());
  }],
  [/^\/users\/([^/]+)$/, (u, method) => {
    const id = u.split("?")[0].split("/").pop(); const usr = users.find((x) => x.id === id); if (!usr) return null;
    if (method === "DELETE") { usr.status = "DISABLED"; return { ok: true }; }
    return { user: usr };
  }],

  // Settings
  [/^\/settings$/, () => settings],
  [/^\/settings\/([^/]+)$/, (u, method, body) => {
    if (method === "PUT") {
      const key = u.split("/")[2] as keyof typeof settings.settings;
      const b = (body ?? {}) as { value: Record<string, unknown> };
      (settings.settings as Record<string, unknown>)[key] = { ...(settings.settings as Record<string, Record<string, unknown>>)[key], ...b.value };
      return { ok: true };
    }
    return settings;
  }],

  // Client views (client dashboard uses these)
  [/^\/client\/projects$/, (u) => pagedList(projects.filter((p) => p.clientId === "c1"), u)],
  [/^\/client\/files$/, (u) => pagedList(files.slice(0, 3), u)],
  [/^\/notifications$/, () => ({ items: notifications, total: notifications.length, unread: notifications.filter((n) => !n.read).length })],
  [/^\/notifications\/read-all$/, () => ({ ok: true })],

  [/^\/auth\/me$/, () => {
    if (typeof window === "undefined") return null;
    const raw = localStorage.getItem("ash_demo_user");
    return raw ? { user: JSON.parse(raw) } : null;
  }],
];

export function demoResolve(url: string, method: string, body?: unknown): unknown | undefined {
  const full = url.replace(/^https?:\/\/[^/]+/, "").replace(/^\/api/, "");
  const path = full.split("?")[0];
  for (const [re, fn] of handlers) {
    if (re.test(path)) {
      const result = fn(full, method, body);
      return result ?? { ok: true };
    }
  }
  if (method === "GET") return { rows: [], items: [], total: 0, page: 1, pageSize: 20 };
  return { ok: true };
}

export function isDemoMode(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem("ash_demo_user") !== null;
}
