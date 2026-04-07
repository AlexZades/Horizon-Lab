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
      const { name, lat, lng } = req.body;
      if (!name || lat == null || lng == null) {
        return res.status(400).json({ message: 'Name, lat, and lng are required' });
      }

      const newServer: Server = {
        id: crypto.randomUUID(),
        name,
        lat: Number(lat),
        lng: Number(lng),
        createdAt: new Date().toISOString(),
      };

      db.data.servers.push(newServer);
      await db.write();
      return res.status(201).json(newServer);
    }

    if (req.method === 'PUT') {
      const { id, name, lat, lng } = req.body;
      const idx = db.data.servers.findIndex((s) => s.id === id);
      if (idx === -1) return res.status(404).json({ message: 'Server not found' });

      if (name) db.data.servers[idx].name = name;
      if (lat != null) db.data.servers[idx].lat = Number(lat);
      if (lng != null) db.data.servers[idx].lng = Number(lng);

      await db.write();
      return res.status(200).json(db.data.servers[idx]);
    }

    if (req.method === 'DELETE') {
      const { id } = req.body;
      db.data.servers = db.data.servers.filter((s) => s.id !== id);
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
