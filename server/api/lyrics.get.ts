import NeteaseApi from 'NeteaseCloudMusicApi'
const { lyric: neteaseLyric } = NeteaseApi as any
import { pinyin } from 'pinyin-pro'

interface LyricLine {
  chinese: string
  pinyin: string
  english: string
}

// ─────────────────────────────────────────────────────────────
// Utility: Strip LRC timestamps like [00:12.34] from lyrics
// ─────────────────────────────────────────────────────────────
function stripTimestamps(lrcText: string): string[] {
  return lrcText
    .split('\n')
    .map((line) => line.replace(/\[\d{2}:\d{2}[.:]\d{2,3}\]/g, '').trim())
    .filter((line) => line.length > 0)
}

// ─────────────────────────────────────────────────────────────
// Utility: Check if a line contains Chinese characters
// ─────────────────────────────────────────────────────────────
function containsChinese(text: string): boolean {
  return /[\u4e00-\u9fff\u3400-\u4dbf]/.test(text)
}

// ─────────────────────────────────────────────────────────────
// Utility: Filter to Chinese-only lines, skip metadata
// ─────────────────────────────────────────────────────────────
function filterChineseLines(lines: string[]): string[] {
  return lines.filter((line) => {
    if (/^(作词|作曲|编曲|制作人?|录音|混音|母带|监制|出品|词|曲|编|OP|SP|音乐总监|和声|秀导|音乐统筹)\s*[：:]/i.test(line)) {
      return false
    }
    return containsChinese(line)
  })
}

// ─────────────────────────────────────────────────────────────
// LRCLIB Lyrics — re-search by track name + artist to get lyrics
// ─────────────────────────────────────────────────────────────
async function fetchLrclibLyrics(lrclibId: string, trackName: string, artistName: string): Promise<string> {
  const params = new URLSearchParams({
    track_name: trackName,
    artist_name: artistName,
  })

  const response = await fetch(`https://lrclib.net/api/search?${params}`, {
    headers: { 'User-Agent': 'Clyricify/1.0 (https://github.com/clyricify)' },
  })

  if (!response.ok) throw new Error(`LRCLIB search returned ${response.status}`)

  const results = await response.json()
  if (!Array.isArray(results) || results.length === 0) throw new Error('LRCLIB returned no results')

  const numericId = parseInt(lrclibId)
  const match = results.find((r: any) => r.id === numericId) || results[0]

  const lrc = match.syncedLyrics || match.plainLyrics
  if (!lrc || lrc.trim().length === 0) throw new Error('LRCLIB record has no lyrics')

  return lrc
}

// ─────────────────────────────────────────────────────────────
// NetEase Lyrics — fetch by song ID
// ─────────────────────────────────────────────────────────────
async function fetchNeteaseLyrics(songId: number): Promise<string> {
  const result = await neteaseLyric({ id: songId })
  const lrc = result.body?.lrc?.lyric
  if (!lrc || lrc.trim().length === 0) throw new Error('NetEase returned empty lyrics')
  return lrc
}

// ─────────────────────────────────────────────────────────────
// MAIN HANDLER
// Source is derived from the prefixed ID (e.g. "lrclib_123", "netease_456")
// ─────────────────────────────────────────────────────────────
export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const id = query.id as string
  const name = query.name as string
  const artist = query.artist as string

  if (!id) {
    return { success: false, lyrics: [], error: 'Missing required parameter: id' }
  }

  // Extract source and raw ID from the prefixed ID
  const source = id.startsWith('lrclib_') ? 'lrclib' : id.startsWith('netease_') ? 'netease' : null
  const rawId = id.replace(/^(lrclib|netease)_/, '')

  if (!source) {
    return { success: false, lyrics: [], error: `Unknown source in ID: ${id}` }
  }

  try {
    let rawLrc: string

    switch (source) {
      case 'lrclib':
        rawLrc = await fetchLrclibLyrics(rawId, name || '', artist || '')
        break
      case 'netease':
        rawLrc = await fetchNeteaseLyrics(Number(rawId))
        break
    }

    // Process: strip timestamps → filter Chinese → pinyin → translate
    const allLines = stripTimestamps(rawLrc)
    const chineseLines = filterChineseLines(allLines)

    if (chineseLines.length === 0) {
      return { success: false, lyrics: [], error: 'No Chinese lyrics found for this song.' }
    }

    const pinyinLines = chineseLines.map((line) =>
      pinyin(line, { toneType: 'symbol', type: 'string' })
    )

    const chineseBlock = chineseLines.join('\n')
    const translatedBlock = await translateText(chineseBlock)
    const englishLines = translatedBlock
      ? translatedBlock.split('\n')
      : chineseLines.map(() => '')

    while (englishLines.length < chineseLines.length) {
      englishLines.push('')
    }

    const lyrics: LyricLine[] = chineseLines.map((line, i) => ({
      chinese: line,
      pinyin: pinyinLines[i] || '',
      english: englishLines[i] || '',
    }))

    return { success: true, lyrics }
  } catch (error: any) {
    console.error(`[/api/lyrics] Error (${source}):`, error.message || error)
    return {
      success: false,
      lyrics: [],
      error: error.message || 'Failed to fetch or process lyrics.',
    }
  }
})
