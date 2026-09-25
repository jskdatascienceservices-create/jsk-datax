import { createClient, SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || "";
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || "";

export function isSupabaseConfigured() {
  return Boolean(url && key && url.startsWith("https://"));
}

// Only create client when keys exist — avoids "supabaseUrl is required"
let _client: SupabaseClient | null = null;

export function getSupabase() {
  if (!isSupabaseConfigured()) {
    throw new Error(
      "Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local and restart npm run dev."
    );
  }
  if (!_client) {
    _client = createClient(url, key);
  }
  return _client;
}

// Optional: for older imports — only use after checking isSupabaseConfigured()
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = getSupabase();
    const value = (client as any)[prop];
    return typeof value === "function" ? value.bind(client) : value;
  },
});