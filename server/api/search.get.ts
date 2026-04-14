import NeteaseApi from 'NeteaseCloudMusicApi'
const { cloudsearch } = NeteaseApi as any

interface SongResult {
  id: string
  name: string
  artist: string
  album: string
  coverUrl: string
  duration: number
  source: 'lrclib' | 'netease'
}

// ─────────────────────────────────────────────────────────────
// LRCLIB Search — free, open-source lyrics database
// ─────────────────────────────────────────────────────────────
async function searchLrclib(query: string): Promise<SongResult[]> {
  const params = new URLSearchParams({ q: query })
  const response = await fetch(`https://lrclib.net/api/search?${params}`, {
    headers: { 'User-Agent': 'Clyricify/1.0 (https://github.com/clyricify)' },
  })

  if (!response.ok) return []

  const results = await response.json()
  if (!Array.isArray(results)) return []

  return results
    .filter((r: any) => r.syncedLyrics || r.plainLyrics)
    .map((r: any) => ({
      id: `lrclib_${r.id}`,
      name: r.trackName || r.name || '',
      artist: r.artistName || '',
      album: r.albumName || '',
      coverUrl: '',
      duration: Math.round((r.duration || 0) * 1000),
      source: 'lrclib' as const,
    }))
}

// ─────────────────────────────────────────────────────────────
// NetEase Search — via NeteaseCloudMusicApi npm package
// ─────────────────────────────────────────────────────────────
async function searchNetease(query: string): Promise<SongResult[]> {
  const searchResult = await cloudsearch({
    keywords: query,
    type: 1,
    limit: 10,
  })

  const songs = searchResult.body?.result?.songs || []

  return songs.map((song: any) => ({
    id: `netease_${song.id}`,
    name: song.name,
    artist: song.ar?.map((a: any) => a.name).join(', ') || 'Unknown Artist',
    album: song.al?.name || 'Unknown Album',
    coverUrl: song.al?.picUrl || '',
    duration: song.dt || 0,
    source: 'netease' as const,
  }))
}

// ─────────────────────────────────────────────────────────────
// MAIN HANDLER
// Fires BOTH sources in parallel, merges & interleaves results.
// Each result is tagged with its source for routing lyrics later.
// ─────────────────────────────────────────────────────────────
export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const q = (query.q as string)?.trim()

  if (!q || q.length === 0) {
    return { results: [] }
  }

  try {
    // Fire both searches in parallel
    const [lrclibResults, neteaseResults] = await Promise.allSettled([
      searchLrclib(q),
      searchNetease(q),
    ])

    const lrclib = lrclibResults.status === 'fulfilled' ? lrclibResults.value : []
    const netease = neteaseResults.status === 'fulfilled' ? neteaseResults.value : []

    // Interleave results: alternate between sources for variety,
    // then append any remaining from the longer list
    const merged: SongResult[] = []
    const maxLen = Math.max(lrclib.length, netease.length)

    for (let i = 0; i < maxLen; i++) {
      if (i < lrclib.length) merged.push(lrclib[i])
      if (i < netease.length) merged.push(netease[i])
    }

    return { results: merged }
  } catch (error: any) {
    console.error('[/api/search] Error:', error.message || error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to search for songs. Please try again.',
    })
  }
})
