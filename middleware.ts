import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { normalizeRoles } from '@/lib/auth/roles';
import { rolesCanAccessRoute } from '@/lib/permissions/route-access';

type CookieToSet = { name: string; value: string; options?: CookieOptions };

const PUBLIC_PATHS = ['/login', '/demo-setup'];

function copyCookies(from: NextResponse, to: NextResponse) {
  from.cookies.getAll().forEach((cookie) => to.cookies.set(cookie));
  return to;
}

export async function middleware(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) return NextResponse.next();

  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(items: CookieToSet[]) {
        items.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        items.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isPublic = PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );

  if (!user) {
    if (isPublic) return response;
    const redirect = NextResponse.redirect(new URL('/login', request.url));
    return copyCookies(response, redirect);
  }

  if (pathname === '/login') {
    const redirect = NextResponse.redirect(new URL('/dashboard', request.url));
    return copyCookies(response, redirect);
  }

  if (pathname === '/') {
    const redirect = NextResponse.redirect(new URL('/dashboard', request.url));
    return copyCookies(response, redirect);
  }

  if (isPublic || pathname === '/forbidden') return response;

  const { data: roleData } = await supabase.rpc('current_role_codes');
  const roles = normalizeRoles((roleData ?? []) as string[]);

  if (!rolesCanAccessRoute(roles, pathname)) {
    const redirect = NextResponse.redirect(new URL('/forbidden', request.url));
    return copyCookies(response, redirect);
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$|api/).*)'],
};
