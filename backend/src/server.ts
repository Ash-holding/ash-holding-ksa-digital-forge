import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import { authRouter } from "./routes/auth.js";
import { clientRouter } from "./routes/client.js";
import { adminRouter } from "./routes/admin.js";
import { errorHandler } from "./middleware/error.js";

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN?.split(",") ?? true, credentials: true }));
app.use(express.json({ limit: "2mb" }));
app.use(cookieParser(process.env.COOKIE_SECRET));
app.use(morgan("combined"));

app.get("/health", (_req, res) => res.json({ ok: true, service: "ash-holding-api" }));

app.use("/api/auth", authRouter);
app.use("/api/client", clientRouter);
app.use("/api/admin", adminRouter);

app.use(errorHandler);

const port = Number(process.env.PORT || 4000);
app.listen(port, () => {
  console.log(`ASH HOLDING API listening on :${port}`);
});
