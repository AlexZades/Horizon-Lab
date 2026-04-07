import fs from 'fs/promises';
import path from 'path';
import type { NextApiRequest, NextApiResponse } from 'next';
import { getDb } from '@/lib/database';

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'title-icons');
const PUBLIC_PREFIX = '/uploads/title-icons/';
const ALLOWED_TYPES: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
};
const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024;

async function removeExistingTitleIcon(existingPath: string | null) {
  if (!existingPath || !existingPath.startsWith(PUBLIC_PREFIX)) {
    return;
  }

  const fileName = path.basename(existingPath);
  const absolutePath = path.join(UPLOAD_DIR, fileName);

  try {
    await fs.unlink(absolutePath);
  } catch {
    // Ignore missing files.
  }
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '4mb',
    },
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const db = await getDb();

    if (req.method === 'POST') {
      const { fileName, mimeType, dataUrl } = req.body as {
        fileName?: string;
        mimeType?: string;
        dataUrl?: string;
      };

      if (!fileName || !mimeType || !dataUrl) {
        return res.status(400).json({ message: 'Missing upload data' });
      }

      const extension = ALLOWED_TYPES[mimeType];
      if (!extension) {
        return res.status(400).json({ message: 'Only PNG, JPG, WEBP, and GIF images are allowed' });
      }

      const match = dataUrl.match(/^data:[^;]+;base64,(.+)$/);
      if (!match) {
        return res.status(400).json({ message: 'Invalid image payload' });
      }

      const buffer = Buffer.from(match[1], 'base64');
      if (buffer.byteLength > MAX_FILE_SIZE_BYTES) {
        return res.status(400).json({ message: 'Image must be 2MB or smaller' });
      }

      await fs.mkdir(UPLOAD_DIR, { recursive: true });
      await removeExistingTitleIcon(db.data.settings.titleIconPath);

      const storedFileName = `${crypto.randomUUID()}.${extension}`;
      const filePath = path.join(UPLOAD_DIR, storedFileName);
      await fs.writeFile(filePath, buffer);

      db.data.settings.titleIconPath = `${PUBLIC_PREFIX}${storedFileName}`;
      await db.write();

      return res.status(200).json({ titleIconPath: db.data.settings.titleIconPath });
    }

    if (req.method === 'DELETE') {
      await removeExistingTitleIcon(db.data.settings.titleIconPath);
      db.data.settings.titleIconPath = null;
      await db.write();
      return res.status(200).json({ titleIconPath: null });
    }

    res.setHeader('Allow', ['POST', 'DELETE']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Title icon API error:', message);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
