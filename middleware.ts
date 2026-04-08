import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { createDashboardAuthToken, DASHBOARD_AUTH_COOKIE } from '@/lib/auth';

export async function middleware(request: NextRequest) {
  const configuredPassword = process.env.DASHBOARD_PASSWORD;
  if (!configuredPassword) {
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;
  const token = request.cookies.get(DASHBOARD_AUTH_COOKIE)?.value;
  const expectedToken = await createDashboardAuthToken(configuredPassword);
  const isAuthenticated = token === expectedToken;

  if (pathname === '/unlock') {
    if (isAuthenticated) {
      return NextResponse.redirect(new URL('/', request.url));
    }
    return NextResponse.next();
  }

  // Handle unlock API directly in middleware so the Set-Cookie header
  // is guaranteed to reach the browser.
  if (pathname === '/api/unlock' && request.method === 'POST') {
    const body = await request.json();
    const submittedPassword = typeof body?.password === 'string' ? body.password : '';

    if (submittedPassword !== configuredPassword) {
      return NextResponse.json({ message: 'Incorrect password' }, { status: 401 });
    }

    const newToken = await createDashboardAuthToken(configuredPassword);
    const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';

    const response = NextResponse.json({ ok: true, passwordEnabled: true });
    response.headers.set(
      'Set-Cookie',
      `${DASHBOARD_AUTH_COOKIE}=${newToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800${secure}`
    );
    return response;
  }

  if (!isAuthenticated) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const unlockUrl = new URL('/unlock', request.url);
    return NextResponse.redirect(unlockUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/', '/settings', '/unlock', '/api/:path*'],
};