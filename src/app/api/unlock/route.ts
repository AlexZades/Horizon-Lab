import { NextRequest, NextResponse } from 'next/server';
import { createDashboardAuthToken, DASHBOARD_AUTH_COOKIE } from '@/lib/auth';

export async function POST(request: NextRequest) {
  const configuredPassword = process.env.DASHBOARD_PASSWORD;
  if (!configuredPassword) {
    return NextResponse.json({ ok: true, passwordEnabled: false });
  }

  const body = await request.json();
  const submittedPassword = typeof body?.password === 'string' ? body.password : '';
  if (submittedPassword !== configuredPassword) {
    return NextResponse.json({ message: 'Incorrect password' }, { status: 401 });
  }

  const token = await createDashboardAuthToken(configuredPassword);

  const response = NextResponse.json({ ok: true, passwordEnabled: true });
  response.cookies.set(DASHBOARD_AUTH_COOKIE, token, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 604800,
  });

  return response;
}
