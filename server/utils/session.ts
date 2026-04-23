import { getCookie, setCookie, deleteCookie, H3Event } from 'h3';
import { eq } from 'drizzle-orm';
import { db } from '../database';
import { sessions, users } from '../database/schema';
import crypto from 'crypto';

const SESSION_COOKIE = 'clyricify_session';
const SESSION_EXPIRATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export async function createSession(event: H3Event, userId: string) {
  const sessionId = crypto.randomUUID();
  const expiresAt = Date.now() + SESSION_EXPIRATION_MS;

  await db.insert(sessions).values({
    id: sessionId,
    userId,
    expiresAt
  });

  setCookie(event, SESSION_COOKIE, sessionId, {
    maxAge: SESSION_EXPIRATION_MS / 1000,
    httpOnly: true,
    path: '/',
    sameSite: 'lax',
  });
}

export async function requireUser(event: H3Event) {
  const sessionId = getCookie(event, SESSION_COOKIE);
  if (!sessionId) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' });
  }

  const session = await db.query.sessions.findFirst({
    where: eq(sessions.id, sessionId),
  });

  if (!session || session.expiresAt < Date.now()) {
    if (sessionId) deleteCookie(event, SESSION_COOKIE);
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' });
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, session.userId),
  });

  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' });
  }

  return {
    id: user.id,
    username: user.username,
    createdAt: user.createdAt
  };
}

export async function getUser(event: H3Event) {
  try {
    return await requireUser(event);
  } catch (err) {
    return null;
  }
}

export async function clearSession(event: H3Event) {
  const sessionId = getCookie(event, SESSION_COOKIE);
  if (sessionId) {
    await db.delete(sessions).where(eq(sessions.id, sessionId));
    deleteCookie(event, SESSION_COOKIE);
  }
}
