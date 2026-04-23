import { requireAuthUser } from '../../../../utils/session';
import { db } from '../../../../database';
import { playlists, playlistSongs, songs } from '../../../../database/schema';
import { eq, and } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const user = await requireAuthUser(event);
  const playlistId = getRouterParam(event, 'id');
  const songId = getRouterParam(event, 'songId');

  if (!playlistId || !songId) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid request parameters' });
  }

  // Check playlist ownership
  const playlist = await db.query.playlists.findFirst({
    where: and(eq(playlists.id, playlistId), eq(playlists.userId, user.id))
  });

  if (!playlist) {
    throw createError({ statusCode: 404, statusMessage: 'Playlist not found' });
  }

  // Delete song from playlist
  await db.delete(playlistSongs).where(
    and(
      eq(playlistSongs.playlistId, playlistId),
      eq(playlistSongs.songId, songId)
    )
  );

  // Check if song is in any other playlist
  const otherPlaylists = await db.query.playlistSongs.findFirst({
    where: eq(playlistSongs.songId, songId)
  });

  // If not, safely remove from cache so we don't store orphaned songs
  if (!otherPlaylists) {
    await db.delete(songs).where(eq(songs.id, songId));
  }

  return { success: true };
});
