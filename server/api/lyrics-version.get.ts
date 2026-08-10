import { db } from '../database'
import { songs } from '../database/schema'
import { eq } from 'drizzle-orm'

// Lightweight version check for background-refresh polling.
// Returns only the song's lastUpdated timestamp so the client can
// detect when a queued background refresh has landed in the DB.
export default defineEventHandler(async (event) => {
  const id = getQuery(event).id as string
  if (!id) {
    return { lastUpdated: 0 }
  }

  const row = await db.query.songs.findFirst({
    where: eq(songs.id, id),
    columns: { lastUpdated: true },
  })

  return { lastUpdated: row?.lastUpdated ?? 0 }
})
