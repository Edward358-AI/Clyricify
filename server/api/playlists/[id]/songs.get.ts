import { requireUser } from '../../../utils/session';
import { db } from '../../../database';
import { playlists, playlistSongs, songs } from '../../../database/schema';
import { eq, and, desc } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const user = await requireUser(event);
  const playlistId = getRouterParam(event, 'id');

  if (!playlistId) {
    throw createError({ statusCode: 400, statusMessage: 'Playlist ID required' });
  }

  // Verify playlist belongs to user
  const playlist = await db.query.playlists.findFirst({
    where: and(eq(playlists.id, playlistId), eq(playlists.userId, user.id))
  });

  if (!playlist) {
    throw createError({ statusCode: 404, statusMessage: 'Playlist not found' });
  }

  // Get songs joined with playlist_songs
  const results = await db.select({
    song: songs,
    addedAt: playlistSongs.addedAt
  })
  .from(playlistSongs)
  .innerJoin(songs, eq(playlistSongs.songId, songs.id))
  .where(eq(playlistSongs.playlistId, playlistId))
  .orderBy(desc(playlistSongs.addedAt));

  // Format the output
  const playlistSongsList = results.map(row => ({
    ...row.song,
    meta: row.song.metaJson ? JSON.parse(row.song.metaJson) : null,
    lyrics: row.song.lyricsJson ? JSON.parse(row.song.lyricsJson) : null,
    addedAt: row.addedAt
  }));

  return { songs: playlistSongsList };
});
