import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import fs from 'fs';
import path from 'path';

export interface Service {
  id: string;
  name: string;
  url: string;
  icon: string;
  serverId: string | null;
  status: 'online' | 'offline' | 'unknown';
  lastChecked: string | null;
  createdAt: string;
}

export interface Server {
  id: string;
  name: string;
  lat: number;
  lng: number;
  ipAddress: string | null;
  status: 'online' | 'offline' | 'unknown';
  lastChecked: string | null;
  createdAt: string;
}

export interface Settings {
  siteName: string;
  titleIconPath: string | null;
  deviceLat: number | null;
  deviceLng: number | null;
  dashboardHostServerId: string | null;
}

interface DbSchema {
  services: Service[];
  servers: Server[];
  settings: Settings;
}

const DB_FILE_NAME = 'db.json';
const DB_DIR = 'data';

const defaultData: DbSchema = {
  services: [],
  servers: [],
  settings: {
    siteName: 'HomeLab',
    titleIconPath: null,
    deviceLat: 0,
    deviceLng: 0,
    dashboardHostServerId: null,
  },
};

// Use globalThis to persist the db instance across HMR in development.
// Without this, Next.js dev mode re-evaluates modules on hot reload,
// resetting module-level variables and losing the cached instance.
const globalForDb = globalThis as unknown as {
  __lowdb_instance?: Low<DbSchema>;
};

function ensureDataIntegrity(data: DbSchema) {
  if (!data.services) data.services = [];
  if (!data.servers) data.servers = [];
  if (!data.settings) data.settings = { ...defaultData.settings };
  if (data.settings.titleIconPath === undefined) {
    data.settings.titleIconPath = null;
  }
  if (data.settings.dashboardHostServerId === undefined) {
    data.settings.dashboardHostServerId = null;
  }

  for (const service of data.services) {
    if (service.serverId === undefined) service.serverId = null;
    if (service.status === undefined) service.status = 'unknown';
    if (service.lastChecked === undefined) service.lastChecked = null;
    if (service.createdAt === undefined) service.createdAt = new Date().toISOString();
  }

  for (const server of data.servers) {
    if (server.ipAddress === undefined) server.ipAddress = null;
    if (server.status === undefined) server.status = 'unknown';
    if (server.lastChecked === undefined) server.lastChecked = null;
    if (server.createdAt === undefined) server.createdAt = new Date().toISOString();
  }
}

export async function getDb(): Promise<Low<DbSchema>> {
  // Resolve the database path at runtime (not module-load time) so that
  // process.cwd() always reflects the actual working directory of the
  // running process, not the build-time directory.
  const dbFullPath = path.resolve(process.cwd(), DB_DIR, DB_FILE_NAME);

  // Reuse the existing instance stored on globalThis if available.
  if (globalForDb.__lowdb_instance) {
    // Always re-read from disk to pick up any external changes
    // and to ensure we never serve stale in-memory data.
    await globalForDb.__lowdb_instance.read();
    ensureDataIntegrity(globalForDb.__lowdb_instance.data);
    return globalForDb.__lowdb_instance;
  }

  try {
    const dir = path.dirname(dbFullPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const adapter = new JSONFile<DbSchema>(dbFullPath);
    const db = new Low<DbSchema>(adapter, defaultData);

    await db.read();
    ensureDataIntegrity(db.data);

    // Strip legacy keys (e.g. "examples") that are not part of the schema
    const cleanData: DbSchema = {
      services: db.data.services,
      servers: db.data.servers,
      settings: db.data.settings,
    };
    db.data = cleanData;

    globalForDb.__lowdb_instance = db;

    console.log(`Database initialized/loaded from: ${dbFullPath}`);

    return db;
  } catch (error) {
    console.error('Failed to initialize Lowdb database:', error);
    throw error;
  }
}