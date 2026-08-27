import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { normalizeRoles } from '@/lib/auth/roles';
import { rolesCanAccessRoute } from '@/lib/permissions/route-access';

type CookieToSet = { name: string; value: string; options?: CookieOptions };

const PUBLIC_PATHS = ['/login', '/demo-setup', '/forbidden'];

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

function isValidSupabaseUrl(value: string | undefined): value is string {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
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

  // 로그인/데모설정/403 화면은 인증 미들웨어를 거치지 않게 하여
  // 환경변수 오류가 있더라도 해당 화면 자체는 항상 열리도록 합니다.
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!isValidSupabaseUrl(supabaseUrl) || !supabaseAnonKey?.trim()) {
    return redirectToLogin(request, 'supabase-config');
  }

  try {
    let response = NextResponse.next({ request });

    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
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
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$|api/).*)'],
};
