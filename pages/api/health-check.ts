import net from 'net';
import type { NextApiRequest, NextApiResponse } from 'next';
import { getDb } from '@/lib/database';

function checkTcpPort(host: string, port: number, timeoutMs: number) {
  return new Promise<boolean>((resolve) => {
    const socket = new net.Socket();
    let settled = false;

    const finish = (result: boolean) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(result);
    };

    socket.setTimeout(timeoutMs);
    socket.once('connect', () => finish(true));
    socket.once('timeout', () => finish(false));
    socket.once('error', () => finish(false));
    socket.connect(port, host);
  });
}

async function checkServerReachability(ipAddress: string | null) {
  if (!ipAddress) {
    return 'unknown' as const;
  }

  const portsToTry = [443, 80, 22];
  for (const port of portsToTry) {
    const isReachable = await checkTcpPort(ipAddress, port, 1500);
    if (isReachable) {
      return 'online' as const;
    }
  }

  return 'offline' as const;
}

async function checkService(url: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      redirect: 'follow',
    });

    return response.ok ? 'online' as const : 'offline' as const;
  } catch {
    return 'offline' as const;
  } finally {
    clearTimeout(timeout);
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const db = await getDb();
    const checkedAt = new Date().toISOString();

    const serviceResults = [] as { id: string; status: 'online' | 'offline' }[];
    for (const service of db.data.services) {
      const status = await checkService(service.url);
      service.status = status;
      service.lastChecked = checkedAt;
      serviceResults.push({ id: service.id, status });
    }

    const serverResults = [] as {
      id: string;
      status: 'online' | 'offline' | 'unknown';
    }[];
    for (const server of db.data.servers) {
      const status = await checkServerReachability(server.ipAddress);
      server.status = status;
      server.lastChecked = checkedAt;
      serverResults.push({ id: server.id, status });
    }

    await db.write();
    return res.status(200).json({ services: serviceResults, servers: serverResults });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Health check error:', message);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
