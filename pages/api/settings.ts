import type { NextApiRequest, NextApiResponse } from 'next';
import { getDb } from '@/lib/database';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const db = await getDb();

    if (req.method === 'GET') {
      return res.status(200).json(db.data.settings);
    }

    if (req.method === 'PUT') {
      const { siteName, deviceLat, deviceLng, dashboardHostServerId } = req.body;

      if (
        dashboardHostServerId &&
        !db.data.servers.some((server) => server.id === dashboardHostServerId)
      ) {
        return res.status(400).json({ message: 'Selected dashboard host does not exist' });
      }

      if (siteName !== undefined) db.data.settings.siteName = siteName;
      if (deviceLat !== undefined) db.data.settings.deviceLat = deviceLat;
      if (deviceLng !== undefined) db.data.settings.deviceLng = deviceLng;
      if (dashboardHostServerId !== undefined) {
        db.data.settings.dashboardHostServerId = dashboardHostServerId || null;
      }

      await db.write();
      return res.status(200).json(db.data.settings);
    }

    res.setHeader('Allow', ['GET', 'PUT']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Settings API error:', message);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
