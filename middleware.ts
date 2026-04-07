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

  if (pathname === '/api/unlock') {
    return NextResponse.next();
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
