import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getSupabasePublicEnv, isValidSupabaseUrl } from '@/lib/supabase/env';

type CookieToSet = {
  name: string;
  value: string;
  options?: CookieOptions;
};

export async function createClient() {
  const { url, key } = getSupabasePublicEnv();
  if (!isValidSupabaseUrl(url) || !key) return null;

  const cookieStore = await cookies();

  try {
    return createServerClient(url, key, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(items: CookieToSet[]) {
          try {
            items.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Server Component에서 쿠키 쓰기가 허용되지 않는 경우는 무시합니다.
            // 세션 갱신은 middleware가 처리합니다.
          }
        },
      },
    });
  } catch {
    return null;
  }
}
