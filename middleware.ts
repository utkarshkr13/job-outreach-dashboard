import { NextRequest, NextResponse } from 'next/server';

// Routes that are always public — the password gate, its auth endpoints,
// and endpoints hit by external recipients (email open pixel, unsubscribe
// link) who never carry the site-auth cookie.
const PUBLIC_PATHS = ['/password', '/api/auth/site-password', '/api/auth/logout', '/api/track'];

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

  // Check the httpOnly auth cookie — value is compared server-side only.
  // No hardcoded fallback: in demo mode we accept the fixed demo secret
  // (matches app/api/auth/site-password/route.ts); otherwise AUTH_SECRET
  // must be explicitly configured, or every request fails closed to /password.
  // An optional TEST_AUTH_SECRET is also accepted, for a secondary test
  // login that's entirely separate from the primary credentials.
  const authCookie = req.cookies.get('site-auth')?.value;
  const isDemoMode = process.env.NEXT_PUBLIC_APP_MODE === 'demo';
  const expected = isDemoMode ? 'demo-site-auth-cookie' : process.env.AUTH_SECRET;
  const expectedTest = isDemoMode ? undefined : process.env.TEST_AUTH_SECRET;

  const isValid =
    !!authCookie && ((!!expected && authCookie === expected) || (!!expectedTest && authCookie === expectedTest));

  if (!isValid) {
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
