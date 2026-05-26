import "dotenv/config";

const parsePort = (value: string | undefined) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 4000;
};

export const env = {
  NODE_ENV: process.env.NODE_ENV ?? "development",
  PORT: parsePort(process.env.PORT),
  FRONTEND_URL: process.env.FRONTEND_URL ?? "http://localhost:5173",
  GEMINI_API_KEY: process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY,
  GEMINI_MODEL: process.env.GEMINI_MODEL ?? "gemini-2.5-flash",
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
  JWT_SECRET: process.env.JWT_SECRET,
  DATABASE_URL: process.env.DATABASE_URL,
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
  STRIPE_STARTER_PRICE_ID: process.env.STRIPE_STARTER_PRICE_ID,
  STRIPE_PRO_PRICE_ID: process.env.STRIPE_PRO_PRICE_ID,
  STRIPE_TEAM_PRICE_ID: process.env.STRIPE_TEAM_PRICE_ID
};

export const isProduction = env.NODE_ENV === "production";
export const isSupabaseConfigured = Boolean(env.SUPABASE_URL && env.SUPABASE_ANON_KEY);
export const isGeminiConfigured = Boolean(env.GEMINI_API_KEY);
export const isStripeConfigured = Boolean(env.STRIPE_SECRET_KEY);
