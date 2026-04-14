import NeteaseApi from 'NeteaseCloudMusicApi'
const { lyric: neteaseLyric } = NeteaseApi as any
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { pinyin } from 'pinyin-pro'
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai'

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
// Gemini AI API Call
// Separates the raw lines into structural metadata and actual lyrics
// ─────────────────────────────────────────────────────────────
async function processLyricsWithGemini(rawLines: string[], apiKey: string): Promise<{ meta: SongMeta, lyrics: string[] }> {
  if (!apiKey) {
    throw new Error('Gemini API key is not configured. Please set GEMINI_API_KEY in your .env file.')
  }

  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
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

  let result;
  const maxRetries = 3;
  let delay = 1000;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      result = await model.generateContent(prompt)
      break;
    } catch (error: any) {
      const isTransient = error.status === 503 || error.message?.includes('503') || error.status === 429 || error.message?.includes('429');
      
      if (isTransient && attempt < maxRetries) {
        console.warn(`[Gemini API] Server busy. Retrying in ${delay}ms (attempt ${attempt}/${maxRetries})...`)
        await new Promise(resolve => setTimeout(resolve, delay))
        delay *= 2; // Exponential backoff
      } else {
        throw error; // Throw if other error or out of retries
      }
    }
  }

  if (!result) {
    throw new Error("Failed to communicate with Gemini API after multiple retries.");
  }

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
// ─────────────────────────────────────────────────────────────
export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const id = query.id as string
  const name = query.name as string
  const artist = query.artist as string

  if (!id) {
    return { success: false, lyrics: [], error: 'Missing required parameter: id' }
  }

  const source = id.startsWith('lrclib_') ? 'lrclib' : id.startsWith('netease_') ? 'netease' : id.startsWith('local_') ? 'local' : null
  const rawId = id.replace(/^(lrclib|netease|local)_/, '')

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
      switch (source) {
        case 'lrclib':
          rawLrc = await fetchLrclibLyrics(rawId, name || '', artist || '')
          break
        case 'netease':
          rawLrc = await fetchNeteaseLyrics(Number(rawId))
          break
      }

      // Strip timestamps
      const allLines = stripTimestamps(rawLrc)
      
      // Call Gemini API to extract metadata and pure lyric lines
      const config = useRuntimeConfig()
      const geminiResult = await processLyricsWithGemini(allLines, config.geminiApiKey)
      meta = geminiResult.meta
      lyricLines = geminiResult.lyrics
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
