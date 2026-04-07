import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import path from 'path';
import fs from 'fs';

export interface Service {
  id: string;
  name: string;
  url: string;
  icon: string;
  status: 'online' | 'offline' | 'unknown';
  lastChecked: string | null;
  createdAt: string;
}

export interface Server {
  id: string;
  name: string;
  lat: number;
  lng: number;
  createdAt: string;
}

export interface Settings {
  siteName: string;
  deviceLat: number | null;
  deviceLng: number | null;
}

interface DbSchema {
  examples: { id: number; name: string; createdAt: string }[];
  services: Service[];
  servers: Server[];
  settings: Settings;
}

const DB_FILE_NAME = 'db.json';
const DB_DIR_PATH = process.env.DATABASE_DIR || './data';
const DB_FULL_PATH = path.resolve(process.cwd(), DB_DIR_PATH, DB_FILE_NAME);

let dbInstance: Low<DbSchema> | null = null;

const defaultData: DbSchema = {
  examples: [],
  services: [],
  servers: [],
  settings: {
    siteName: 'HomeLab',
    deviceLat: null,
    deviceLng: null,
  },
};

export async function getDb(): Promise<Low<DbSchema>> {
  if (dbInstance) {
    if (dbInstance.data) {
      return dbInstance;
    }
    await dbInstance.read();
    return dbInstance;
  }

  try {
    const dir = path.dirname(DB_FULL_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const adapter = new JSONFile<DbSchema>(DB_FULL_PATH);
    dbInstance = new Low<DbSchema>(adapter, defaultData);

    await dbInstance.read();

    // Ensure all fields exist (migration for existing dbs)
    if (!dbInstance.data.services) dbInstance.data.services = [];
    if (!dbInstance.data.servers) dbInstance.data.servers = [];
    if (!dbInstance.data.settings) dbInstance.data.settings = defaultData.settings;

    console.log(`Database initialized/loaded from: ${DB_FULL_PATH}`);

    return dbInstance;
  } catch (error) {
    console.error('Failed to initialize Lowdb database:', error);
    throw error;
  }
}
