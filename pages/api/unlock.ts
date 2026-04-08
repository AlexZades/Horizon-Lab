import type { NextApiRequest, NextApiResponse } from 'next';
import { createDashboardAuthToken, DASHBOARD_AUTH_COOKIE } from '@/lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const configuredPassword = process.env.DASHBOARD_PASSWORD;
  if (!configuredPassword) {
    return res.status(200).json({ ok: true, passwordEnabled: false });
  }

  const submittedPassword = typeof req.body?.password === 'string' ? req.body.password : '';
  if (submittedPassword !== configuredPassword) {
    return res.status(401).json({ message: 'Incorrect password' });
  }

  const token = await createDashboardAuthToken(configuredPassword);
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';

  res.setHeader(
    'Set-Cookie',
    `${DASHBOARD_AUTH_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800${secure}`
  );

  return res.status(200).json({ ok: true, passwordEnabled: true });
}
