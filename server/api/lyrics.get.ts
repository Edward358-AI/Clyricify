import NeteaseApi from 'NeteaseCloudMusicApi'
const { lyric: neteaseLyric } = NeteaseApi as any
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { pinyin } from 'pinyin-pro'
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai'
import Meting from '@meting/core'

interface LyricLine {
  chinese: string
  pinyin: string
  english: string
  isPlainText: boolean
}

interface SongMeta {
  lyricist?: string
  composer?: string
  arranger?: string
  producer?: string
  album?: string
}

interface ProcessedLyrics {
  meta: SongMeta
  lyrics: string[]
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
// TIER 3 FALLBACK: Code-based lyrics extractor
// Pure regex/heuristic approach — no AI needed
// ─────────────────────────────────────────────────────────────
function extractLyricsWithCode(rawLines: string[]): ProcessedLyrics {
  const meta: SongMeta = {}
  const lyricLines: string[] = []

  // Metadata patterns (Chinese & English)
  const metaPatterns: { key: keyof SongMeta; patterns: RegExp[] }[] = [
    {
      key: 'lyricist',
      patterns: [
        /^作词\s*[：:]\s*(.+)/i,
        /^词\s*[：:]\s*(.+)/i,
        /^lyricist\s*[：:]\s*(.+)/i,
        /^words?\s*[：:]\s*(.+)/i,
        /^作词作曲\s*[：:]\s*(.+)/i,
      ]
    },
    {
      key: 'composer',
      patterns: [
        /^作曲\s*[：:]\s*(.+)/i,
        /^曲\s*[：:]\s*(.+)/i,
        /^composer\s*[：:]\s*(.+)/i,
        /^music\s*[：:]\s*(.+)/i,
      ]
    },
    {
      key: 'arranger',
      patterns: [
        /^编曲\s*[：:]\s*(.+)/i,
        /^arranger?\s*[：:]\s*(.+)/i,
        /^arrangement\s*[：:]\s*(.+)/i,
      ]
    },
    {
      key: 'producer',
      patterns: [
        /^制作人\s*[：:]\s*(.+)/i,
        /^producer\s*[：:]\s*(.+)/i,
        /^制作\s*[：:]\s*(.+)/i,
      ]
    },
  ]

  // Lines to filter out (copyright, system text, instrumental markers, etc.)
  const filterPatterns: RegExp[] = [
    /^[\s]*$/,
    /©/,
    /℗/,
    /all\s*rights?\s*reserved/i,
    /produced\s*by/i,
    /mixed\s*by/i,
    /mastered\s*by/i,
    /recorded\s*(at|by)/i,
    /recording\s*studio/i,
    /publishing/i,
    /^OP\s*[：:]/i,
    /^SP\s*[：:]/i,
    /^TP\s*[：:]/i,
    /^MV\s*[：:]/i,
    /https?:\/\//i,
    /www\./i,
    /^纯音乐[，,]?\s*请欣赏/,
    /^\s*instrumental\s*$/i,
    /^此歌曲为没有填词的纯音乐/,
    /^监制\s*[：:]/i,
    /^企划\s*[：:]/i,
    /^统筹\s*[：:]/i,
    /^录音\s*[：:]/i,
    /^混音\s*[：:]/i,
    /^母带\s*[：:]/i,
    /^出品\s*[：:]/i,
    /^发行\s*[：:]/i,
    /^吉他\s*[：:]/i,
    /^贝斯\s*[：:]/i,
    /^鼓\s*[：:]/i,
    /^弦乐\s*[：:]/i,
    /^钢琴\s*[：:]/i,
    /^和声\s*[：:]/i,
    /^配唱\s*[：:]/i,
    /^音乐总监\s*[：:]/i,
    /^vocal\s*(production|producer|recording|editing|arrangement)\s*[：:]/i,
    /^guitar\s*[：:]/i,
    /^bass\s*[：:]/i,
    /^drums?\s*[：:]/i,
    /^piano\s*[：:]/i,
    /^strings?\s*[：:]/i,
    /^mixing\s*(engineer)?\s*[：:]/i,
    /^mastering\s*(engineer)?\s*[：:]/i,
    /^executive\s*producer\s*[：:]/i,
    /^a\u0026r\s*[：:]/i,
  ]

  for (const line of rawLines) {
    const trimmed = line.trim()
    if (!trimmed) continue

    // Try to extract metadata
    let isMetadata = false
    for (const { key, patterns } of metaPatterns) {
      for (const pattern of patterns) {
        const match = trimmed.match(pattern)
        if (match) {
          // Special case: 作词作曲 sets both lyricist and composer
          if (/^作词作曲/.test(trimmed)) {
            meta.lyricist = match[1]!.trim()
            meta.composer = match[1]!.trim()
          } else {
            meta[key] = match[1]!.trim()
          }
          isMetadata = true
          break
        }
      }
      if (isMetadata) break
    }
    if (isMetadata) continue

    // Check if line should be filtered out
    let shouldFilter = false
    for (const pattern of filterPatterns) {
      if (pattern.test(trimmed)) {
        shouldFilter = true
        break
      }
    }
    if (shouldFilter) continue

    // Remaining lines are actual lyrics
    lyricLines.push(trimmed)
  }

  console.log('[Code Extractor] Extracted', lyricLines.length, 'lyric lines and metadata:', JSON.stringify(meta))
  return { meta, lyrics: lyricLines }
}

// ─────────────────────────────────────────────────────────────
// Gemini AI API Call (shared logic for Tier 1 & Tier 2)
// ─────────────────────────────────────────────────────────────
async function callGemini(rawLines: string[], apiKey: string, modelName: string): Promise<ProcessedLyrics> {
  if (!apiKey) {
    throw new Error(`Gemini API key is not configured for model ${modelName}.`)
  }

  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({
    model: modelName,
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: {
        type: SchemaType.OBJECT,
        properties: {
          metadata: {
            type: SchemaType.OBJECT,
            properties: {
              lyricist: { type: SchemaType.STRING, description: "Name of the lyricist or '作词'. Null if not found." },
              composer: { type: SchemaType.STRING, description: "Name of the composer or '作曲'. Null if not found." },
              arranger: { type: SchemaType.STRING, description: "Name of the arranger or '编曲'. Null if not found." },
              producer: { type: SchemaType.STRING, description: "Name of the producer or '制作人'. Null if not found." }
            }
          },
          lyricLines: {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.STRING },
            description: "List of exactly all actual sung lyric strings in order. Absolutely DO NOT include metadata, credit lines, publishers, instrumental markers, copyright info, system labels, or declarations. Keep all languages."
          }
        },
        required: ["metadata", "lyricLines"]
      }
    }
  })

  const prompt = `You are an expert music lyrics parser.
I will give you a raw list of lines from an LRC file that has its timestamps removed.
Your job is to identify and separate the song metadata from the actual sung lyrics.

RULES:
1. Extract any metadata you can find (lyricist, composer, arranger, producer, etc.). If a field is not found, leave it empty.
2. Filter out ALL copyright declarations, publishing info, recording studios, "produced by", "mixed by", "all rights reserved", and any other non-sung system text.
3. Keep ALL the actual sung lyric lines exactly as they are written, including English and Chinese. Maintain their order. Do not translate them.
4. Return a JSON matching the requested schema.

Raw Lyrics:
${rawLines.join('\n')}`

  const result = await model.generateContent(prompt)
  const responseText = result.response.text()

  try {
    const data = JSON.parse(responseText)
    return {
      meta: data.metadata || {},
      lyrics: data.lyricLines || []
    }
  } catch (e) {
    console.error("Failed to parse Gemini response:", responseText)
    throw new Error("Invalid format returned by Gemini AI")
  }
}

