/**
 * Test script for 3-tier Gemini fallback cascade
 * 
 * TEST 1: Tier 1 fails (bad primary key) → Tier 2 should succeed (real fallback key)
 * TEST 2: Both Tier 1 & Tier 2 fail (bad keys) → Tier 3 code extractor should work
 */

import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai'
import dotenv from 'dotenv'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(__dirname, '.env') })

// ── Sample raw lyrics (simulating stripped LRC) ──
const SAMPLE_LYRICS = [
  '作词：林夕',
  '作曲：陈奕迅',
  '编曲：陈辉阳',
  '制作人：陈辉阳',
  '录音：张三',
  '混音：李四',
  '© 2003 Universal Music',
  '爱你不是两三天',
  '想你每个夜晚',
  '心里的话说不完',
  'I love you more than words can say',
  '我不想说再见',
  '每天都想见你的脸',
  'All Rights Reserved',
  'OP: Universal Music Publishing',
]

// ── Tier 3: Code-based extractor ──
function extractLyricsWithCode(rawLines) {
  const meta = {}
  const lyricLines = []

  const metaPatterns = [
    { key: 'lyricist', patterns: [/^作词\s*[：:]\s*(.+)/i, /^词\s*[：:]\s*(.+)/i, /^lyricist\s*[：:]\s*(.+)/i, /^作词作曲\s*[：:]\s*(.+)/i] },
    { key: 'composer', patterns: [/^作曲\s*[：:]\s*(.+)/i, /^曲\s*[：:]\s*(.+)/i, /^composer\s*[：:]\s*(.+)/i] },
    { key: 'arranger', patterns: [/^编曲\s*[：:]\s*(.+)/i, /^arranger?\s*[：:]\s*(.+)/i] },
    { key: 'producer', patterns: [/^制作人\s*[：:]\s*(.+)/i, /^producer\s*[：:]\s*(.+)/i] },
  ]

  const filterPatterns = [
    /^[\s]*$/, /©/, /℗/, /all\s*rights?\s*reserved/i, /produced\s*by/i, /mixed\s*by/i,
    /mastered\s*by/i, /recorded\s*(at|by)/i, /recording\s*studio/i, /publishing/i,
    /^OP\s*[：:]/i, /^SP\s*[：:]/i, /https?:\/\//i, /www\./i,
    /^录音\s*[：:]/i, /^混音\s*[：:]/i, /^母带\s*[：:]/i,
    /^出品\s*[：:]/i, /^发行\s*[：:]/i, /^吉他\s*[：:]/i,
  ]

  for (const line of rawLines) {
    const trimmed = line.trim()
    if (!trimmed) continue

    let isMetadata = false
    for (const { key, patterns } of metaPatterns) {
      for (const pattern of patterns) {
        const match = trimmed.match(pattern)
        if (match) {
          if (/^作词作曲/.test(trimmed)) {
            meta.lyricist = match[1].trim()
            meta.composer = match[1].trim()
          } else {
            meta[key] = match[1].trim()
          }
          isMetadata = true
          break
        }
      }
      if (isMetadata) break
    }
    if (isMetadata) continue

    let shouldFilter = false
    for (const pattern of filterPatterns) {
      if (pattern.test(trimmed)) {
        shouldFilter = true
        break
      }
    }
    if (shouldFilter) continue

    lyricLines.push(trimmed)
  }

  return { meta, lyrics: lyricLines }
}

// ── Gemini caller ──
async function callGemini(rawLines, apiKey, modelName) {
  if (!apiKey) throw new Error(`Gemini API key is not configured for model ${modelName}.`)

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
              lyricist: { type: SchemaType.STRING },
              composer: { type: SchemaType.STRING },
              arranger: { type: SchemaType.STRING },
              producer: { type: SchemaType.STRING }
            }
          },
          lyricLines: {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.STRING },
            description: "Actual sung lyric lines only."
          }
        },
        required: ["metadata", "lyricLines"]
      }
    }
  })

  const prompt = `You are an expert music lyrics parser. Separate metadata from lyrics.\nRaw Lyrics:\n${rawLines.join('\n')}`
  const result = await model.generateContent(prompt)
  const responseText = result.response.text()
  const data = JSON.parse(responseText)
  return { meta: data.metadata || {}, lyrics: data.lyricLines || [] }
}

