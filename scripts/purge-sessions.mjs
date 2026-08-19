// Deletes ALL rows from the production `sessions` table on Turso.
// Every user is logged out; leaked session IDs become useless.
// Usage: set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN (or put them in a
// git-ignored .env.turso file), then
//   node scripts/purge-sessions.mjs
import { createClient } from '@libsql/client';
import { config } from 'dotenv';

config({ path: '.env.turso' });

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url || !authToken) {
  console.error('Set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN in the environment before running.');
  process.exit(1);
}

const client = createClient({ url, authToken });

const before = await client.execute('SELECT COUNT(*) AS n FROM sessions');
console.log(`Sessions before purge: ${before.rows[0].n}`);

await client.execute('DELETE FROM sessions');

const after = await client.execute('SELECT COUNT(*) AS n FROM sessions');
console.log(`Sessions after purge: ${after.rows[0].n}`);
client.close();
