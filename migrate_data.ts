import { drizzle as drizzleLibsql } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import Database from 'better-sqlite3';
import { drizzle as drizzleBetterSqlite } from 'drizzle-orm/better-sqlite3';
import * as schema from './server/database/schema';

const TURSO_URL = process.env.TURSO_DATABASE_URL;
const TURSO_TOKEN = process.env.TURSO_AUTH_TOKEN;

if (!TURSO_URL || !TURSO_TOKEN) {
  console.error('Set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN in the environment before running.');
  process.exit(1);
}

async function migrate() {
  console.log('Connecting to databases...');
  
  // Local DB
  const sqlite = new Database('database/clyricify.db');
  const localDb = drizzleBetterSqlite(sqlite, { schema });

  // Remote DB
  const client = createClient({ url: TURSO_URL, authToken: TURSO_TOKEN });
  const remoteDb = drizzleLibsql(client, { schema });

  const tables = [
    { name: 'users', table: schema.users },
    { name: 'sessions', table: schema.sessions },
    { name: 'playlists', table: schema.playlists },
    { name: 'songs', table: schema.songs },
    { name: 'playlistSongs', table: schema.playlistSongs },
  ];

  for (const { name, table } of tables) {
    console.log(`Migrating table: ${name}...`);
    const data = await localDb.select().from(table);
    
    if (data.length > 0) {
      // Clear remote table first to avoid conflicts during full sync
      await remoteDb.delete(table);
      
      // Batch insert
      await remoteDb.insert(table).values(data);
      console.log(`Successfully migrated ${data.length} rows for ${name}.`);
    } else {
      console.log(`No data found for ${name}.`);
    }
  }

  console.log('Migration complete!');
  sqlite.close();
  client.close();
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
