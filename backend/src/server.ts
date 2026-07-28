import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import path from "node:path";
import fs from "node:fs";

import { authRouter } from "./routes/auth.js";
import { clientsRouter } from "./routes/clients.js";
import { projectsRouter } from "./routes/projects.js";
import { servicesRouter } from "./routes/services.js";
import { invoicesRouter } from "./routes/invoices.js";
import { verifyRouter } from "./routes/verify.js";
import { contractsRouter } from "./routes/contracts.js";
import { supportRouter } from "./routes/support.js";
import { paymentsRouter } from "./routes/payments.js";
import { filesRouter } from "./routes/files.js";
import { usersRouter } from "./routes/users.js";
import { adminRouter } from "./routes/admin.js";
import { settingsRouter } from "./routes/settings.js";
import { notificationsRouter } from "./routes/notifications.js";
import { whatsappRouter } from "./routes/whatsapp.js";
import { walletRouter } from "./routes/wallet.js";
import { trackRouter } from "./routes/track.js";
import { affiliateRouter } from "./routes/affiliate.js";
import { affiliateAdminRouter } from "./routes/affiliate-admin.js";
import { financingRouter } from "./routes/financing.js";
import { financingAdminRouter } from "./routes/financing-admin.js";
import { financingApplicationsRouter } from "./routes/financing-applications.js";
import { financingApplicationsAdminRouter } from "./routes/financing-applications-admin.js";
import { financingContractsRouter } from "./routes/financing-contracts.js";
import { financingOpsRouter, financingOpsPublicRouter } from "./routes/financing-ops.js";
import { errorHandler, notFoundHandler } from "./middleware/error.js";
import { apiLimiter } from "./middleware/rate-limit.js";

const app = express();
app.set("trust proxy", 1);

app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(",").map((s) => s.trim()) ?? true,
  credentials: true,
}));
app.use(express.json({ limit: "2mb" }));
app.use(cookieParser(process.env.COOKIE_SECRET));
if (process.env.NODE_ENV !== "test") app.use(morgan("combined"));

// Uploads (mounted volume in Docker)
const uploadDir = path.resolve(process.env.UPLOAD_DIR || "./uploads");
fs.mkdirSync(uploadDir, { recursive: true });
app.use("/uploads", express.static(uploadDir, { maxAge: "7d", index: false }));

app.get("/health", (_req, res) => res.json({ ok: true, service: "ash-holding-api", ts: new Date().toISOString() }));

// Public + auth
app.use("/api/auth", authRouter);
app.use("/api/whatsapp", whatsappRouter);
app.use("/api/verify", verifyRouter); // public — receipt/invoice verification
app.use("/api/track", trackRouter);   // public — affiliate click/attribution tracking
app.use("/api/financing", financingRouter); // public read-only financing info (products, quote)

// General API rate limit for everything below
app.use("/api", apiLimiter);

app.use("/api/admin", adminRouter);           // stats + audit-log
app.use("/api/clients", clientsRouter);
app.use("/api/projects", projectsRouter);
app.use("/api/services", servicesRouter);
app.use("/api/invoices", invoicesRouter);
app.use("/api/contracts", contractsRouter);
app.use("/api/support", supportRouter);
app.use("/api/payments", paymentsRouter);
app.use("/api/files", filesRouter);
app.use("/api/users", usersRouter);
app.use("/api/settings", settingsRouter);
app.use("/api/notifications", notificationsRouter);
app.use("/api/wallet", walletRouter);
app.use("/api/affiliate", affiliateRouter);
app.use("/api/admin/affiliate", affiliateAdminRouter);
app.use("/api/financing/applications", financingApplicationsRouter);
app.use("/api/admin/financing/applications", financingApplicationsAdminRouter);
app.use("/api/admin/financing", financingAdminRouter);
app.use("/api/financing", financingContractsRouter);

app.use("/api", notFoundHandler);
app.use(errorHandler);

const port = Number(process.env.PORT || 4000);
app.listen(port, () => {
  console.log(`ASH HOLDING API listening on :${port}`);
  console.log(`Uploads directory: ${uploadDir}`);
});
