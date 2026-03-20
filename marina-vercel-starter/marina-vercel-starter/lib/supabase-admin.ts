import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getConfig, hasSupabase } from "@/lib/config";

let supabaseAdmin: SupabaseClient | null = null;

export function getSupabaseAdmin() {
  if (!hasSupabase()) return null;
  if (supabaseAdmin) return supabaseAdmin;

  const config = getConfig();
  supabaseAdmin = createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  return supabaseAdmin;
}
