import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "./config/env.js";
import authRoutes from "./routes/auth.js";
import billingRoutes, { stripeWebhook } from "./routes/billing.js";
import threadRoutes from "./routes/threads.js";
import { errorHandler } from "./middleware/error.js";

const app = express();

const readSupabaseProjectRef = (value: string | undefined) => {
  if (!value) return null;

  try {
    const url = value.startsWith("postgresql://") ? new URL(value) : new URL(value);
    const projectFromHost = url.hostname.match(/(?:^|\.)db\.([a-z0-9]{20})\.supabase\.co$/)?.[1];
    const projectFromUser = decodeURIComponent(url.username).match(/^postgres\.([a-z0-9]{20})$/)?.[1];
    return projectFromHost ?? projectFromUser ?? null;
  } catch {
    return null;
  }
};

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
  })
);
app.use(
  cors({
    origin: env.FRONTEND_URL,
    credentials: true
  })
);
app.post("/api/billing/webhook", express.raw({ type: "application/json" }), stripeWebhook);
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));
app.use(morgan(env.NODE_ENV === "production" ? "combined" : "dev"));

const healthPayload = () => ({
    ok: true,
    service: "aiflow-api",
    diagnostics: "auth-and-thread-stage-errors",
    config: {
      supabaseUrl: Boolean(env.SUPABASE_URL),
      supabaseAnonKey: Boolean(env.SUPABASE_ANON_KEY),
      databaseUrl: Boolean(env.DATABASE_URL),
      databaseUrlSource: env.DATABASE_URL_SOURCE,
      databaseProjectRef: readSupabaseProjectRef(env.DATABASE_URL),
      directUrlSource: env.DIRECT_URL_SOURCE,
      supabaseProjectRef: readSupabaseProjectRef(env.SUPABASE_URL),
      geminiApiKey: Boolean(env.GEMINI_API_KEY),
      frontendUrl: env.FRONTEND_URL
    }
});

app.get("/health", (_req, res) => {
  res.json(healthPayload());
});

app.get("/api/health", (_req, res) => {
  res.json(healthPayload());
});

app.use("/api/auth", authRoutes);
app.use("/api/billing", billingRoutes);
app.use("/api/threads", threadRoutes);

app.use((_req, res) => {
  res.status(404).json({ error: { message: "Route not found." } });
});
app.use(errorHandler);

app.listen(env.PORT, () => {
  console.log(`AIFlow API running on http://localhost:${env.PORT}`);
});
