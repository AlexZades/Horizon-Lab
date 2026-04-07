import type { NextApiRequest, NextApiResponse } from 'next';

const DEFAULT_TIME_GOV_API_URL = 'https://time.gov/';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const endpoint = process.env.TIME_GOV_API_URL || DEFAULT_TIME_GOV_API_URL;
    const response = await fetch(endpoint, {
      method: 'HEAD',
      cache: 'no-store',
    });

    const dateHeader = response.headers.get('date');
    if (!dateHeader) {
      throw new Error('Missing Date header from time.gov response');
    }

    const epochMs = new Date(dateHeader).getTime();
    if (Number.isNaN(epochMs)) {
      throw new Error('Invalid Date header from time.gov response');
    }

    return res.status(200).json({
      epochMs,
      source: 'time.gov',
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Time.gov API error:', message);
    return res.status(500).json({ message: 'Unable to fetch time.gov data' });
  }
}
