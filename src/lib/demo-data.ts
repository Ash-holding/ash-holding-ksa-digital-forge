// Demo data used as a fallback when the backend API is unreachable
// (preview mode without deployed backend). Returns realistic sample data
// so all admin/client pages render without 404 errors.

type Handler = (url: string, method: string, body?: unknown) => unknown | undefined;

const now = () => new Date().toISOString();
const daysAgo = (n: number) => new Date(Date.now() - n * 86400000).toISOString();

const clients = [
  { id: "c1", companyName: "شركة الرياض للتقنية", contactName: "أحمد الشهري", email: "ahmed@riyadh-tech.sa", phone: "+966501112233", city: "الرياض", status: "ACTIVE", createdAt: daysAgo(90) },
  { id: "c2", companyName: "متجر جدة الإلكتروني", contactName: "سارة العتيبي", email: "sara@jeddah-shop.sa", phone: "+966502223344", city: "جدة", status: "ACTIVE", createdAt: daysAgo(60) },
  { id: "c3", companyName: "مؤسسة الدمام الرقمية", contactName: "خالد القحطاني", email: "khalid@dammam-digital.sa", phone: "+966503334455", city: "الدمام", status: "ACTIVE", createdAt: daysAgo(30) },
  { id: "c4", companyName: "شركة النور للاستثمار", contactName: "فهد الغامدي", email: "fahd@alnoor.sa", phone: "+966504445566", city: "الرياض", status: "PENDING", createdAt: daysAgo(10) },
];

const projects = [
  { id: "p1", name: "منصة إدارة المخزون", clientId: "c1", client: { companyName: clients[0].companyName }, status: "IN_PROGRESS", progress: 65, budget: 85000, startDate: daysAgo(45), dueDate: daysAgo(-30) },
  { id: "p2", name: "متجر إلكتروني متكامل", clientId: "c2", client: { companyName: clients[1].companyName }, status: "IN_PROGRESS", progress: 40, budget: 120000, startDate: daysAgo(30), dueDate: daysAgo(-45) },
  { id: "p3", name: "تطبيق جوال للحجوزات", clientId: "c3", client: { companyName: clients[2].companyName }, status: "PLANNING", progress: 15, budget: 95000, startDate: daysAgo(10), dueDate: daysAgo(-90) },
  { id: "p4", name: "موقع تعريفي وهوية", clientId: "c1", client: { companyName: clients[0].companyName }, status: "COMPLETED", progress: 100, budget: 35000, startDate: daysAgo(120), dueDate: daysAgo(30) },
  { id: "p5", name: "نظام إدارة العملاء CRM", clientId: "c4", client: { companyName: clients[3].companyName }, status: "PLANNING", progress: 5, budget: 150000, startDate: daysAgo(3), dueDate: daysAgo(-120) },
];

const invoices = [
  { id: "i1", number: "INV-2026-001", clientId: "c1", client: { companyName: clients[0].companyName }, amount: 25000, currency: "SAR", status: "PAID", issueDate: daysAgo(60), dueDate: daysAgo(45) },
  { id: "i2", number: "INV-2026-002", clientId: "c2", client: { companyName: clients[1].companyName }, amount: 40000, currency: "SAR", status: "PAID", issueDate: daysAgo(45), dueDate: daysAgo(30) },
  { id: "i3", number: "INV-2026-003", clientId: "c1", client: { companyName: clients[0].companyName }, amount: 30000, currency: "SAR", status: "PENDING", issueDate: daysAgo(15), dueDate: daysAgo(-5) },
  { id: "i4", number: "INV-2026-004", clientId: "c3", client: { companyName: clients[2].companyName }, amount: 55000, currency: "SAR", status: "PENDING", issueDate: daysAgo(7), dueDate: daysAgo(-15) },
  { id: "i5", number: "INV-2026-005", clientId: "c4", client: { companyName: clients[3].companyName }, amount: 15000, currency: "SAR", status: "OVERDUE", issueDate: daysAgo(90), dueDate: daysAgo(60) },
];

const payments = [
  { id: "pay1", invoiceId: "i1", amount: 25000, currency: "SAR", method: "BANK_TRANSFER", status: "COMPLETED", paidAt: daysAgo(50) },
  { id: "pay2", invoiceId: "i2", amount: 40000, currency: "SAR", method: "MADA", status: "COMPLETED", paidAt: daysAgo(35) },
  { id: "pay3", invoiceId: "i3", amount: 10000, currency: "SAR", method: "BANK_TRANSFER", status: "PENDING", paidAt: daysAgo(2) },
];

