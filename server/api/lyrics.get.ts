import NeteaseApi from 'NeteaseCloudMusicApi'
const { lyric: neteaseLyric } = NeteaseApi as any
import { pinyin } from 'pinyin-pro'

interface LyricLine {
  chinese: string
  pinyin: string
  english: string
  isPlainText: boolean  // true for English/non-Chinese lines (no pinyin/translation needed)
}

interface SongMeta {
  lyricist?: string
  composer?: string
  arranger?: string
  producer?: string
  album?: string
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
// Metadata extraction patterns
// ─────────────────────────────────────────────────────────────
const META_PATTERNS: { key: keyof SongMeta; patterns: RegExp[] }[] = [
  {
    key: 'lyricist',
    patterns: [
      /^(?:作词|填词|词|作詞|填詞|詞)\s*[：:]\s*(.+)/i,
    ],
  },
  {
    key: 'composer',
    patterns: [
      /^(?:作曲|曲|谱曲|作曲者|譜曲)\s*[：:]\s*(.+)/i,
    ],
  },
  {
    key: 'arranger',
    patterns: [
      /^(?:编曲|編曲|编|編)\s*[：:]\s*(.+)/i,
    ],
  },
  {
    key: 'producer',
    patterns: [
      /^(?:制作人|製作人|监制|監製|出品)\s*[：:]\s*(.+)/i,
    ],
  },
]

// Lines that should be filtered out (metadata, credits, copyright, etc.)
const FILTER_PATTERNS = [
  // Credits and production metadata (Simplified)
  /^(?:作词|作曲|编曲|填词|谱曲|制作人?|录音|混音|母带|监制|出品|词|曲|编|OP|SP|音乐总监|和声|秀导|音乐统筹|配唱|弦乐|吉他|贝斯?|鼓|钢琴|键盘|合声|导演|企划|统筹|企宣|宣传|发行|封面|美术|摄影|视觉|文案|策划|特别鸣谢)\s*[：:]/i,
  // Traditional Chinese variants
  /^(?:作詞|作曲|編曲|填詞|譜曲|製作人?|錄音|混音|母帶|監製|出品|詞|曲|編|音樂總監|和聲|秀導|音樂統籌)\s*[：:]/i,
  // English credits
  /^(?:lyrics|composed?r?|arranged?r?|produced?r?|mixed|master|recorded?|vocal|guitar|bass|drum|piano|keyboard|string|executive|director)\s*[：:by]/i,
  // Copyright and label info
  /^(?:©|℗|\(c\)|copyright|powered\s+by|provided\s+by|licensed|all\s+rights|rights?\s+reserved|under\s+exclusive|distributed|published|courtesy|℗&©)/i,
  // Record label / publisher lines
  /(?:Records?|Music|Entertainment|Productions?|Studios?|Label|Publishing)\s*(?:Co\.|Inc\.|Ltd\.|LLC|,|$)/i,
  // Flexible spacing credits
  /^(?:制作人|製作人)\s+[:：]\s*/i,
  // Instrumental markers
  /^(?:纯音乐|純音樂|Instrumental)/i,
  // Lines entirely enclosed in fancy brackets (usually copyright/declarations like 【本作品声明...】)
  /^【.*】\s*$/,
]

function isMetadataLine(line: string): boolean {
  return FILTER_PATTERNS.some((pattern) => pattern.test(line))
}

// ─────────────────────────────────────────────────────────────
// Extract metadata and separate lyric lines from raw lines.
// Keeps ALL lyric lines (Chinese AND English), only strips metadata.
// ─────────────────────────────────────────────────────────────
function extractMetaAndLyrics(lines: string[]): { meta: SongMeta; lyrics: string[] } {
  const meta: SongMeta = {}
  const lyricsOut: string[] = []

  for (const line of lines) {
    // Try to extract metadata
    let isExtractedMeta = false
    for (const { key, patterns } of META_PATTERNS) {
      for (const pattern of patterns) {
        const match = line.match(pattern)
        if (match) {
          meta[key] = match[1].trim()
          isExtractedMeta = true
          break
        }
      }
      if (isExtractedMeta) break
    }

    // Skip if it's extracted metadata or a filtered credit/copyright line
    if (isExtractedMeta) continue
    if (isMetadataLine(line)) continue

    // Keep ALL remaining lines (Chinese, English, mixed)
    lyricsOut.push(line)
  }

  return { meta, lyrics: lyricsOut }
}

// ─────────────────────────────────────────────────────────────
// LRCLIB Lyrics — re-search by track name + artist
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
// Detects if lyrics are Chinese or English and processes accordingly.
// Chinese lines → pinyin + translation
// English/non-Chinese lines → plain text (no processing)
// ─────────────────────────────────────────────────────────────
export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const id = query.id as string
  const name = query.name as string
  const artist = query.artist as string

  if (!id) {
    return { success: false, lyrics: [], error: 'Missing required parameter: id' }
  }

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

    // Strip timestamps and extract metadata
    const allLines = stripTimestamps(rawLrc)
    const { meta, lyrics: lyricLines } = extractMetaAndLyrics(allLines)

    if (lyricLines.length === 0) {
      return { success: false, lyrics: [], error: 'No lyrics found for this song.' }
    }

    // Separate Chinese and non-Chinese lines, tracking their indices
    const chineseIndices: number[] = []
    const chineseTexts: string[] = []

    lyricLines.forEach((line, i) => {
      if (containsChinese(line)) {
        chineseIndices.push(i)
        chineseTexts.push(line)
      }
    })

    const hasChinese = chineseTexts.length > 0

    // Generate pinyin only for Chinese lines
    const pinyinMap = new Map<number, string>()
    if (hasChinese) {
      chineseTexts.forEach((text, i) => {
        pinyinMap.set(chineseIndices[i], pinyin(text, { toneType: 'symbol', type: 'string' }))
      })
    }

    // Translate only Chinese lines
    const translationMap = new Map<number, string>()
    if (hasChinese) {
      const chineseBlock = chineseTexts.join('\n')
      const translatedBlock = await translateText(chineseBlock)
      if (translatedBlock) {
        const englishLines = translatedBlock.split('\n')
        chineseIndices.forEach((originalIdx, i) => {
          translationMap.set(originalIdx, englishLines[i] || '')
        })
      }
    }

    // Build final lyrics array
    const lyrics: LyricLine[] = lyricLines.map((line, i) => {
      const isChinese = containsChinese(line)
      return {
        chinese: line,
        pinyin: pinyinMap.get(i) || '',
        english: translationMap.get(i) || '',
        isPlainText: !isChinese,
      }
    })

    return { success: true, lyrics, meta, hasChinese }
  } catch (error: any) {
    console.error(`[/api/lyrics] Error (${source}):`, error.message || error)
    return {
      success: false,
      lyrics: [],
      error: error.message || 'Failed to fetch or process lyrics.',
    }
  }
})
