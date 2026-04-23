import { db } from '../../database';
import { users } from '../../database/schema';
import crypto from 'crypto';
import { createUserSession } from '../../utils/session';
import { eq } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { username, password } = body;

  if (!username || !password || username.length < 3 || password.length < 6) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid username or password (minimum 3 and 6 chars respectively)' });
  }

  const existingUser = await db.query.users.findFirst({
    where: eq(users.username, username),
  });

  if (existingUser) {
    throw createError({ statusCode: 400, statusMessage: 'Username already exists' });
  }

  // Simple hash for demo purposes. In production use bcrypt/argon2.
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  const passwordHash = `${salt}:${hash}`;
  const userId = crypto.randomUUID();

  await db.insert(users).values({
    id: userId,
    username,
    passwordHash,
    createdAt: Date.now()
  });

  await createUserSession(event, userId);

  return { success: true, user: { id: userId, username } };
});
