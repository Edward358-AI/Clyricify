import { requireUser } from '../../utils/session';
import { db } from '../../database';
import { playlists } from '../../database/schema';
import { eq, desc } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const user = await requireUser(event);

  const userPlaylists = await db.query.playlists.findMany({
    where: eq(playlists.userId, user.id),
    orderBy: [desc(playlists.createdAt)]
  });

  return { playlists: userPlaylists };
});