const contracts = [
  { id: "co1", title: "عقد تطوير منصة المخزون", clientId: "c1", client: { companyName: clients[0].companyName }, status: "SIGNED", value: 85000, startDate: daysAgo(45), endDate: daysAgo(-90) },
  { id: "co2", title: "عقد تطوير متجر إلكتروني", clientId: "c2", client: { companyName: clients[1].companyName }, status: "SIGNED", value: 120000, startDate: daysAgo(30), endDate: daysAgo(-150) },
  { id: "co3", title: "عقد صيانة سنوي", clientId: "c3", client: { companyName: clients[2].companyName }, status: "PENDING", value: 24000, startDate: daysAgo(5), endDate: daysAgo(-360) },
];

const tickets = [
  { id: "t1", subject: "طلب إضافة تقرير مبيعات جديد", clientId: "c1", client: { companyName: clients[0].companyName }, priority: "HIGH", status: "OPEN", createdAt: daysAgo(2), lastReplyAt: daysAgo(1) },
  { id: "t2", subject: "استفسار حول صلاحيات المستخدمين", clientId: "c2", client: { companyName: clients[1].companyName }, priority: "MEDIUM", status: "IN_PROGRESS", createdAt: daysAgo(5), lastReplyAt: daysAgo(1) },
  { id: "t3", subject: "بطء في تحميل لوحة التحكم", clientId: "c3", client: { companyName: clients[2].companyName }, priority: "HIGH", status: "RESOLVED", createdAt: daysAgo(10), lastReplyAt: daysAgo(3) },
];

const files = [
  { id: "f1", name: "مواصفات-المشروع.pdf", size: 245000, mimeType: "application/pdf", clientId: "c1", projectId: "p1", uploadedAt: daysAgo(40), url: "#" },
  { id: "f2", name: "تصاميم-الواجهات.zip", size: 1250000, mimeType: "application/zip", clientId: "c2", projectId: "p2", uploadedAt: daysAgo(25), url: "#" },
  { id: "f3", name: "تقرير-التقدم.docx", size: 89000, mimeType: "application/vnd.openxmlformats", clientId: "c1", projectId: "p1", uploadedAt: daysAgo(10), url: "#" },
];

const users = [
  { id: "u1", name: "المدير التجريبي", email: "admin@ashholding.sa", role: "SUPER_ADMIN", status: "ACTIVE", createdAt: daysAgo(365) },
  { id: "u2", name: "منسق الدعم", email: "support@ashholding.sa", role: "SUPPORT", status: "ACTIVE", createdAt: daysAgo(180) },
  { id: "u3", name: "المحاسب", email: "accounting@ashholding.sa", role: "ACCOUNTANT", status: "ACTIVE", createdAt: daysAgo(120) },
];

const services = [
  { id: "s1", name: "تطوير مواقع", basePrice: 15000, active: true },
  { id: "s2", name: "تطبيقات جوال", basePrice: 35000, active: true },
  { id: "s3", name: "أنظمة إدارية", basePrice: 55000, active: true },
  { id: "s4", name: "استضافة وسيرفرات", basePrice: 3000, active: true },
];

const notifications = [
  { id: "n1", title: "فاتورة جديدة", message: "تم إصدار الفاتورة INV-2026-004", read: false, createdAt: daysAgo(1) },
  { id: "n2", title: "تحديث المشروع", message: "تقدم مشروع 'منصة إدارة المخزون' إلى 65%", read: false, createdAt: daysAgo(3) },
  { id: "n3", title: "تذكرة دعم", message: "تم الرد على تذكرتك #t1", read: true, createdAt: daysAgo(5) },
];

const auditLog = [
  { id: "a1", actor: "admin@ashholding.sa", action: "LOGIN", target: "-", createdAt: daysAgo(0) },
  { id: "a2", actor: "admin@ashholding.sa", action: "CREATE_INVOICE", target: "INV-2026-005", createdAt: daysAgo(1) },
  { id: "a3", actor: "support@ashholding.sa", action: "REPLY_TICKET", target: "t1", createdAt: daysAgo(2) },
  { id: "a4", actor: "admin@ashholding.sa", action: "UPDATE_PROJECT", target: "p1", createdAt: daysAgo(3) },
];

