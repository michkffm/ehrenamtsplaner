import { createClient, processLock } from '@supabase/supabase-js';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

// Sessions remain in memory for this first version; no credentials are stored locally.
export const supabase = url && key ? createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: true, detectSessionInUrl: false, lock: processLock },
}) : null;

export function client() {
  if (!supabase) throw new Error('missing_configuration');
  return supabase;
}
