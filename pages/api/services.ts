import type { NextApiRequest, NextApiResponse } from 'next';
import { getDb } from '@/lib/database';
import type { Service } from '@/lib/database';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const db = await getDb();

    if (req.method === 'GET') {
      return res.status(200).json(db.data.services);
    }

    if (req.method === 'POST') {
      const { name, url, icon } = req.body;
      if (!name || !url) {
        return res.status(400).json({ message: 'Name and URL are required' });
      }

      const newService: Service = {
        id: crypto.randomUUID(),
        name,
        url,
        icon: icon || 'Globe',
        status: 'unknown',
        lastChecked: null,
        createdAt: new Date().toISOString(),
      };

      db.data.services.push(newService);
      await db.write();
      return res.status(201).json(newService);
    }

    if (req.method === 'PUT') {
      const { id, name, url, icon } = req.body;
      const idx = db.data.services.findIndex((s) => s.id === id);
      if (idx === -1) return res.status(404).json({ message: 'Service not found' });

      if (name) db.data.services[idx].name = name;
      if (url) db.data.services[idx].url = url;
      if (icon) db.data.services[idx].icon = icon;

      await db.write();
      return res.status(200).json(db.data.services[idx]);
    }

    if (req.method === 'DELETE') {
      const { id } = req.body;
      db.data.services = db.data.services.filter((s) => s.id !== id);
      await db.write();
      return res.status(200).json({ message: 'Deleted' });
    }

    res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Services API error:', message);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
