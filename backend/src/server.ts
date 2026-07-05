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
import { invoicesRouter } from "./routes/invoices.js";
import { contractsRouter } from "./routes/contracts.js";
import { supportRouter } from "./routes/support.js";
import { filesRouter } from "./routes/files.js";
import { errorHandler } from "./middleware/error.js";

const app = express();

app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(cors({ origin: process.env.CORS_ORIGIN?.split(",") ?? true, credentials: true }));
app.use(express.json({ limit: "2mb" }));
app.use(cookieParser(process.env.COOKIE_SECRET));
app.use(morgan("combined"));

// Ensure upload dir exists and expose as static
const uploadDir = path.resolve(process.env.UPLOAD_DIR || "./uploads");
fs.mkdirSync(uploadDir, { recursive: true });
app.use("/uploads", express.static(uploadDir, { maxAge: "7d", index: false }));

app.get("/health", (_req, res) => res.json({ ok: true, service: "ash-holding-api" }));

app.use("/api/auth", authRouter);
app.use("/api/clients", clientsRouter);
app.use("/api/projects", projectsRouter);
app.use("/api/invoices", invoicesRouter);
app.use("/api/contracts", contractsRouter);
app.use("/api/support", supportRouter);
app.use("/api/files", filesRouter);

app.use(errorHandler);

const port = Number(process.env.PORT || 4000);
app.listen(port, () => {
  console.log(`ASH HOLDING API listening on :${port}`);
  console.log(`Uploads directory: ${uploadDir}`);
});
