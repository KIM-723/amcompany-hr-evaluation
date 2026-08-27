import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { normalizeRoles } from '@/lib/auth/roles';
import { rolesCanAccessRoute } from '@/lib/permissions/route-access';

type CookieToSet = { name: string; value: string; options?: CookieOptions };

function isValidSupabaseUrl(value: string | undefined): value is string {
  if (!value) return false;
  try {
    const url = new URL(value.trim());
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

function getPublicKey() {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
    undefined
  );
}

function copyCookies(from: NextResponse, to: NextResponse) {
  from.cookies.getAll().forEach((cookie) => to.cookies.set(cookie));
  return to;
}

function redirectToLogin(request: NextRequest, reason?: string) {
  const url = new URL('/login', request.url);
  if (reason) url.searchParams.set('reason', reason);
  return NextResponse.redirect(url);
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const supabaseKey = getPublicKey();

  if (!isValidSupabaseUrl(supabaseUrl) || !supabaseKey) {
    return redirectToLogin(request, 'supabase-config');
  }

  try {
    let response = NextResponse.next({ request });

    const supabase = createServerClient(supabaseUrl, supabaseKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(items: CookieToSet[]) {
          items.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          items.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    });

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      const redirect = redirectToLogin(request, userError ? 'auth' : undefined);
      return copyCookies(response, redirect);
    }

    if (pathname === '/') {
      const redirect = NextResponse.redirect(new URL('/dashboard', request.url));
      return copyCookies(response, redirect);
    }

    const { data: roleData, error: roleError } = await supabase.rpc('current_role_codes');

    if (roleError) {
      const redirect = NextResponse.redirect(new URL('/forbidden', request.url));
      return copyCookies(response, redirect);
    }

    const roles = normalizeRoles((roleData ?? []) as string[]);

    if (!rolesCanAccessRoute(roles, pathname)) {
      const redirect = NextResponse.redirect(new URL('/forbidden', request.url));
      return copyCookies(response, redirect);
    }

    return response;
  } catch (error) {
    console.error('AMCOMPANY middleware auth error', error);
    return redirectToLogin(request, 'middleware');
  }
}

export const config = {
  // 로그인/데모 설정/환경 점검/403/API/정적 파일은 Middleware 자체를 전혀 실행하지 않는다.
  matcher: [
    '/((?!login(?:/|$)|demo-setup(?:/|$)|env-check(?:/|$)|forbidden(?:/|$)|api(?:/|$)|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
