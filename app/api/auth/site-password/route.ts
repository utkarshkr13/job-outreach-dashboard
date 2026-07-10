import { NextRequest, NextResponse } from 'next/server';

const isDemoMode = () => process.env.NEXT_PUBLIC_APP_MODE === 'demo';

export async function POST(req: NextRequest) {
  const { username, password, next } = await req.json();

  let expectedUser: string;
  let expectedPassword: string;
  let secret: string;

  if (isDemoMode()) {
    // Local/demo-only credentials — never used against a real deployment.
    expectedUser = 'demo';
    expectedPassword = 'demo';
    secret = 'demo-site-auth-cookie';
  } else {
    // Production requires these to be explicitly configured. No fallback —
    // a missing secret must fail closed, not silently accept a known value.
    if (!process.env.LOGIN_USERNAME || !process.env.SITE_PASSWORD || !process.env.AUTH_SECRET) {
      return NextResponse.json(
        { error: 'Server misconfiguration: LOGIN_USERNAME, SITE_PASSWORD, and AUTH_SECRET must be set.' },
        { status: 500 }
      );
    }
    expectedUser = process.env.LOGIN_USERNAME.trim().toLowerCase();
    expectedPassword = process.env.SITE_PASSWORD;
    secret = process.env.AUTH_SECRET;
  }

  const userOk = (username || '').trim().toLowerCase() === expectedUser;
  const passOk = !!password && password === expectedPassword;

  if (!userOk || !passOk) {
    return NextResponse.json({ error: 'Incorrect username or password' }, { status: 401 });
  }

  const destination =
    typeof next === 'string' && next.startsWith('/') && !next.startsWith('/password') && !next.startsWith('/login')
      ? next
      : '/';

  const response = NextResponse.json({ success: true, redirect: destination });

  response.cookies.set('site-auth', secret, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax', // sent on top-level navigations (fixes the password redirect loop)
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });

  return response;
}