// ─────────────────────────────────────────────────────────────
// 3-Tier Fallback Cascade
// Tier 1: gemini-2.5-flash (primary key)
// Tier 2: gemini-2.5-flash-lite (fallback key)
// Tier 3: Code-based extractor (no AI)
// ─────────────────────────────────────────────────────────────
async function processLyricsWithFallback(rawLines: string[], primaryKey: string, fallbackKey: string): Promise<ProcessedLyrics> {
  // ── Tier 1: gemini-2.5-flash with primary key ──
  try {
    console.log('[Lyrics] Tier 1: Trying gemini-2.5-flash...')
    const result = await callGemini(rawLines, primaryKey, 'gemini-2.5-flash')
    console.log('[Lyrics] Tier 1 succeeded.')
    return result
  } catch (err: any) {
    console.warn('[Lyrics] Tier 1 failed:', err.message || err)
  }

  // ── Tier 2: gemini-2.5-flash-lite with fallback key ──
  if (fallbackKey) {
    try {
      console.log('[Lyrics] Tier 2: Trying gemini-2.5-flash-lite with fallback key...')
      const result = await callGemini(rawLines, fallbackKey, 'gemini-2.5-flash-lite')
      console.log('[Lyrics] Tier 2 succeeded.')
      return result
    } catch (err: any) {
      console.warn('[Lyrics] Tier 2 failed:', err.message || err)
    }
  } else {
    console.warn('[Lyrics] Tier 2 skipped: No GEMINI_API_FALLBACK key configured.')
  }

  // ── Tier 3: Code-based extractor ──
  console.log('[Lyrics] Tier 3: Falling back to code-based lyric extractor...')
  return extractLyricsWithCode(rawLines)
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
// KuGou Lyrics — via @meting/core npm package
// Uses the lyric_id from the Meting search result
// ─────────────────────────────────────────────────────────────
async function fetchKugouLyrics(songId: string): Promise<string> {
  const meting = new Meting('kugou')
  meting.format(true)

  const lyricResult = await meting.lyric(songId)
  const data = JSON.parse(lyricResult)

  // Meting returns { lyric: "...", tlyric: "..." } when formatted
  const lrc = data?.lyric || data?.lrc || ''

  if (!lrc || lrc.trim().length === 0) {
    throw new Error('KuGou (Meting) returned empty lyrics')
  }

  return lrc
}

// ─────────────────────────────────────────────────────────────
// MAIN HANDLER
// ─────────────────────────────────────────────────────────────
export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const id = query.id as string
  const name = query.name as string
  const artist = query.artist as string

  if (!id) {
    return { success: false, lyrics: [], error: 'Missing required parameter: id' }
  }

  const source = id.startsWith('lrclib_') ? 'lrclib'
    : id.startsWith('netease_') ? 'netease'
    : id.startsWith('kugou_') ? 'kugou'
    : id.startsWith('local_') ? 'local'
    : null
  const rawId = id.replace(/^(lrclib|netease|kugou|local)_/, '')

  if (!source) {
    return { success: false, lyrics: [], error: `Unknown source in ID: ${id}` }
  }

  try {
    let meta: SongMeta = {}
    let lyricLines: string[] = []

    if (source === 'local') {
      const dir = path.resolve(process.cwd(), 'database/songs')
      const content = fs.readFileSync(path.join(dir, `${rawId}.json`), 'utf-8')
      const data = JSON.parse(content)
      meta = data.meta || {}
      lyricLines = data.lyrics || []
    } else {
      let rawLrc: string = ''
      const config = useRuntimeConfig()

      switch (source) {
        case 'lrclib':
          rawLrc = await fetchLrclibLyrics(rawId, name || '', artist || '')
          break
        case 'netease':
          rawLrc = await fetchNeteaseLyrics(Number(rawId))
          break
        case 'kugou':
          rawLrc = await fetchKugouLyrics(rawId)
          break
      }

      // Strip timestamps
      const allLines = stripTimestamps(rawLrc)
      
      // 3-tier fallback: Gemini Flash → Gemini Flash Lite → Code extractor
      const processed = await processLyricsWithFallback(allLines, config.geminiApiKey, config.geminiApiFallback)
      meta = processed.meta
      lyricLines = processed.lyrics
    }

    if (!lyricLines || lyricLines.length === 0) {
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
        pinyinMap.set(chineseIndices[i] as number, pinyin(text, { toneType: 'symbol', type: 'string' }))
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
          translationMap.set(originalIdx as number, englishLines[i] || '')
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
