import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Never block these paths
  if (
    pathname.startsWith('/login') ||
    pathname.startsWith('/auth') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/__next') ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next();
  }

  // No token cookie → redirect to login (server-side, no JS needed)
  const token = request.cookies.get('token');
  if (!token) {
    const loginUrl = new URL('/login', request.url);
    if (pathname !== '/') {
      loginUrl.searchParams.set('redirect', pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  // Only run on page routes, skip all static assets and HMR
  matcher: ['/((?!_next|__next|favicon.ico|.*\\.(?:js|css|png|jpg|svg|ico)$).*)'],
};
