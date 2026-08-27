export type SupabasePublicEnv = {
  url?: string;
  key?: string;
  keySource: 'publishable' | 'anon' | 'missing';
};

export function getSupabasePublicEnv(): SupabasePublicEnv {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (publishableKey) {
    return { url, key: publishableKey, keySource: 'publishable' };
  }

  if (anonKey) {
    return { url, key: anonKey, keySource: 'anon' };
  }

  return { url, key: undefined, keySource: 'missing' };
}

export function getSupabaseServerSecret() {
  return (
    process.env.SUPABASE_SECRET_KEY?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    undefined
  );
}

export function isValidSupabaseUrl(value: string | undefined): value is string {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}
