import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { username, password, next } = await req.json();

  // Single-operator credentials (configure in env; safe server-side fallbacks).
  const expectedUser = (process.env.LOGIN_USERNAME || 'utkarsh').trim().toLowerCase();
  const expectedPassword = process.env.SITE_PASSWORD || 'utkarsh@2002';

  const userOk = (username || '').trim().toLowerCase() === expectedUser;
  const passOk = !!password && password === expectedPassword;

  if (!userOk || !passOk) {
    return NextResponse.json({ error: 'Incorrect username or password' }, { status: 401 });
  }

  const secret = process.env.AUTH_SECRET || 'b6e3f2d1e4c5a6b7f8c9d0e1f2a3b4c5';

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
