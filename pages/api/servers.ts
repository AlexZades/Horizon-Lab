import type { NextApiRequest, NextApiResponse } from 'next';
import { getDb } from '@/lib/database';
import type { Server } from '@/lib/database';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const db = await getDb();

    if (req.method === 'GET') {
      return res.status(200).json(db.data.servers);
    }

    if (req.method === 'POST') {
      const { name, lat, lng, ipAddress } = req.body;
      if (!name || lat == null || lng == null) {
        return res.status(400).json({ message: 'Name, lat, and lng are required' });
      }

      const newServer: Server = {
        id: crypto.randomUUID(),
        name,
        lat: Number(lat),
        lng: Number(lng),
        ipAddress: ipAddress?.trim() || null,
        status: 'unknown',
        lastChecked: null,
        createdAt: new Date().toISOString(),
      };

      db.data.servers.push(newServer);
      await db.write();
      return res.status(201).json(newServer);
    }

    if (req.method === 'PUT') {
      const { id, name, lat, lng, ipAddress } = req.body;
      const index = db.data.servers.findIndex((server) => server.id === id);
      if (index === -1) {
        return res.status(404).json({ message: 'Server not found' });
      }

      if (name) db.data.servers[index].name = name;
      if (lat != null) db.data.servers[index].lat = Number(lat);
      if (lng != null) db.data.servers[index].lng = Number(lng);
      if (ipAddress !== undefined) db.data.servers[index].ipAddress = ipAddress?.trim() || null;

      await db.write();
      return res.status(200).json(db.data.servers[index]);
    }

    if (req.method === 'DELETE') {
      const { id } = req.body;
      db.data.servers = db.data.servers.filter((server) => server.id !== id);
      db.data.services = db.data.services.map((service) =>
        service.serverId === id ? { ...service, serverId: null } : service
      );
      if (db.data.settings.dashboardHostServerId === id) {
        db.data.settings.dashboardHostServerId = null;
      }
      await db.write();
      return res.status(200).json({ message: 'Deleted' });
    }

    res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Servers API error:', message);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
