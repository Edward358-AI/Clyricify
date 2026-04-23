import { defineConfig } from 'drizzle-kit';
import path from 'path';

const tursoUrl = process.env.TURSO_DATABASE_URL;
const tursoToken = process.env.TURSO_AUTH_TOKEN;

export default defineConfig({
  schema: './server/database/schema.ts',
  out: './server/database/migrations',
  dialect: tursoUrl ? 'turso' : 'sqlite',
  dbCredentials: {
    url: tursoUrl || path.resolve('database/clyricify.db'),
    authToken: tursoToken,
  }
});
