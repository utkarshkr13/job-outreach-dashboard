import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { password, next } = await req.json();

  // Compare against env var — password is NEVER in client code
  if (!password || password !== process.env.SITE_PASSWORD) {
    return NextResponse.json({ error: 'Incorrect password' }, { status: 401 });
  }

  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }

  // Set httpOnly cookie — inaccessible to browser JS / DevTools JS tab
  const destination = (typeof next === 'string' && next.startsWith('/') && !next.startsWith('/password'))
    ? next
    : '/';

  const response = NextResponse.json({ success: true, redirect: destination });

  response.cookies.set('site-auth', secret, {
    httpOnly: true,        // not readable by document.cookie or JS
    secure: true,          // HTTPS only
    sameSite: 'strict',    // no cross-site leakage
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });

  return response;
}
