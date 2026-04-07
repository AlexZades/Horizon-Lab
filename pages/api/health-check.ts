import type { NextApiRequest, NextApiResponse } from 'next';
import { getDb } from '@/lib/database';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const db = await getDb();
    const results: { id: string; status: 'online' | 'offline' }[] = [];

    for (const service of db.data.services) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);

        const response = await fetch(service.url, {
          method: 'HEAD',
          signal: controller.signal,
          redirect: 'follow',
        });
        clearTimeout(timeout);

        const status = response.ok ? 'online' : 'offline';
        service.status = status;
        service.lastChecked = new Date().toISOString();
        results.push({ id: service.id, status });
      } catch {
        service.status = 'offline';
        service.lastChecked = new Date().toISOString();
        results.push({ id: service.id, status: 'offline' });
      }
    }

    await db.write();
    return res.status(200).json(results);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Health check error:', message);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
