import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabasePublishableKey) {
  throw new Error("Missing Supabase environment variables");
}

const resolvedSupabaseUrl = supabaseUrl;
const resolvedSupabasePublishableKey = supabasePublishableKey;

export const supabase = createClient(resolvedSupabaseUrl, resolvedSupabasePublishableKey);

export function createSupabaseRequestClient(accessToken: string) {
  return createClient(resolvedSupabaseUrl, resolvedSupabasePublishableKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });
}
