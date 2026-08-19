import { db } from '../../database';
import { users } from '../../database/schema';
import { createUserSession } from '../../utils/session';
import { verifyPassword, needsRehash, hashPassword } from '../../utils/password';
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

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid credentials' });
  }

  // Upgrade legacy PBKDF2 hashes to scrypt now that we have the plaintext
  if (needsRehash(user.passwordHash)) {
    await db.update(users)
      .set({ passwordHash: await hashPassword(password) })
      .where(eq(users.id, user.id));
  }

  await createUserSession(event, user.id);

  return { success: true, user: { id: user.id, username: user.username } };
});
