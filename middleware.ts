import { NextRequest, NextResponse } from 'next/server';

// Routes that are always public — the password gate + its auth endpoints
const PUBLIC_PATHS = ['/password', '/api/auth/site-password', '/api/auth/logout'];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Always allow public paths and Next.js internals
  if (
    PUBLIC_PATHS.some(p => pathname.startsWith(p)) ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon')
  ) {
    return NextResponse.next();
  }

  // Check the httpOnly auth cookie — value is compared server-side only
  const authCookie = req.cookies.get('site-auth')?.value;
  const expected   = process.env.AUTH_SECRET || 'b6e3f2d1e4c5a6b7f8c9d0e1f2a3b4c5';

  if (authCookie !== expected) {
    const url = req.nextUrl.clone();
    url.pathname = '/password';
    url.searchParams.set('next', req.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