const monthNames = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو"];
const revenueMonths = [
  { month: "يناير", total: 45000, target: 60000, invoices: 4 },
  { month: "فبراير", total: 62000, target: 65000, invoices: 5 },
  { month: "مارس", total: 78000, target: 70000, invoices: 6 },
  { month: "أبريل", total: 91000, target: 80000, invoices: 7 },
  { month: "مايو", total: 85000, target: 90000, invoices: 6 },
  { month: "يونيو", total: 105000, target: 95000, invoices: 8 },
];

const paidInvoices = invoices.filter((i) => i.status === "PAID");
const pendingInvoicesArr = invoices.filter((i) => i.status === "PENDING");
const overdueInvoicesArr = invoices.filter((i) => i.status === "OVERDUE");
const monthRevenue = paidInvoices.reduce((s, i) => s + i.amount, 0);
const overdueAmount = overdueInvoicesArr.reduce((s, i) => s + i.amount, 0);
const activeContractsValue = contracts.filter((c) => c.status === "SIGNED").reduce((s, c) => s + c.value, 0);
const avgProjectProgress = Math.round(projects.reduce((s, p) => s + p.progress, 0) / projects.length);
const collectionsRate = Math.round((monthRevenue / (monthRevenue + overdueAmount + pendingInvoicesArr.reduce((s, i) => s + i.amount, 0))) * 100);

const adminStats = {
  cards: {
    clientsTotal: clients.length,
    activeProjects: projects.filter((p) => p.status === "IN_PROGRESS").length,
    unpaidInvoices: pendingInvoicesArr.length + overdueInvoicesArr.length,
    pendingContracts: contracts.filter((c) => c.status === "PENDING").length,
    openTickets: tickets.filter((t) => t.status !== "RESOLVED").length,
    monthRevenue,
  },
  trends: {
    revenue: 12.4,
    clients: 8.3,
    projects: 4.2,
    invoices: -3.1,
    contracts: 0,
    tickets: -18.5,
  },
  sparks: {
    revenue: revenueMonths.map((m) => m.total),
    clients: [1, 2, 2, 3, 3, 4],
    projects: [1, 2, 2, 3, 4, 3],
    invoices: [2, 3, 2, 4, 3, 2],
    contracts: [0, 1, 1, 1, 2, 1],
    tickets: [3, 2, 2, 1, 2, 1],
  },
  kpis: {
    collectionsRate,
    avgProjectProgress,
    newClientsThisMonth: 2,
    overdueAmount,
    activeContractsValue,
    avgTicketResponseHours: 4.2,
  },
  revenueMonths,
  projectStatuses: [
    { status: "قيد التنفيذ", count: projects.filter((p) => p.status === "IN_PROGRESS").length },
    { status: "تخطيط", count: projects.filter((p) => p.status === "PLANNING").length },
    { status: "مكتمل", count: projects.filter((p) => p.status === "COMPLETED").length },
  ],
  invoiceStatuses: [
    { status: "مدفوعة", count: paidInvoices.length, total: paidInvoices.reduce((s, i) => s + i.amount, 0) },
    { status: "معلقة", count: pendingInvoicesArr.length, total: pendingInvoicesArr.reduce((s, i) => s + i.amount, 0) },
    { status: "متأخرة", count: overdueInvoicesArr.length, total: overdueAmount },
  ],
  topClients: clients.map((c) => {
    const clInv = invoices.filter((i) => i.clientId === c.id && i.status === "PAID");
    const clProj = projects.filter((p) => p.clientId === c.id);
    return {
      id: c.id,
      name: c.companyName,
      revenue: clInv.reduce((s, i) => s + i.amount, 0),
      projects: clProj.length,
    };
  }).sort((a, b) => b.revenue - a.revenue).slice(0, 5),
  upcomingDeadlines: projects
    .filter((p) => p.status !== "COMPLETED")
    .map((p) => ({
      id: p.id,
      name: p.name,
      client: p.client.companyName,
      dueDate: p.dueDate,
      progress: p.progress,
      status: p.status,
    }))
    .slice(0, 5),
  alerts: [
    { type: "danger", message: `${overdueInvoicesArr.length} فاتورة متأخرة بقيمة ${overdueAmount.toLocaleString("ar-SA")} ريال`, link: "/admin/invoices" },
    { type: "warning", message: `${contracts.filter((c) => c.status === "PENDING").length} عقد بانتظار التوقيع`, link: "/admin/contracts" },
    { type: "info", message: `${tickets.filter((t) => t.status === "OPEN").length} تذكرة دعم جديدة تحتاج للمراجعة`, link: "/admin/support" },
  ],
  recentClients: clients.slice(0, 5).map((c) => ({
    id: c.id,
    companyName: c.companyName,
    createdAt: c.createdAt,
    user: { name: c.contactName, email: c.email },
  })),
  recentInvoices: invoices.slice(0, 5).map((i) => ({
    id: i.id,
    invoiceNumber: i.number,
    total: i.amount,
    status: i.status,
    client: { user: { name: clients.find((c) => c.id === i.clientId)?.contactName ?? "—" } },
  })),
  recentTickets: tickets.slice(0, 5).map((t) => ({
    id: t.id,
    subject: t.subject,
    status: t.status,
    updatedAt: t.lastReplyAt,
    client: { user: { name: clients.find((c) => c.id === t.clientId)?.contactName ?? "—" } },
  })),
};

