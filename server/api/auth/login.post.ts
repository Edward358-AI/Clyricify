import { db } from '../../database';
import { users } from '../../database/schema';
import crypto from 'crypto';
import { createSession } from '../../utils/session';
import { eq } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { username, password } = body;

  if (!username || !password) {
    throw createError({ statusCode: 400, statusMessage: 'Username and password required' });
  }

  const user = await db.query.users.findFirst({
    where: eq(users.username, username),
  });

  if (!user) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid credentials' });
  }

  const [salt, key] = user.passwordHash.split(':');
  const hash = crypto.pbkdf2Sync(password, salt as string, 1000, 64, 'sha512').toString('hex');

  if (key !== hash) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid credentials' });
  }

  await createSession(event, user.id);

  return { success: true, user: { id: user.id, username: user.username } };
});
