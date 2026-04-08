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
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';

  const response = NextResponse.json({ ok: true, passwordEnabled: true });
  response.headers.set(
    'Set-Cookie',
    `${DASHBOARD_AUTH_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800${secure}`
  );

  return response;
}
