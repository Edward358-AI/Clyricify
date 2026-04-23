import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';
import path from 'path';
import fs from 'fs';

// Ensure database directory exists
const dbDir = path.resolve(process.cwd(), 'database');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const sqlite = new Database(path.join(dbDir, 'clyricify.db'));

// Enable Write-Ahead Logging for better performance
sqlite.pragma('journal_mode = WAL');

export const db = drizzle(sqlite, { schema });
