import { createClient } from '@supabase/supabase-js';
import { getSupabaseServerSecret, isValidSupabaseUrl } from '@/lib/supabase/env';

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = getSupabaseServerSecret();
  if (!isValidSupabaseUrl(url) || !key) return null;

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
