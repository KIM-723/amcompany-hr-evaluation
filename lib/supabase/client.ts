import { createBrowserClient } from '@supabase/ssr';
import { getSupabasePublicEnv, isValidSupabaseUrl } from '@/lib/supabase/env';

export function getBrowserSupabaseConfigStatus() {
  const { url, key, keySource } = getSupabasePublicEnv();
  return {
    hasUrl: isValidSupabaseUrl(url),
    hasKey: Boolean(key),
    keySource,
  };
}

export function createClient() {
  const { url, key } = getSupabasePublicEnv();
  if (!isValidSupabaseUrl(url) || !key) return null;

  try {
    return createBrowserClient(url, key);
  } catch {
    return null;
  }
}
