// One-way sync: production Turso -> local SQLite (database/clyricify.db).
// Read-only against Turso. Local users, playlists, playlist songs and cached
// songs are replaced with production's; local sessions are kept (except for
// users that no longer exist). A backup of the local db is written first.
//
// Usage (credentials come from the git-ignored .env.turso):
//   node scripts/pull-from-turso.mjs
import { createClient } from '@libsql/client';
import Database from 'better-sqlite3';
import { config } from 'dotenv';
import path from 'node:path';

config({ path: '.env.turso' });

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;
if (!url || !authToken || url.startsWith('file:')) {
  console.error('Set a remote TURSO_DATABASE_URL and TURSO_AUTH_TOKEN in .env.turso before running.');
  process.exit(1);
}

const localPath = path.resolve('database/clyricify.db');
const backupPath = path.resolve(`database/clyricify.pre-pull-${new Date().toISOString().replace(/[:.]/g, '-')}.db`);

// Parents first; deletes run in reverse.
const TABLES = ['users', 'songs', 'playlists', 'playlist_songs'];

const remote = createClient({ url, authToken });
const local = new Database(localPath);
local.pragma('journal_mode = WAL');

console.log('Reading production...');
const pulled = {};
for (const table of TABLES) {
  const res = await remote.execute(`SELECT * FROM ${table}`);
  pulled[table] = { columns: res.columns, rows: res.rows };
  console.log(`  ${table}: ${res.rows.length} rows`);
}
remote.close();

console.log(`Backing up local db to ${path.basename(backupPath)}...`);
await local.backup(backupPath);

const sync = local.transaction(() => {
  local.pragma('defer_foreign_keys = ON');

  for (const table of [...TABLES].reverse()) {
    local.prepare(`DELETE FROM ${table}`).run();
  }
  for (const table of TABLES) {
    const { columns, rows } = pulled[table];
    if (rows.length === 0) continue;
    const insert = local.prepare(
      `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${columns.map(() => '?').join(', ')})`
    );
    for (const row of rows) insert.run(columns.map((c) => row[c]));
  }

  local.prepare('DELETE FROM sessions WHERE user_id NOT IN (SELECT id FROM users)').run();
});
sync();

console.log('Local database now matches production:');
for (const table of TABLES) {
  console.log(`  ${table}: ${local.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get().n} rows`);
}
local.close();