const clientProjects = projects.filter((p) => p.clientId === "c1");
const clientInvoices = invoices.filter((i) => i.clientId === "c1");
const clientTickets = tickets.filter((t) => t.clientId === "c1");
const clientPaidTotal = clientInvoices.filter((i) => i.status === "PAID").reduce((s, i) => s + i.amount, 0);
const clientPendingTotal = clientInvoices.filter((i) => i.status === "PENDING").reduce((s, i) => s + i.amount, 0);
const clientOverdueTotal = clientInvoices.filter((i) => i.status === "OVERDUE").reduce((s, i) => s + i.amount, 0);

const clientOverview = {
  stats: {
    activeProjects: clientProjects.filter((p) => p.status === "IN_PROGRESS").length,
    activeServices: 3,
    unpaidInvoices: clientInvoices.filter((i) => i.status !== "PAID").length,
    pendingContracts: contracts.filter((c) => c.clientId === "c1" && c.status === "PENDING").length,
    openTickets: clientTickets.filter((t) => t.status !== "RESOLVED").length,
    unreadNotifications: notifications.filter((n) => !n.read).length,
  },
  trends: { projects: 25, invoices: -12.5, tickets: 0, notifications: 33.3 },
  sparks: {
    projects: [1, 1, 2, 2, 2, 2],
    invoices: [1, 2, 2, 3, 2, 2],
    tickets: [1, 0, 1, 1, 0, 1],
    notifications: [1, 2, 1, 3, 2, 3],
  },
  kpis: {
    totalSpent: clientPaidTotal,
    pendingAmount: clientPendingTotal,
    overdueAmount: clientOverdueTotal,
    avgResponseHours: 3.5,
    satisfactionScore: 92,
    projectsCompleted: clientProjects.filter((p) => p.status === "COMPLETED").length,
  },
  spendingMonths: [
    { month: monthNames[0], amount: 12000 },
    { month: monthNames[1], amount: 8500 },
    { month: monthNames[2], amount: 25000 },
    { month: monthNames[3], amount: 15000 },
    { month: monthNames[4], amount: 22000 },
    { month: monthNames[5], amount: 30000 },
  ],
  projectProgress: clientProjects.map((p) => ({ id: p.id, name: p.name, progress: p.progress, status: p.status, dueDate: p.dueDate })),
  invoiceBreakdown: [
    { status: "مدفوعة", count: clientInvoices.filter((i) => i.status === "PAID").length, total: clientPaidTotal },
    { status: "معلقة", count: clientInvoices.filter((i) => i.status === "PENDING").length, total: clientPendingTotal },
    { status: "متأخرة", count: clientInvoices.filter((i) => i.status === "OVERDUE").length, total: clientOverdueTotal },
  ],
  upcomingPayments: clientInvoices
    .filter((i) => i.status !== "PAID")
    .map((i) => ({
      id: i.id,
      invoiceNumber: i.number,
      amount: i.amount,
      dueDate: i.dueDate,
      daysLeft: Math.ceil((new Date(i.dueDate).getTime() - Date.now()) / 86400000),
      status: i.status,
    })),
  recentActivity: [
    { type: "invoice", message: "تم إصدار فاتورة INV-2026-003 بقيمة 30,000 ريال", time: daysAgo(1) },
    { type: "project", message: "تحديث مشروع 'منصة إدارة المخزون' إلى 65%", time: daysAgo(3) },
    { type: "ticket", message: "تم الرد على تذكرة الدعم #t1", time: daysAgo(5) },
    { type: "contract", message: "تم توقيع عقد تطوير منصة المخزون", time: daysAgo(45) },
  ],
  recentProjects: clientProjects.slice(0, 4).map((p) => ({
    id: p.id,
    name: p.name,
    status: p.status,
    progress: p.progress,
    updatedAt: p.startDate,
  })),
  recentFiles: files.filter((f) => f.clientId === "c1").slice(0, 4).map((f) => ({
    id: f.id,
    originalName: f.name,
    size: f.size,
    createdAt: f.uploadedAt,
    path: f.url,
  })),
};


