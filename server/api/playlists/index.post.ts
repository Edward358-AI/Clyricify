import { requireAuthUser } from '../../utils/session';
import { db } from '../../database';
import { playlists } from '../../database/schema';
import crypto from 'crypto';

export default defineEventHandler(async (event) => {
  const user = await requireAuthUser(event);
  const body = await readBody(event);
  
  if (!body.name || body.name.trim() === '') {
    throw createError({ statusCode: 400, statusMessage: 'Playlist name is required' });
  }

  const playlistId = crypto.randomUUID();
  await db.insert(playlists).values({
    id: playlistId,
    userId: user.id,
    name: body.name.trim(),
    createdAt: Date.now()
  });

  return { success: true, playlist: { id: playlistId, name: body.name.trim() } };
});
