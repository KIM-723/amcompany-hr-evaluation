import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

type CookieToSet = {
  name: string;
  value: string;
  options?: CookieOptions;
};

export async function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) return null;

  const cookieStore = await cookies();

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
          // 실제 세션 갱신은 STEP 4의 middleware/auth flow에서 처리합니다.
        }
      },
    },
  });
}
