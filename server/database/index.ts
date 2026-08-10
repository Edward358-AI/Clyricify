import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import Database from 'better-sqlite3';
import { drizzle as drizzleBetterSqlite } from 'drizzle-orm/better-sqlite3';
import type { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core';
import * as schema from './schema';
import path from 'path';
import fs from 'fs';

// Both drivers share the same query-builder API; collapse to one type so
// call sites don't hit per-driver overload clashes on the union.
export type AppDatabase = BaseSQLiteDatabase<'sync' | 'async', unknown, typeof schema>;

let dbInstance: AppDatabase;

const tursoUrl = process.env.TURSO_DATABASE_URL;
const tursoToken = process.env.TURSO_AUTH_TOKEN;

if (tursoUrl) {
  // Production: Turso (LibSQL)
  const client = createClient({
    url: tursoUrl,
    authToken: tursoToken,
  });
  dbInstance = drizzle(client, { schema }) as AppDatabase;
  console.log('[Database] Connected to Turso (Production)');
} else {
  // Local Development: Better-SQLite3
  const dbDir = path.resolve(process.cwd(), 'database');
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
  
  const sqlite = new Database(path.join(dbDir, 'clyricify.db'));
  sqlite.pragma('journal_mode = WAL');
  dbInstance = drizzleBetterSqlite(sqlite, { schema }) as AppDatabase;
  console.log('[Database] Connected to Local SQLite (Development)');
}

export const db = dbInstance;
