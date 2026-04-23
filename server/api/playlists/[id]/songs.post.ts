import { requireUser } from '../../../utils/session';
import { db } from '../../../database';
import { playlists, playlistSongs, songs } from '../../../database/schema';
import { eq, and } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const user = await requireUser(event);
  const playlistId = getRouterParam(event, 'id');
  const body = await readBody(event);
  const { song } = body;

  if (!playlistId || !song || !song.id) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid request data' });
  }

  // Check playlist ownership
  const playlist = await db.query.playlists.findFirst({
    where: and(eq(playlists.id, playlistId), eq(playlists.userId, user.id))
  });

  if (!playlist) {
    throw createError({ statusCode: 404, statusMessage: 'Playlist not found' });
  }

  // Check if song already exists in songs table, if not, insert it (without lyrics for now, lyrics fetched on demand)
  const existingSong = await db.query.songs.findFirst({
    where: eq(songs.id, song.id)
  });

  if (!existingSong) {
    await db.insert(songs).values({
      id: song.id,
      name: song.name,
      artist: song.artist,
      album: song.album || '',
      coverUrl: song.coverUrl || '',
      duration: song.duration || 0,
      source: song.source || 'unknown',
      lastUpdated: 0 // 0 means lyrics need to be fetched
    });
  }

  // Check if song is already in this playlist
  const existingPlaylistSong = await db.query.playlistSongs.findFirst({
    where: and(
      eq(playlistSongs.playlistId, playlistId),
      eq(playlistSongs.songId, song.id)
    )
  });

  if (existingPlaylistSong) {
    throw createError({ statusCode: 409, statusMessage: 'Song is already in this playlist' });
  }

  // Insert into playlist_songs
  await db.insert(playlistSongs).values({
    playlistId,
    songId: song.id,
    addedAt: Date.now()
  });

  // Trigger background update queue for the newly added song
  if (song.source !== 'local') {
    import('../../../utils/updateQueue').then(({ lyricUpdateQueue }) => {
      lyricUpdateQueue.push({ id: song.id, name: song.name, artist: song.artist });
    });
  }

  return { success: true };
});
