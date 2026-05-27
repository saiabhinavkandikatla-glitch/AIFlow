import "dotenv/config";

const parsePort = (value: string | undefined) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 4000;
};

const supabaseUrl =
  process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;

const supabaseAnonKey =
  process.env.SUPABASE_ANON_KEY ??
  process.env.SUPABASE_PUBLISHABLE_KEY ??
  process.env.VITE_SUPABASE_ANON_KEY ??
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

const databaseUrl = process.env.AIFLOW_DATABASE_URL ?? process.env.SUPABASE_DATABASE_URL ?? process.env.DATABASE_URL;
const directUrl = process.env.AIFLOW_DIRECT_URL ?? process.env.SUPABASE_DIRECT_URL ?? process.env.DIRECT_URL;

const databaseUrlSource = process.env.AIFLOW_DATABASE_URL
  ? "AIFLOW_DATABASE_URL"
  : process.env.SUPABASE_DATABASE_URL
    ? "SUPABASE_DATABASE_URL"
    : process.env.DATABASE_URL
      ? "DATABASE_URL"
      : null;

const directUrlSource = process.env.AIFLOW_DIRECT_URL
  ? "AIFLOW_DIRECT_URL"
  : process.env.SUPABASE_DIRECT_URL
    ? "SUPABASE_DIRECT_URL"
    : process.env.DIRECT_URL
      ? "DIRECT_URL"
      : null;

export const env = {
  NODE_ENV: process.env.NODE_ENV ?? "development",
  PORT: parsePort(process.env.PORT),
  FRONTEND_URL: process.env.FRONTEND_URL ?? "http://localhost:5173",
  GEMINI_API_KEY: process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY,
  GEMINI_MODEL: process.env.GEMINI_MODEL ?? "gemini-2.5-flash",
  SUPABASE_URL: supabaseUrl,
  SUPABASE_ANON_KEY: supabaseAnonKey,
  JWT_SECRET: process.env.JWT_SECRET,
  DATABASE_URL: databaseUrl,
  DIRECT_URL: directUrl,
  DATABASE_URL_SOURCE: databaseUrlSource,
  DIRECT_URL_SOURCE: directUrlSource,
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
