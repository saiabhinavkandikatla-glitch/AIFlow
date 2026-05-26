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

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "aiflow-api" });
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
