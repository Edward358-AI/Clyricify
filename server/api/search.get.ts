import NeteaseApi from 'NeteaseCloudMusicApi'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import Meting from '@meting/core'
import { db } from '../database'
import { songs } from '../database/schema'
import { like, or } from 'drizzle-orm'
const { cloudsearch } = NeteaseApi as any

interface SongResult {
  id: string
  name: string
  artist: string
  album?: string
  coverUrl?: string
  duration?: number
  source: 'lrclib' | 'netease' | 'kugou' | 'local'
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
// KuGou Search — via @meting/core npm package
// ─────────────────────────────────────────────────────────────
async function searchKugou(query: string): Promise<SongResult[]> {
  const meting = new Meting('kugou')
  meting.format(true)

  const searchResult = await meting.search(query, { page: 1, limit: 10 })
  const songs = JSON.parse(searchResult)

  if (!Array.isArray(songs)) return []

  return songs.map((song: any) => ({
    id: `kugou_${song.id}`,
    name: song.name || '',
    artist: Array.isArray(song.artist) ? song.artist.join(', ') : (song.artist || ''),
    album: song.album || '',
    coverUrl: '',
    duration: 0,
    source: 'kugou' as const,
  }))
}

// ─────────────────────────────────────────────────────────────
// LOCAL Search (SQLite + JSON fallback)
// ─────────────────────────────────────────────────────────────
async function searchLocal(query: string): Promise<SongResult[]> {
  try {
    const results: SongResult[] = []

    // Search legacy JSON fallback (custom local songs)
    const dir = path.resolve(process.cwd(), 'database/songs')
    if (fs.existsSync(dir)) {
      const files = fs.readdirSync(dir)
      for (const file of files) {
        if (!file.endsWith('.json')) continue
        if (file === 'template.json') continue
        
        const content = fs.readFileSync(path.join(dir, file), 'utf-8')
        try {
          const data = JSON.parse(content)
          const nameMatch = data.name?.toLowerCase().includes(query.toLowerCase())
          const artistMatch = data.artist?.toLowerCase().includes(query.toLowerCase())
          
          if (nameMatch || artistMatch) {
            const id = `local_${file.replace('.json', '')}`
            if (!results.find(r => r.id === id)) {
              results.push({
                id,
                name: data.name || 'Unknown',
                artist: data.artist || 'Unknown',
                album: data.album || '',
                coverUrl: data.coverUrl || '',
                duration: data.duration || 0,
                source: 'local'
              })
            }
          }
        } catch (e) {
          console.error(`Error parsing JSON file ${file}:`, e)
        }
      }
    }
    
    return results
  } catch (error) {
    console.error("[Local DB] Search failed", error)
    return []
  }
}

// ─────────────────────────────────────────────────────────────
// MAIN HANDLER
// Fires ALL sources in parallel, merges & interleaves results.
// Each result is tagged with its source for routing lyrics later.
// ─────────────────────────────────────────────────────────────
export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const q = (query.q as string)?.trim()

  if (!q || q.length === 0) {
    return { results: [] }
  }

  try {
    // Fire all searches in parallel
    const searchPromises = [
      searchLrclib(q),
      searchNetease(q),
      searchKugou(q),
      searchLocal(q)
    ]
    const settled = await Promise.allSettled(searchPromises)

    const lrclib: SongResult[] = (settled[0]?.status === 'fulfilled') ? ((settled[0] as any).value || []) : []
    const netease: SongResult[] = (settled[1]?.status === 'fulfilled') ? ((settled[1] as any).value || []) : []
    const kugou: SongResult[] = (settled[2]?.status === 'fulfilled') ? ((settled[2] as any).value || []) : []
    const localDb: SongResult[] = (settled[3]?.status === 'fulfilled') ? ((settled[3] as any).value || []) : []

    // Interleave results: alternate between sources for variety
    const merged: SongResult[] = []
    
    // Custom local songs shouldn't be filtered out, we prioritize them
    const maxLen = Math.max(lrclib.length, netease.length, kugou.length, localDb.length)

    for (let i = 0; i < maxLen; i++) {
      if (i < localDb.length && localDb[i]) merged.push((localDb as any)[i]) // prioritize custom local DB
      if (i < lrclib.length && lrclib[i]) merged.push((lrclib as any)[i])
      if (i < netease.length && netease[i]) merged.push((netease as any)[i])
      if (i < kugou.length && kugou[i]) merged.push((kugou as any)[i])
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