// ── 3-Tier Fallback ──
async function processLyricsWithFallback(rawLines, primaryKey, fallbackKey) {
  try {
    console.log('[Lyrics] Tier 1: Trying gemini-2.5-flash...')
    const result = await callGemini(rawLines, primaryKey, 'gemini-2.5-flash')
    console.log('[Lyrics] Tier 1 succeeded.')
    return { tier: 1, ...result }
  } catch (err) {
    console.warn('[Lyrics] Tier 1 failed:', err.message || err)
  }

  if (fallbackKey) {
    try {
      console.log('[Lyrics] Tier 2: Trying gemini-2.5-flash-lite with fallback key...')
      const result = await callGemini(rawLines, fallbackKey, 'gemini-2.5-flash-lite')
      console.log('[Lyrics] Tier 2 succeeded.')
      return { tier: 2, ...result }
    } catch (err) {
      console.warn('[Lyrics] Tier 2 failed:', err.message || err)
    }
  } else {
    console.warn('[Lyrics] Tier 2 skipped: No fallback key.')
  }

  console.log('[Lyrics] Tier 3: Falling back to code-based extractor...')
  return { tier: 3, ...extractLyricsWithCode(rawLines) }
}

// ══════════════════════════════════════════════════
//  TEST RUNNER
// ══════════════════════════════════════════════════
const REAL_FALLBACK_KEY = process.env.GEMINI_API_FALLBACK || ''
const BAD_KEY = 'AIzaSyINVALID_KEY_THAT_WILL_DEFINITELY_FAIL_123'

function printResult(label, result) {
  console.log(`\n${'═'.repeat(60)}`)
  console.log(`  ${label}`)
  console.log(`${'═'.repeat(60)}`)
  console.log(`  ✅ Resolved at: TIER ${result.tier}`)
  console.log(`  Metadata:`, JSON.stringify(result.meta, null, 2))
  console.log(`  Lyric lines (${result.lyrics.length}):`)
  result.lyrics.forEach((l, i) => console.log(`    ${i + 1}. ${l}`))
  console.log('')
}

async function runTests() {
  console.log('\n🧪 GEMINI FALLBACK CASCADE TEST SUITE\n')
  console.log(`Primary key: BAD (intentionally broken)`)
  console.log(`Fallback key: ${REAL_FALLBACK_KEY ? 'SET ✅' : 'NOT SET ❌'}`)
  console.log(`Sample lyrics: ${SAMPLE_LYRICS.length} lines\n`)

  // ── TEST 1: Tier 1 fails → Tier 2 should catch ──
  console.log('━'.repeat(60))
  console.log('TEST 1: Bad primary key → should fallback to Tier 2 (flash-lite)')
  console.log('━'.repeat(60))
  try {
    const result1 = await processLyricsWithFallback(SAMPLE_LYRICS, BAD_KEY, REAL_FALLBACK_KEY)
    printResult('TEST 1 RESULT', result1)
    if (result1.tier === 2) {
      console.log('  ✅ TEST 1 PASSED — Tier 2 fallback worked correctly!\n')
    } else if (result1.tier === 3) {
      console.log('  ⚠️  TEST 1 — Both API tiers failed, landed on Tier 3. Fallback key may be invalid.\n')
    } else {
      console.log('  ❌ TEST 1 UNEXPECTED — Resolved at Tier', result1.tier, '\n')
    }
  } catch (e) {
    console.error('  ❌ TEST 1 CRASHED:', e.message)
  }

  // ── TEST 2: Both tiers fail → Tier 3 code extractor ──
  console.log('━'.repeat(60))
  console.log('TEST 2: Both keys bad → should fallback to Tier 3 (code extractor)')
  console.log('━'.repeat(60))
  try {
    const result2 = await processLyricsWithFallback(SAMPLE_LYRICS, BAD_KEY, BAD_KEY)
    printResult('TEST 2 RESULT', result2)
    if (result2.tier === 3) {
      console.log('  ✅ TEST 2 PASSED — Code extractor worked correctly!')
      // Validate the code extractor output
      const metaMatch = result2.meta.lyricist === '林夕' &&
                         result2.meta.composer === '陈奕迅' &&
                         result2.meta.arranger === '陈辉阳' &&
                         result2.meta.producer === '陈辉阳'
      console.log(`  Metadata extraction: ${metaMatch ? '✅ CORRECT' : '❌ MISMATCH'}`)
      
      const shouldContain = ['爱你不是两三天', '想你每个夜晚', 'I love you more than words can say']
      const shouldNotContain = ['© 2003', 'All Rights Reserved', '录音', '混音', 'OP:']
      
      const containsAll = shouldContain.every(s => result2.lyrics.some(l => l.includes(s)))
      const excludesAll = shouldNotContain.every(s => !result2.lyrics.some(l => l.includes(s)))
      
      console.log(`  Lyrics kept correctly: ${containsAll ? '✅' : '❌'}`)
      console.log(`  Junk filtered correctly: ${excludesAll ? '✅' : '❌'}\n`)
    } else {
      console.log('  ❌ TEST 2 UNEXPECTED — Should have been Tier 3, got Tier', result2.tier, '\n')
    }
  } catch (e) {
    console.error('  ❌ TEST 2 CRASHED:', e.message)
  }

  console.log('🏁 All tests complete.\n')
}

runTests()