const settings = {
  companyName: "ASH HOLDING - شركة علي صالح الشهري القابضة",
  email: "info@ashholding.sa",
  phone: "+966500000000",
  currency: "SAR",
  taxRate: 15,
  invoicePrefix: "INV-2026-",
  timezone: "Asia/Riyadh",
};

const handlers: Array<[RegExp, Handler]> = [
  [/^\/admin\/stats$/, () => adminStats],
  [/^\/admin\/clients$/, () => ({ items: clients, total: clients.length })],
  [/^\/admin\/clients\/([^/]+)$/, (u) => {
    const id = u.split("/").pop();
    const c = clients.find((x) => x.id === id);
    return c ? { ...c, projects: projects.filter((p) => p.clientId === id), invoices: invoices.filter((i) => i.clientId === id) } : null;
  }],
  [/^\/admin\/projects$/, () => ({ items: projects, total: projects.length })],
  [/^\/admin\/invoices$/, () => ({ items: invoices, total: invoices.length })],
  [/^\/admin\/support$/, () => ({ items: tickets, total: tickets.length })],
  [/^\/admin\/audit-log$/, () => ({ items: auditLog, total: auditLog.length })],
  [/^\/clients$/, () => ({ items: clients, total: clients.length })],
  [/^\/clients\/me$/, () => clients[0]],
  [/^\/clients\/me\/overview$/, () => clientOverview],
  [/^\/projects$/, () => ({ items: projects, total: projects.length })],
  [/^\/invoices$/, () => ({ items: invoices, total: invoices.length })],
  [/^\/payments$/, () => ({ items: payments, total: payments.length })],
  [/^\/contracts$/, () => ({ items: contracts, total: contracts.length })],
  [/^\/support\/tickets$/, () => ({ items: tickets, total: tickets.length })],
  [/^\/files$/, () => ({ items: files, total: files.length })],
  [/^\/files\/upload$/, () => ({ id: `f${Date.now()}`, url: "#", uploadedAt: now() })],
  [/^\/client\/projects$/, () => ({ items: projects.filter((p) => p.clientId === "c1"), total: 2 })],
  [/^\/client\/files$/, () => ({ items: files.filter((f) => f.clientId === "c1"), total: 2 })],
  [/^\/users$/, () => ({ items: users, total: users.length })],
  [/^\/services$/, () => ({ items: services, total: services.length })],
  [/^\/settings$/, () => settings],
  [/^\/notifications$/, () => ({ items: notifications, total: notifications.length, unread: notifications.filter((n) => !n.read).length })],
  [/^\/notifications\/read-all$/, () => ({ ok: true })],
  [/^\/auth\/me$/, () => {
    if (typeof window === "undefined") return null;
    const raw = localStorage.getItem("ash_demo_user");
    return raw ? { user: JSON.parse(raw) } : null;
  }],
];

export function demoResolve(url: string, method: string, body?: unknown): unknown | undefined {
  // normalize: strip baseURL prefix and query string
  const path = url.replace(/^https?:\/\/[^/]+/, "").replace(/^\/api/, "").split("?")[0];
  for (const [re, fn] of handlers) {
    if (re.test(path)) {
      const result = fn(path, method, body);
      return result ?? { ok: true };
    }
  }
  // Generic fallback for unknown GETs → empty list
  if (method === "GET") return { items: [], total: 0 };
  // Non-GETs succeed silently
  return { ok: true };
}

export function isDemoMode(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem("ash_demo_user") !== null;
}
