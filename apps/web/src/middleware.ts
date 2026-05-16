import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet: { name: string; value: string; options?: object }[]) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  // Refresh session (keeps JWT alive)
  const { data: { user } } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  /* ── Protect /studio/* ── */
  if (pathname.startsWith('/studio')) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      url.searchParams.set('next', pathname);
      return NextResponse.redirect(url);
    }
  }

  /* ── Protect /onboarding ── */
  if (pathname.startsWith('/onboarding')) {
    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  /* ── Redirect logged-in users away from login/register ── */
  if (pathname === '/login' || pathname === '/register') {
    if (user) {
      return NextResponse.redirect(new URL('/studio', request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    '/studio/:path*',
    '/onboarding/:path*',
    '/login',
    '/register',
  ],
};
