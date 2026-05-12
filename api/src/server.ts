import "dotenv/config";
import { createServer } from "http";
import express, { type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import { ZodError } from "zod";
import { connectDB } from "./lib/db";
import { HttpError } from "./lib/errors";
import { authRouter } from "./routes/auth";
import { meRouter } from "./routes/me";
import { onboardingRouter } from "./routes/onboarding";
import { patientRouter } from "./routes/patient";
import { doctorRouter } from "./routes/doctor";
import { adminRouter } from "./routes/admin";
import { chatRouter } from "./routes/chat";
import { attachSocket } from "./socket";

const app = express();
const PORT = Number(process.env.PORT ?? 4000);
const WEB_ORIGIN = process.env.WEB_ORIGIN ?? "http://localhost:3000";

app.use(helmet());
app.use(
  cors({
    origin:
      process.env.NODE_ENV === "production"
        ? WEB_ORIGIN
        : (origin, cb) => {
            if (!origin) return cb(null, true);
            if (/^http:\/\/localhost(:\d+)?$/.test(origin)) return cb(null, true);
            return cb(new Error(`CORS: origin ${origin} not allowed`));
          },
    credentials: true,
  })
);
app.use(cookieParser());
app.use(express.json({ limit: "1mb" }));
app.use(morgan("dev"));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "bolchall-api", timestamp: Date.now() });
});

app.use("/api/auth", authRouter);
app.use("/api/me", meRouter);
app.use("/api/onboarding", onboardingRouter);
app.use("/api/patient", patientRouter);
app.use("/api/doctor", doctorRouter);
app.use("/api/admin", adminRouter);
app.use("/api/chat", chatRouter);

app.use((_req, res) => {
  res.status(404).json({ ok: false, error: { code: "NOT_FOUND", message: "Route not found" } });
});

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof ZodError) {
    return res.status(400).json({
      ok: false,
      error: {
        code: "VALIDATION",
        message: err.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
      },
    });
  }
  if (err instanceof HttpError) {
    return res.status(err.status).json({
      ok: false,
      error: { code: err.code, message: err.message },
    });
  }
  console.error("[api] unhandled error:", err);
  res.status(500).json({
    ok: false,
    error: { code: "INTERNAL", message: "Internal server error" },
  });
});

async function start() {
  await connectDB();
  const httpServer = createServer(app);
  attachSocket(httpServer);
  httpServer.listen(PORT, () => {
    console.log(`[api] listening on http://localhost:${PORT} (HTTP + Socket.io)`);
  });
}

start().catch((err) => {
  console.error("[api] fatal:", err);
  process.exit(1);
});
