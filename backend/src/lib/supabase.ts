import { createClient } from "@supabase/supabase-js";
import { env, isSupabaseConfigured } from "../config/env.js";

export const supabase = isSupabaseConfigured
  ? createClient(env.SUPABASE_URL!, env.SUPABASE_ANON_KEY!, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    })
  : null;
