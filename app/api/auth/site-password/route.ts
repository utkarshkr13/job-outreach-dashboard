import { NextRequest, NextResponse } from 'next/server';

const isDemoMode = () => process.env.NEXT_PUBLIC_APP_MODE === 'demo';

export async function POST(req: NextRequest) {
  const { username, password, next } = await req.json();

  const inputUser = (username || '').trim().toLowerCase();
  const inputPass = password || '';

  let matchedSecret: string | null = null;

  if (isDemoMode()) {
    // Local/demo-only credentials — never used against a real deployment.
    if (inputUser === 'demo' && inputPass === 'demo') {
      matchedSecret = 'demo-site-auth-cookie';
    }
  } else {
    // Production requires the primary credentials to be explicitly
    // configured. No fallback — a missing secret must fail closed, not
    // silently accept a known value.
    if (!process.env.LOGIN_USERNAME || !process.env.SITE_PASSWORD || !process.env.AUTH_SECRET) {
      return NextResponse.json(
        { error: 'Server misconfiguration: LOGIN_USERNAME, SITE_PASSWORD, and AUTH_SECRET must be set.' },
        { status: 500 }
      );
    }

    const primaryUser = process.env.LOGIN_USERNAME.trim().toLowerCase();
    if (inputUser === primaryUser && inputPass === process.env.SITE_PASSWORD) {
      matchedSecret = process.env.AUTH_SECRET;
    }

    // Optional secondary test login — entirely separate credentials from the
    // primary account, only active if all three TEST_* env vars are set.
    // Lets someone test the app without ever touching the real password.
    if (
      !matchedSecret &&
      process.env.TEST_USERNAME &&
      process.env.TEST_PASSWORD &&
      process.env.TEST_AUTH_SECRET
    ) {
      const testUser = process.env.TEST_USERNAME.trim().toLowerCase();
      if (inputUser === testUser && inputPass === process.env.TEST_PASSWORD) {
        matchedSecret = process.env.TEST_AUTH_SECRET;
      }
    }
  }

  if (!matchedSecret) {
    return NextResponse.json({ error: 'Incorrect username or password' }, { status: 401 });
  }

  const destination =
    typeof next === 'string' && next.startsWith('/') && !next.startsWith('/password') && !next.startsWith('/login')
      ? next
      : '/';

  const response = NextResponse.json({ success: true, redirect: destination });

  response.cookies.set('site-auth', matchedSecret, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax', // sent on top-level navigations (fixes the password redirect loop)
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });

  return response;
}
